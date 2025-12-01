// app/upload/page.js
"use client";

import {
  useState,
  FormEvent,
  ChangeEvent,
  Dispatch,
  SetStateAction,
} from "react";
import { useRouter } from "next/navigation";
import { ai, auth, db, storage } from "@/firebase";
import { ref as storageRef, uploadBytes } from "firebase/storage";
import { doc, collection, serverTimestamp, setDoc } from "firebase/firestore";
import { getGenerativeModel, Part } from "firebase/ai";
import { VALIDATION_RULES_SCHEMA } from "./schema";
import axios from "axios";

// Define the type for the file state setter functions
type FileSetter = Dispatch<SetStateAction<File | null>>;

export default function UploadPage() {
  const [claimFile, setClaimFile] = useState<File | null>(null);
  const [technicalDoc, setTechnicalDoc] = useState<File | null>(null);
  const [medicalDoc, setMedicalDoc] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const router = useRouter();

  // Quick check for authentication
  const user = auth.currentUser;
  if (!user) {
    router.push("/");
  }

  // --- FIX: Correctly type the ChangeEvent ---
  const handleFileChange = (
    e: ChangeEvent<HTMLInputElement>,
    setter: FileSetter
  ) => {
    // Check if files exist and files[0] exists
    if (e.target.files && e.target.files.length > 0) {
      setter(e.target.files[0]);
    }
  };

  const handleClaimSubmission = async (e: FormEvent) => {
    e.preventDefault();

    if (!claimFile || !technicalDoc || !medicalDoc) {
      alert("Please select all three required documents.");
      return;
    }
    if (!user) return;

    setIsUploading(true);

    const claimBatchId = doc(collection(db, "claim_batches")).id;
    const userId = user.uid;

    console.log(
      `Preparing to upload claim with ID: ${claimBatchId} for user: ${userId}`
    );

    const filesToUpload = [
      // Since we checked if claimFile is not null above, we can safely use the non-null assertion (!)
      {
        file: claimFile!,
        path: `claims/${userId}/${claimBatchId}/claim-${claimFile!.name}`,
      },
      {
        file: technicalDoc!,
        path: `claims/${userId}/${claimBatchId}/tech-${technicalDoc!.name}`,
      },
      {
        file: medicalDoc!,
        path: `claims/${userId}/${claimBatchId}/med-${medicalDoc!.name}`,
      },
    ];

    try {
      // 1. Upload Files to Cloud Storage
      const uploadPromises = filesToUpload.map(async (item) => {
        const fileRef = storageRef(storage, item.path);
        // uploadBytes expects a File or Blob, which item.file is guaranteed to be here.
        await uploadBytes(fileRef, item.file);
        return item.path;
      });

      const filePaths = await Promise.all(uploadPromises);

      const model = getGenerativeModel(ai, 
        { model: "gemini-2.5-flash", 
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: VALIDATION_RULES_SCHEMA,
          },
        });

      async function fileToGenerativePart(file: File) {
        const base64EncodedData = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () =>
            resolve((reader.result as string).split(",")[1]);
          reader.readAsDataURL(file);
        });

        return {
          inlineData: {
            data: base64EncodedData,
            mimeType: file.type,
          },
        };
      }

      const technicalDocPart = await fileToGenerativePart(technicalDoc);
      const medicalDocPart = await fileToGenerativePart(medicalDoc);

      const prompt = `
        Analyze the provided Technical and Medical documentation files. 
        Generate a JSON array of rules for claims processing strictly following the provided JSON schema. 
        Each rule must include the following fields: type ('TECHNICAL' or 'MEDICAL'), code_type, code_identifier, rule_name, rule_description, and an array of conditions.

        For each condition, include:
        - condition_type and action_on_fail (always required)
        - target_codes for conditions that need them:
            • REQUIRES_PRIOR_APPROVAL
            • ELIGIBILITY_CHECK with condition_field of 'facility_id' or 'diagnosis_codes'
        - threshold and operator for VALUE_CHECK
        - format_regex and operator for FORMAT_CHECK
        - condition_field for ELIGIBILITY_CHECK
        - required_value for ELIGIBILITY_CHECK with condition_field 'encounter_type'

        Ensure:
        1. Every rule mentioned in the documents is captured.
        2. Prior Approval requirements based on Service Code (e.g., SRV1001) and Diagnosis Code (e.g., E11.9, Z34.0) are included.
        3. Financial threshold rules (paid_amount_aed > 250) are included.
        4. Medical constraints: Services limited by Encounter Type (INPATIENT/OUTPATIENT) are included.
        5. Medical constraints: Services limited by Facility Type (e.g., MATERNITY_HOSPITAL, GENERAL_HOSPITAL) are included.
        6. Medical constraints: Services requiring specific Diagnoses (e.g., SRV2008 requires Z34.0) are included.
        7. Medical constraints: Mutually Exclusive Diagnoses (e.g., R73.03 cannot coexist with E11.9) are included.
        8. Technical constraints: ID formatting rules (e.g., unique_id structure and casing) are included.
        9. All conditions must include the required fields according to their type as listed above.
        10. Do not omit any fields that are required by the condition type.
        `;


      const result = await model.generateContent([
        prompt,
        technicalDocPart as Part,
        medicalDocPart as Part,
      ]);

      // Log the generated text, handling the case where it might be undefined
      console.log(result.response.text() ?? "No text in response.");

      // // 2. Create the Firestore Trigger Document
      await setDoc(doc(db, "claim_batches", claimBatchId), {
        uid: userId,
        claimBatchId: claimBatchId,
        status: 'PENDING_ANALYSIS',
        submittedAt: serverTimestamp(),
        documents: {
          claimPath: filePaths[0],
          technicalPath: filePaths[1],
          medicalPath: filePaths[2],
        },
      });

      const ruleJson = JSON.parse(result.response.text());

      const ruleDocRef = doc(collection(db, "rules_versions")); // auto ID
      await setDoc(ruleDocRef, {
        tenantId: userId,       // the claim this version belongs to
        claimBatchId: claimBatchId,
        ruleVersion: ruleDocRef.id, // use auto-generated ID as version
        rules: ruleJson,
        createdAt: serverTimestamp()
      });

      alert(
        `Claim ${claimBatchId} submitted successfully! The validation process has begun.`
      );

      // Trigger validation process via API

      try {
        const { data } = await axios.post(
          "https://us-central1-mini-rcm-validation-engine.cloudfunctions.net/validateClaims", 
          { tenantId: userId }
        );
        console.log("Validation result:", data);
      } catch (err) {
        console.error("Error triggering validation:", err);
      }

      // Reset state upon successful submission
      setClaimFile(null);
      setTechnicalDoc(null);
      setMedicalDoc(null);
    } catch (error) {
      console.error("Submission failed:", error);
      alert(
        `Submission failed: Check console for details. Error: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-6">
      <div className="bg-white shadow-xl rounded-lg p-10 w-full max-w-2xl">
        <h2 className="text-3xl font-bold text-center text-green-700 mb-8">
          Upload Claims Documents
        </h2>

        <form onSubmit={handleClaimSubmission} className="space-y-6">
          {/* Claim File Upload */}
          <div className="border p-4 rounded-md">
            <label className="block text-lg font-medium text-gray-700 mb-2">
              1. Claim Data File (e.g., Excel/CSV)
            </label>
            <input
              type="file"
              onChange={(e) => handleFileChange(e, setClaimFile)}
              className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              required
            />
            {claimFile && (
              <p className="mt-2 text-sm text-gray-500">
                Selected: **{claimFile.name}**
              </p>
            )}
          </div>

          {/* Technical Rules Upload */}
          <div className="border p-4 rounded-md">
            <label className="block text-lg font-medium text-gray-700 mb-2">
              2. Technical Rules Document (Policy)
            </label>
            <input
              type="file"
              onChange={(e) => handleFileChange(e, setTechnicalDoc)}
              className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
              required
            />
            {technicalDoc && (
              <p className="mt-2 text-sm text-gray-500">
                Selected: **{technicalDoc.name}**
              </p>
            )}
          </div>

          {/* Medical Documentation Upload */}
          <div className="border p-4 rounded-md">
            <label className="block text-lg font-medium text-gray-700 mb-2">
              3. Medical Supporting Documents
            </label>
            <input
              type="file"
              onChange={(e) => handleFileChange(e, setMedicalDoc)}
              className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-yellow-50 file:text-yellow-700 hover:file:bg-yellow-100"
              required
            />
            {medicalDoc && (
              <p className="mt-2 text-sm text-gray-500">
                Selected: **{medicalDoc.name}**
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isUploading}
            className={`w-full py-3 rounded-lg font-bold text-lg transition-colors ${
              isUploading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-green-600 text-white hover:bg-green-700"
            }`}
          >
            {isUploading
              ? "Submitting Claim..."
              : "Submit Claim for Validation"}
          </button>
        </form>
      </div>

     
      <button
        onClick={() => router.push("/results")}
        className="mt-4 px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
      >
        View Results
      </button>
    </div>
  );
}
