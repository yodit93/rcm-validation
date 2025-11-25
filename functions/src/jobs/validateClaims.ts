import * as functions from "firebase-functions";
import { db } from "../index";
import { Claim, Rule } from "../../utils/types";
import { validateClaim } from "../../utils/validateClaimHelper";
import cors from "cors";
import { runStaticAnalytics } from "../jobs/staticAnalytics";
import { runLLMAnalytics } from "../jobs/llmAnalytics";

// Allow requests from anywhere (you can restrict later)
const corsHandler = cors({ origin: true });

export const validateClaims = functions.https.onRequest(
  async (req, res) => {
    corsHandler(req, res, async () => {
      try {
        if (req.method !== "POST") {
          res.status(405).send({ error: "Method Not Allowed" });
          return;
        }

        console.log("🔥 Starting claims validation job...");

      const rulesSnapshot = await db
      .collection("rules_versions")
      .where("tenantId", "==", req.body.tenantId)
      .get();

        // Flatten all rule arrays from all versions
        const rules: Rule[] = rulesSnapshot.docs.flatMap((doc) => {
          const data = doc.data();
          return data.rules || [];
        });

        console.log("Loaded rules count:", rules.length);
        console.log("Example rule:", rules[0]);


        if (!rules.length) {
          res.status(400).json({ error: "No rules found" });
          return;
        }

        const masterSnapshot = await db.collection("master_table").get();
        const claims: Claim[] = masterSnapshot.docs.map((doc) => doc.data() as Claim);

        if (!claims.length) {
          res.status(400).json({ error: "No claims found" });
          return;
        }
        console.log("validating claims")
        const refinedPromises = claims.map(async (claim) => {
          console.log("validating claim called and started:");
          const refined = validateClaim(claim, rules);
          
          await db.collection("refined_table").doc(claim.claim_id).set(refined, { merge: true });
          return refined;
        });

        const refinedClaims = await Promise.all(refinedPromises);

        console.log(`✅ Validation complete: ${refinedClaims.length} claims`);

        // Run analytics jobs

        // Generate a batchId for this run
        const batchId = `batch_${Date.now()}`;

        console.log("Running static analytics...");
        const staticMetrics = await runStaticAnalytics(refinedClaims, req.body.tenantId, batchId);

        console.log("Running LLM analytics...");
        const llmMetrics = await runLLMAnalytics(refinedClaims, req.body.tenantId, batchId);

        res.status(200).json({
          success: true,
          batchId,
          validatedCount: refinedClaims.length,
          staticMetrics,
          llmMetrics,
          sampleRefined: refinedClaims.slice(0, 5),
        });
      } catch (err) {
        console.error("❌ Error validating claims:", err);
        res.status(500).json({ success: false, error: err });
      }
    });
  }
);
