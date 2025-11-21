"use client";

import { useEffect, useState } from "react";
import { db, auth } from "@/firebase";
import { collection, getDocs } from "firebase/firestore";
import { useRouter } from "next/navigation";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { User } from "firebase/auth";

type MetricsData = {
  category: string;
  count?: number;
  paidAmount?: number;
};

type Claim = {
  unique_id: string;
  claim_id: string;
  status: string;
  error_type: string;
  error_explanation: string[];
  recommended_action: string[];
  paidAmount?: number;
};

export default function ResultsPage() {
  const [metrics, setMetrics] = useState<MetricsData[]>([]);
  const [paidMetrics, setPaidMetrics] = useState<MetricsData[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) fetchData();
      else {
        setLoading(false);
        router.push("/");
      }
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (user) {
       console.log(paidMetrics, metrics);
    }
  }, [user, paidMetrics,]);

  const fetchData = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    setLoading(true);
    try {
     const metricsSnap = await getDocs(collection(db, "metrics_table"));

      // Convert Firestore docs into a typed list
      const docs = metricsSnap.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          processed_at: data.processed_at,
          static_rules: data.static_rules || {},
        };
      });

      // Sort by most recent processed_at
      docs.sort((a, b) => {
        const aTime = a.processed_at?.toMillis?.() ?? 0;
        const bTime = b.processed_at?.toMillis?.() ?? 0;
        return bTime - aTime;
      });

      // Use ONLY the latest metrics run
      const latest = docs[0];

      if (!latest || !latest.static_rules) {
        setMetrics([]);
        setPaidMetrics([]);
        return;
      }

      // Extract nested maps
      const countsMap = latest.static_rules.counts_by_error || {};
      const paidMap = latest.static_rules.paid_by_error || {};

      // Convert to chart arrays
      const metricsData: MetricsData[] = Object.entries(countsMap).map(
        ([key, value]) => ({
          category: key,
          count: value as number,
        })
      );

      const paidData: MetricsData[] = Object.entries(paidMap).map(
        ([key, value]) => ({
          category: key,
          paidAmount: value as number,
        })
      );

      // Set state
      setMetrics(metricsData);
      setPaidMetrics(paidData);
      // --- Claims ---
      const claimsSnap = await getDocs(collection(db, "refined_table"));
      const claimsData: Claim[] = [];

      claimsSnap.forEach((doc) => {
        const data = doc.data();
        claimsData.push({
          unique_id: data.unique_id,
          claim_id: data.claim_id || "N/A",
          status: data.status || "Unknown",
          error_type: data.error_type || "No error",
          error_explanation: data.error_explanation?.length
            ? data.error_explanation
            : ["No errors"],
          recommended_action: data.recommended_action?.length
            ? data.recommended_action
            : ["No actions needed"],
          paidAmount: data.paid_amount_aed || 0,
        });
      });

      setClaims(claimsData);
    } catch (err) {
      console.error("Error fetching data:", err);
      alert("Permission Denied or Fetch Error");
    } finally {
      setLoading(false);
    }
  };

  if (user === undefined || loading)
    return <div className="p-10 text-center">Loading authentication state and results...</div>;

  return (
    <div className="p-6 space-y-10">
      {/* Charts */}
      <div className="flex flex-col md:flex-row gap-6">
        <div className="flex-1 bg-white p-4 rounded shadow">
          <h2 className="font-bold mb-4 text-lg">Claim Counts by Error Category</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={metrics}>
              <XAxis dataKey="category" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="flex-1 bg-white p-4 rounded shadow">
          <h2 className="font-bold mb-4 text-lg">Paid Amount by Error Category</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={paidMetrics}>
              <XAxis dataKey="category" />
              <YAxis />
              <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
              <Bar dataKey="paidAmount" fill="#82ca9d" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Results Table */}
      <div className="bg-white rounded shadow p-4 overflow-x-auto">
        <h2 className="font-bold mb-4 text-lg">Validation Results</h2>
        <table className="min-w-full table-auto border-collapse border border-gray-200">
          <thead>
            <tr className="bg-gray-100">
              <th className="border px-4 py-2 text-left">Claim ID</th>
              <th className="border px-4 py-2 text-left">Status</th>
              <th className="border px-4 py-2 text-left">Error Type</th>
              <th className="border px-4 py-2 text-left">Explanation</th>
              <th className="border px-4 py-2 text-left">Recommendation Action</th>
            </tr>
          </thead>
          <tbody>
            {claims.map((c) => (
              <tr key={c.unique_id} className="hover:bg-gray-50">
                <td className="border px-4 py-2">{c.claim_id}</td>
                <td
                  className={`border px-4 py-2 font-bold ${
                    c.status.toLowerCase() === "validated" ? "text-green-700" : "text-red-600"
                  }`}
                >
                  {c.status}
                </td>
                <td className="border px-4 py-2">{c.error_type}</td>
                <td className="border px-4 py-2">
                  {c.error_explanation.map((e, i) => (
                    <p key={`${c.unique_id}-exp-${i}`}>{e}</p>
                  ))}
                </td>
                <td className="border px-4 py-2">
                  {c.recommended_action.map((r, i) => (
                    <p key={`${c.unique_id}-rec-${i}`}>{r}</p>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
