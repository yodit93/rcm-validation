import { NextRequest, NextResponse } from "next/server";
import formidable from "formidable";
import * as xlsx from "xlsx";
import { Claim, saveToMasterTable } from "@/lib/db";
import { runValidation, Rule } from "@/lib/ruleEngine";
import { IncomingMessage } from "http";

// ⛔ App Router does NOT use `export const config`
// Instead, we define a custom parser:
export const dynamic = "force-dynamic"; // ensures server execution

// We must manually disable the body parser for formidable
export async function POST(req: NextRequest) {
  return new Promise((resolve) => {
    const form = formidable({
      multiples: false,
      keepExtensions: true,
    });

    // Convert request into Node stream
    form.parse(req as unknown as IncomingMessage, async (err, fields, files) => {
      if (err) {
        return resolve(
          NextResponse.json({ success: false, error: "Form parsing failed" }, { status: 500 })
        );
      }

      try {
        // ░░░ EXTRACT TENANT ID ░░░
        const rawTenant = fields.tenant_id;
        const tenantId = Array.isArray(rawTenant)
          ? rawTenant[0] ?? "default"
          : rawTenant ?? "default";

        // Helper to safely get file paths
        const getFilepath = (f?: formidable.File | formidable.File[]) => {
          if (!f) throw new Error("Missing uploaded file");
          const file = Array.isArray(f) ? f[0] : f;
          return file.filepath;
        };

        // ░░░ PARSE CLAIMS FILE ░░░
        const claimsWorkbook = xlsx.readFile(getFilepath(files.claims));
        const claimsSheet = claimsWorkbook.Sheets[claimsWorkbook.SheetNames[0]];
        const rawClaims = xlsx.utils.sheet_to_json<Partial<Claim>>(claimsSheet);

        const claimsData: Claim[] = rawClaims.map((row) => ({
          ...(row as Record<string, unknown>),
          tenant_id: tenantId,
        })) as Claim[];

        // ░░░ PARSE TECHNICAL RULES ░░░
        const techWorkbook = xlsx.readFile(getFilepath(files.technical));
        const techSheet = techWorkbook.Sheets[techWorkbook.SheetNames[0]];
        const techRules: Rule[] = xlsx.utils.sheet_to_json<Rule>(techSheet);

        // ░░░ PARSE MEDICAL RULES ░░░
        const medWorkbook = xlsx.readFile(getFilepath(files.medical));
        const medSheet = medWorkbook.Sheets[medWorkbook.SheetNames[0]];
        const medRules: Rule[] = xlsx.utils.sheet_to_json<Rule>(medSheet);

        // ░░░ RUN VALIDATION ENGINE ░░░
        const validatedClaims = claimsData.map((claim) =>
          runValidation(claim, techRules, medRules)
        );

        // ░░░ SAVE INTO MASTER TABLE ░░░
        saveToMasterTable(validatedClaims);

        return resolve(NextResponse.json({ success: true, validatedClaims }));
      } catch (error) {
        console.error("UPLOAD ERROR:", error);
        return resolve(
          NextResponse.json({ success: false, error: "Upload failed" }, { status: 500 })
        );
      }
    });
  });
}
