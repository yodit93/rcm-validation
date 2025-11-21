import { NextResponse } from "next/server";
import * as admin from "firebase-admin"; // 1. Import Admin SDK
import { Firestore } from "firebase-admin/firestore";

// --- GLOBAL ADMIN SDK INITIALIZATION ---

// Check if the Firebase Admin app is already initialized
if (!admin.apps.length) {
  // Initialize the Admin SDK if it hasn't been done yet.
  // This uses credentials automatically provided by the Firebase environment.
  admin.initializeApp();
}

// Get the Admin Firestore instance globally
const adminDb: Firestore = admin.firestore(); 

// --- API ROUTE HANDLER ---

export async function GET() {
  try {
    // Optional: Simple Firestore connectivity check using ADMIN SDK
    let firestoreOk = true;

    try {
      // 🛑 Using Admin SDK to query Firestore 🛑
      // This uses the correct method chaining for the Admin SDK's Firestore class.
      await adminDb.collection("metrics_table").get();
      
    } catch (e) {
      // Catching the error if the connectivity check fails
      console.error("Firestore Admin check failed:", e);
      firestoreOk = false;
    }

    // Return successful health check response
    return NextResponse.json({
      status: "OK",
      timestamp: new Date().toISOString(),
      services: {
        api: true,
        // Assuming 'firebaseAuth' check is implicit in the Admin SDK setup 
        // or handled elsewhere. The Admin SDK is now loaded successfully.
        firebaseAdminLoaded: true, 
        firestore: firestoreOk,
      },
    });
  } catch (err) {
    // Return error response if something failed outside of the Firestore check
    return NextResponse.json(
      {
        status: "ERROR",
        timestamp: new Date().toISOString(),
        message: (err as Error).message,
      },
      { status: 500 }
    );
  }
}