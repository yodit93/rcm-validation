// import * as admin from "firebase-admin";
import { initializeApp as initClientApp } from "firebase/app";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { getAI, getGenerativeModel, GoogleAIBackend } from "firebase/ai";

// const adminApp = admin.initializeApp();

// Create a separate client app instance (use config or defaults appropriate for your env)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: "mini-rcm-validation-engine.firebaseapp.com",
  projectId: "mini-rcm-validation-engine",
  storageBucket: "mini-rcm-validation-engine.firebasestorage.app",
  messagingSenderId: "522534214712",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: "G-Q46SV5TPZ8"
};

const clientApp = initClientApp(firebaseConfig);

// Pass the client app (correct type) to getAI
const ai = getAI(clientApp, { backend: new GoogleAIBackend() });

// const bucket = admin.storage().bucket();

// async function downloadFileBuffer(path: string): Promise<Buffer> {
//   const file = bucket.file(path);
//   const [exists] = await file.exists();
//   if (!exists) throw new Error(`File not found: ${path}`);
//   const [buffer] = await file.download();
//   return buffer;
// }
interface PendingClaimDoc {
  documents: {
    claimPath: string;
    technicalPath: string;
    medicalPath: string;
  };
}

async function logRuntimeIdentity() {
  try {
    const md = "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default";
    const headers = { "Metadata-Flavor": "Google" };
    const email = await fetch(`${md}/email`, { headers }).then(r => r.text());
    const scopes = await fetch(`${md}/scopes`, { headers }).then(r => r.text()).catch(() => "no-scopes");
    console.log("[identity] serviceAccountEmail:", email);
    console.log("[identity] scopes:", scopes);
  } catch (err) {
    console.error("[identity] metadata error:", err);
  }
}
// call this at start of your handler


export const generateRulesJson = onDocumentCreated(
  "pending_claims/{claimId}",
  async (event) => {
    await logRuntimeIdentity();
    const data = event.data?.data() as PendingClaimDoc;
    if (!data || !data.documents) throw new Error("Documents missing");

    const { claimPath, technicalPath, medicalPath } = data.documents;

    if (!claimPath) throw new Error("claimPath missing");
    if (!technicalPath) throw new Error("technicalPath missing");
    if (!medicalPath) throw new Error("medicalPath missing");

    // const technicalPdfBuffer = await downloadFileBuffer(technicalPath);
    // const medicalPdfBuffer = await downloadFileBuffer(medicalPath);
    // const claimPdfBuffer = await downloadFileBuffer(claimPath);
    // return { technicalPdfBuffer, medicalPdfBuffer, claimPdfBuffer };
    
     // Initialize Gemini AI via Firebase AI Logic
    const model = getGenerativeModel(ai, {
      model: "gemini-2.0-flash",
      generationConfig: {
        responseMimeType: "application/json",
      },
    });

    const prompt = "tell me about json rules for claims processing";

    const result = await model.generateContent(prompt);
    console.log("Gemini response received:", result);
    return result.response.text();

    // const contents = [
    //   { text: "Generate a JSON of rules for claims processing. " +
    //            "Each rule must include type: 'technical' or 'medical', code/identifier, and value." },
    //   {
    //     inlineData: {
    //       mimeType: "application/pdf",
    //       data: technicalPdfBuffer.toString("base64")
    //     }
    //   },
    //   {
    //     inlineData: {
    //       mimeType: "application/pdf",
    //       data: medicalPdfBuffer.toString("base64")
    //     }
    //   }
    // ];

    // const response = await ai.app({
    //   model: "gemini-2.5-flash",
    //   contents
    // });

    // if (!response.text) throw new Error("AI did not return text");

    // const ruleJson = JSON.parse(response.text);

    // const ruleDocRef = admin.firestore().collection("rules_versions").doc();
    // await ruleDocRef.set({
    //   tenantId: event.data?.ref.id,
    //   claimId: event.data?.ref.id,
    //   ruleVersion: ruleDocRef.id,
    //   rules: ruleJson,
    //   createdAt: admin.firestore.FieldValue.serverTimestamp()
    // });

    // console.log("Rule JSON generated and saved:", JSON.stringify(ruleJson, null, 2));

    // return { ruleDocId: ruleDocRef.id };
  }
);




