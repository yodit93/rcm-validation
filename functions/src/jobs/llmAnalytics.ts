import * as admin from "firebase-admin";
import { GoogleGenAI } from "@google/genai";
import { Claim } from "../../utils/types";

// IMPORTANT: This configuration uses the Vertex AI endpoint (Google Cloud's API)
// and relies on Application Default Credentials (ADC) for authentication.
// This is the secure, recommended method for production on GCP.

// *** CRITICAL REQUIREMENT ***
// The Service Account running this code (e.g., your Cloud Function SA) 
// MUST have the 'Vertex AI User' IAM role for this to work.

// NOTE: Ensure your deployment environment has these variables set:
// - GOOGLE_CLOUD_PROJECT
// - GOOGLE_CLOUD_LOCATION
const ai = new GoogleGenAI({
  vertexai: true,
  project: process.env.GOOGLE_CLOUD_PROJECT, 
  location: process.env.GOOGLE_CLOUD_LOCATION,
  // Removed explicit API key reliance: ADC handles authentication securely.
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

  // Using the high-speed Gemini 2.5 Flash model available on Vertex AI
  const MODEL_NAME = "gemini-2.5-flash"; 

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
    console.log(`Starting LLM content generation using Vertex AI model: ${MODEL_NAME}`);
    
    // Call the generateContent method on the Vertex AI client
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
    });

    // Extract response text
    const summaryText = response.text || "";
    // Basic formatting for insights (splitting by newline)
    const insights = summaryText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    // Store analysis results in Firestore
    await db
      .collection("metrics_table")
      .doc(batchId)
      .set(
        {
          tenant_id: tenantId,
          processed_at: admin.firestore.Timestamp.now(),
          llm_analysis: {
            model_used: MODEL_NAME,
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