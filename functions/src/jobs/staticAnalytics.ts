// jobs/staticAnalytics.ts
import * as admin from "firebase-admin";
import { db } from "../index";

/**
 * Run static analytics on a given array of refined claims
 * @param refinedClaims Array of refined claim objects
 * @param tenantId Tenant ID
 * @param batchId Unique batch ID for this analytics run
 */
export async function runStaticAnalytics(
  refinedClaims: any[],
  tenantId: string,
  batchId: string
) {
  // Define all possible error types
  const errorTypes = ["NO_ERROR", "MEDICAL_ERROR", "TECHNICAL_ERROR", "BOTH"];

  // Initialize counts and paid amounts to 0 for all types
  const claimCounts: Record<string, number> = {};
  const paidAmounts: Record<string, number> = {};
  errorTypes.forEach((type) => {
    claimCounts[type] = 0;
    paidAmounts[type] = 0;
  });

  // Process each claim
  refinedClaims.forEach((claim) => {
    const rawStatus = claim.error_type || "NO_ERROR";

    // Normalize status to match predefined keys
    const status = rawStatus.toUpperCase().replace(/\s+/g, "_");
    const paid = Number(claim.paid_amount_aed) || 0;

    // Safely accumulate values
    if (errorTypes.includes(status)) {
      claimCounts[status] += 1;
      paidAmounts[status] += paid;
    } else {
      // fallback to NO_ERROR if unknown
      claimCounts["NO_ERROR"] += 1;
      paidAmounts["NO_ERROR"] += paid;
    }
  });

  const metrics = {
    counts_by_error: claimCounts,
    paid_by_error: paidAmounts,
  };

  // Store in metrics collection (merge to keep both static + LLM)
  await db
    .collection("metrics_table")
    .doc(batchId)
    .set(
      {
        tenant_id: tenantId,
        processed_at: admin.firestore.Timestamp.now(),
        static_rules: metrics,
      }
    );

  console.log("✅ Static analytics metrics saved for tenant:", tenantId);
  return metrics;
}
