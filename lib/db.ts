import sqlite3 from 'sqlite3';

export interface Claim {
  tenant_id: string;
  claim_id: string;
  member_id: string;
  service_code: string;
  diagnosis_codes: string;
  paid_amount_aed: number;
  approval_number: string;
  status?: string;
  error_type?: string;
  error_explanation?: string;
  recommended_action?: string;
}

const db = new sqlite3.Database('./master.db');

export function initDb(): void {
  db.run(`CREATE TABLE IF NOT EXISTS claims (
    tenant_id TEXT,
    claim_id TEXT,
    member_id TEXT,
    service_code TEXT,
    diagnosis_codes TEXT,
    paid_amount_aed REAL,
    approval_number TEXT,
    status TEXT,
    error_type TEXT,
    error_explanation TEXT,
    recommended_action TEXT
  )`);
}

// Save claims
export function saveToMasterTable(claims: Claim[]): void {
  const stmt = db.prepare(`INSERT INTO claims VALUES (?,?,?,?,?,?,?,?,?,?,?)`);
  claims.forEach(c =>
    stmt.run(
      c.tenant_id,
      c.claim_id,
      c.member_id,
      c.service_code,
      c.diagnosis_codes,
      c.paid_amount_aed,
      c.approval_number,
      c.status || '',
      c.error_type || '',
      c.error_explanation || '',
      c.recommended_action || ''
    )
  );
  stmt.finalize();
}

// Get all claims for a tenant
export function getClaimsByTenant(tenantId: string): Promise<Claim[]> {
  return new Promise((resolve, reject) => {
    db.all(`SELECT * FROM claims WHERE tenant_id = ?`, [tenantId], (err, rows: Claim[]) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

export default db;
