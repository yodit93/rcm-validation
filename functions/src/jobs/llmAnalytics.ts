// jobs/llmAnalytics.ts
import * as admin from "firebase-admin";
import { GoogleGenAI } from "@google/genai";
import { Claim } from "../../utils/types";

/**
 * Run LLM-based analytics on refined claims
 * @param refinedClaims Array of refined claim objects
 * @param tenantId Tenant ID
 * @param batchId Unique batch ID for this analytics run
 */
export async function runLLMAnalytics(
  refinedClaims: Claim[],
  tenantId: string,
  batchId: string
) {
  const db = admin.firestore();
  const ai = new GoogleGenAI({ apiKey: process.env.GENAI_API_KEY });

  // Build prompt for Gemini AI
  const prompt = `
You are an expert claims auditor. Given the following claims data, generate a summary:
- Provide insights on claim counts by error type
- Highlight paid amounts distribution
- Provide actionable recommendations for corrections

Claims:
${JSON.stringify(refinedClaims, null, 2)}
`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
  });

  // Extract response text
  const summaryText = response.text || "";
  const insights = summaryText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  // Store in metrics collection (merge with static analytics)
  await db
    .collection("metrics_table")
    .doc(batchId)
    .set(
      {
        tenant_id: tenantId,
        processed_at: admin.firestore.Timestamp.now(),
        llm_analysis: {
          summary_text: summaryText,
          insights,
        },
      },
      { merge: true }
    );

  console.log("LLM analytics metrics saved for tenant:", tenantId);
  return { summary_text: summaryText, insights };
}
