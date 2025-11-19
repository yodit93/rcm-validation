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
import { create } from "domain";
import { VALIDATION_RULES_SCHEMA } from "./schema";

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

    const claimId = doc(collection(db, "pending_claims")).id;
    const userId = user.uid;

    console.log(
      `Preparing to upload claim with ID: ${claimId} for user: ${userId}`
    );

    const filesToUpload = [
      // Since we checked if claimFile is not null above, we can safely use the non-null assertion (!)
      {
        file: claimFile!,
        path: `claims/${userId}/${claimId}/claim-${claimFile!.name}`,
      },
      {
        file: technicalDoc!,
        path: `claims/${userId}/${claimId}/tech-${technicalDoc!.name}`,
      },
      {
        file: medicalDoc!,
        path: `claims/${userId}/${claimId}/med-${medicalDoc!.name}`,
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
        Generate a JSON array of rules for claims processing strictly following the provided JSON schema. Each rule must include type: 'technical' or 'medical', code/identifier, and value.
        Ensure every rule mentioned in the documents is captured, including:
        1. Prior Approval requirements based on Service Code (e.g., SRV1001) and Diagnosis Code (e.g., E11.9, Z34.0).
        2. Financial threshold rules (paid_amount_aed > 250).
        3. Medical constraints: Services limited by Encounter Type (INPATIENT/OUTPATIENT).
        4. Medical constraints: Services limited by Facility Type (e.g., MATERNITY_HOSPITAL, GENERAL_HOSPITAL). For services allowed in multiple facilities, use FACILITY_TYPE_IN.
        5. Medical constraints: Services requiring specific Diagnoses (e.g., SRV2008 requires Z34.0).
        6. Medical constraints: Mutually Exclusive Diagnoses (e.g., R73.03 cannot coexist with E11.9).
        7. Technical constraints: ID formatting (unique_id structure and casing).
        `;

      const result = await model.generateContent([
        prompt,
        technicalDocPart as Part,
        medicalDocPart as Part,
      ]);

      // Log the generated text, handling the case where it might be undefined
      console.log(result.response.text() ?? "No text in response.");

      // // 2. Create the Firestore Trigger Document
      await setDoc(doc(db, "pending_claims", claimId), {
        uid: userId,
        claimId: claimId,
        status: 'PENDING_ANALYSIS',
        submittedAt: serverTimestamp(),
        documents: {
          claimPath: filePaths[0],
          technicalPath: filePaths[1],
          medicalPath: filePaths[2],
        },
      });

      const ruleJson = JSON.parse(result.response.text());

      const ruleDocRef = doc(collection(db, "rules_versions", claimId)); // collection() returns a collection ref
      await setDoc(ruleDocRef, {
        tenantId: claimId,
        claimId: claimId,
        ruleVersion: ruleDocRef.id,
        rules: ruleJson,
        createdAt: serverTimestamp()
      });

      alert(
        `Claim ${claimId} submitted successfully! The validation process has begun.`
      );

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
    </div>
  );
}
