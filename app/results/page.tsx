'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import { Claim } from "../../lib/db";
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';

export default function ResultsPage() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [tenantId, setTenantId] = useState<string>('default');

  useEffect(() => {
    const fetchClaims = async () => {
      const res = await axios.get(`/api/claims?tenant_id=${tenantId}`);
      setClaims(res.data);
    };
    fetchClaims();
  }, [tenantId]);

  // Compute metrics for charts
  const errorCounts = ['No error', 'Technical error', 'Medical error', 'Both'].map(type => ({
    error_type: type,
    count: claims.filter(c => c.error_type === type).length,
    total_paid: claims.filter(c => c.error_type === type).reduce((sum, c) => sum + c.paid_amount_aed, 0)
  }));

  return (
    <div>
      <h2>Claims Results for Tenant: {tenantId}</h2>

      <table border={1}>
        <thead>
          <tr>
            <th>Claim ID</th>
            <th>Member ID</th>
            <th>Service Code</th>
            <th>Status</th>
            <th>Error Type</th>
            <th>Explanation</th>
            <th>Recommendation</th>
          </tr>
        </thead>
        <tbody>
          {claims.map(c => (
            <tr key={c.claim_id}>
              <td>{c.claim_id}</td>
              <td>{c.member_id}</td>
              <td>{c.service_code}</td>
              <td>{c.status}</td>
              <td>{c.error_type}</td>
              <td>{c.error_explanation}</td>
              <td>{c.recommended_action}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3>Error Counts by Type</h3>
      <BarChart width={600} height={300} data={errorCounts}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="error_type" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Bar dataKey="count" fill="#8884d8" />
        <Bar dataKey="total_paid" fill="#82ca9d" />
      </BarChart>
    </div>
  );
}
