import { onObjectFinalized } from "firebase-functions/v2/storage";
import { getStorage } from "firebase-admin/storage";
import * as admin from "firebase-admin";
import { parseClaimsCsvFromStorage } from "../utils/csvParser";


admin.initializeApp();
export const db = admin.firestore();

export const parseCsvOnUpload = onObjectFinalized(async (event) => {
  try {
    const filePath = event.data.name;
    if (!filePath || !filePath.endsWith(".csv")) return;

    const bucket = getStorage().bucket(event.data.bucket);
    const file = bucket.file(filePath);

    const claims = await parseClaimsCsvFromStorage(file);

    const batch = db.batch();
    claims.forEach((claim) => {
      const ref = db.collection("master_table").doc(claim.claim_id);
      batch.set(ref, claim);
    });

    await batch.commit();
    console.log(`✔ Parsed & saved ${claims.length} claims from ${filePath}`);
  } catch (err) {
    console.error("❌ Error processing CSV:", err);
  }
});

export { validateClaims } from "./jobs/validateClaims";
