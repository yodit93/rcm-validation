import type { NextApiRequest, NextApiResponse } from 'next';
import { Claim, getClaimsByTenant } from '../../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse<Claim[]>) {
  const tenantId = req.query.tenant_id as string || 'default';
  const claims = await getClaimsByTenant(tenantId);
  res.status(200).json(claims);
}
