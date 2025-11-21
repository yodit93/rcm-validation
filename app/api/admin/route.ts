import { NextResponse } from "next/server";
import { db } from "@/firebase";
import { collection, getDocs } from "firebase/firestore";

export async function GET() {
  try {
    // Optional: Simple Firestore connectivity check
    let firestoreOk = true;

    try {
      await getDocs(collection(db, "metrics_table"));
    } catch (e) {
      firestoreOk = false;
    }

    return NextResponse.json({
      status: "OK",
      timestamp: new Date().toISOString(),
      services: {
        api: true,
        firebaseAuth: true, // Firebase SDK loads if this route runs
        firestore: firestoreOk,
      },
    });
  } catch (err) {
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
