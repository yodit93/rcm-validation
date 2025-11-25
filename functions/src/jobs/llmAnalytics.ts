import { VertexAI } from "@google-cloud/vertexai";
import * as admin from "firebase-admin";
import { Claim } from "../../utils/types";

const vertex = new VertexAI({
  project: "mini-rcm-validation-engine",
  location: "us-central1",
});

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

  const modelName = "gemini-2.0-flash";

  const model = vertex.getGenerativeModel({
    model: modelName,
  });

  // Build prompt for Gemini AI
  const prompt = `
  You are an expert claims auditor. Given the following claims data, generate a concise summary 
  and actionable insights.
  - Provide insights on claim counts by error type
  - Highlight paid amounts distribution
  - Provide actionable recommendations for corrections

  Claims:
  ${JSON.stringify(refinedClaims, null, 2)}
  `;

try {
  console.log(`Starting LLM content generation using Vertex AI model: ${modelName}...`);
   const result = await model.generateContent({
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }],
      },
    ],
  });

  // FIXED: correct response structure
  const summaryText =
    result.response?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

  const insights = summaryText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  console.log("LLM:", summaryText);
  // Store analysis results in Firestore
    await db
      .collection("metrics_table")
      .doc(batchId)
      .set(
        {
          llm_analysis: {
            model_used: modelName,
            summary_text: summaryText,
            insights,
          },
        },
        { merge: true }
      );

    console.log("LLM analytics metrics saved successfully to Firestore for tenant:", tenantId);
    return { summary_text: summaryText, insights };
  } catch (error: any) {
    console.error("Critical Error running LLM analytics via Vertex AI:", error);
    // Propagate the error for upstream error handling/retry mechanisms
    throw new Error(`Failed to generate content using Vertex AI: ${error.message}`);
  }
}
