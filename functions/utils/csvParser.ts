// utils/csvParser.ts
import { Claim } from "./types";
import { parse } from "papaparse";
import { v4 as uuidv4 } from "uuid";

/**
 * Parse CSV file from Firebase Storage File reference
 * @param file Firebase Storage File object
 * @returns Promise<Claim[]>
 */
export async function parseClaimsCsvFromStorage(
  file: any
): Promise<Claim[]> {
  // download buffer
  const [buffer] = await file.download();
  const csvText = buffer.toString("utf-8");

  // parse CSV into JSON
  const parsed = parse(csvText, {
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true,
  });

  if (parsed.errors.length > 0) {
    console.error("CSV parsing errors:", parsed.errors);
    throw new Error("Failed to parse CSV file.");
  }

  const filePath: string = file.name;
  const tenantId = extractTenantId(filePath);

  // sanitize + normalize
  const claims: Claim[] = parsed.data.map((raw: any) => {
    let diagnosisCodes: string[] = [];

    if (Array.isArray(raw.diagnosis_codes)) {
      diagnosisCodes = raw.diagnosis_codes;
    } else if (typeof raw.diagnosis_codes === "string") {
      diagnosisCodes = raw.diagnosis_codes
        .split(",")
        .map((x: string) => x.trim());
    }

    return {
      claim_id: uuidv4(),
      ...raw,
      tenant_id: tenantId,
      diagnosis_codes: diagnosisCodes,
      paid_amount_aed: Number(raw.paid_amount_aed ?? 0),
      status: "Not validated",
      error_type: "",
      error_explanation: "",
      recommended_action: "",
    } as Claim;
  });

  return claims;
}

/**
 * Extract tenant ID from path:
 * Example: uploads/tenant123/myfile.csv → tenant123
 */
function extractTenantId(filePath: string): string {
  const parts = filePath.split("/");
  if (parts.length >= 2) return parts[parts.length - 2];
  return "unknown";
}
