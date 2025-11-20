import { Claim, Rule } from "../utils/types";

export const validateClaim = (claim: Claim, rules: Rule[]): Claim => {
  const errorExplanation: string[] = [];
  const recommendedAction: string[] = [];
  let hasMedicalError = false;
  let hasTechnicalError = false;
console.log("validateClaim function started", rules); 

  for (const rule of rules) {

    console.log("Processing rule:", rule);
    console.log("Rule name:", rule.rule_name);
    // ensure conditions is always an array
    const conditions = Array.isArray(rule.conditions) ? rule.conditions : [];

    console.log("Conditions:", conditions);

    for (const condition of conditions) {
      console.log("Processing condition:", condition.condition_type || "UNKNOWN");
      const type = condition.condition_type || "UNKNOWN";

      switch (type) {
        case "REQUIRES_PRIOR_APPROVAL": {
          const missingApproval = !claim.approval_number || claim.approval_number === "NA";

          if (rule.code_type === "SERVICE_CODE" && condition.target_codes?.includes(claim.service_code)) {
            if (missingApproval) {
              errorExplanation.push(`Rule: ${rule.rule_name || "Unnamed"} - ${rule.rule_description || ""}`);
              recommendedAction.push("Obtain prior approval");
              rule.type === "MEDICAL" ? (hasMedicalError = true) : (hasTechnicalError = true);
            }
          }

          if (rule.code_type === "DIAGNOSIS_CODE") {
            const matches = claim.diagnosis_codes.filter(code => condition.target_codes?.includes(code));
            if (matches.length && missingApproval) {
              errorExplanation.push(`Rule: ${rule.rule_name || "Unnamed"} - ${rule.rule_description || ""}`);
              recommendedAction.push("Obtain prior approval");
              rule.type === "MEDICAL" ? (hasMedicalError = true) : (hasTechnicalError = true);
            }
          }
          break;
        }

        case "VALUE_CHECK": {
          const value = (claim as any)[rule.code_identifier];
          const claimValue = Number(value);
          const threshold = Number(condition.threshold);

          if (isNaN(claimValue)) {
            errorExplanation.push(`Invalid value for ${rule.code_identifier || "field"} — expected number`);
            recommendedAction.push("Correct numeric value");
            hasTechnicalError = true;
            break;
          }

          if (condition.operator === "GREATER_THAN" && claimValue > threshold) {
            errorExplanation.push(`Rule: ${rule.rule_name || "Unnamed"} - ${rule.rule_description || ""}`);
            recommendedAction.push("Obtain prior approval");
            hasTechnicalError = true;
          }
          console.log("value check is running");
          break;
        }

        case "FORMAT_CHECK": {
          const value = String((claim as any)[rule.code_identifier] || "");
          if (condition.operator === "MATCHES_REGEX" && condition.format_regex) {
            const regex = new RegExp(condition.format_regex);
            if (!regex.test(value)) {
              errorExplanation.push(`Rule: ${rule.rule_name || "Unnamed"} - ${rule.rule_description || ""}`);
              recommendedAction.push("Correct the format");
              hasTechnicalError = true;
            }
          }
          console.log("FORMAT_CHECK:", value, condition.format_regex)
          break;
        }

        case "ELIGIBILITY_CHECK": {
          if (condition.condition_field === "encounter_type" && claim.encounter_type !== condition.required_value) {
            errorExplanation.push(`Rule: ${rule.rule_name || "Unnamed"} - Encounter type must be ${condition.required_value || "N/A"}`);
            recommendedAction.push("Correct encounter type");
            hasMedicalError = true;
          }

          if (condition.condition_field === "facility_id" && !condition.target_codes?.includes(claim.facility_id)) {
            errorExplanation.push(`Rule: ${rule.rule_name || "Unnamed"} - Facility ID not eligible`);
            recommendedAction.push("Use eligible facility");
            hasMedicalError = true;
          }

          if (condition.condition_field === "diagnosis_codes") {
            const matches = claim.diagnosis_codes.filter(d => condition.target_codes?.includes(d));
            if (matches.length > 1) {
              errorExplanation.push(`Rule: ${rule.rule_name || "Unnamed"} - Mutually exclusive diagnoses: ${matches.join(", ")}`);
              recommendedAction.push("Remove conflicting diagnosis codes");
              hasMedicalError = true;
            }
          }
          break;
        }

        default:
          // unknown condition types are skipped gracefully
          console.warn("❗ Unknown condition type:", type);
      }
    }
  }

  let errorType: "No error" | "Medical error" | "Technical error" | "Both" = "No error";
  if (hasMedicalError && hasTechnicalError) errorType = "Both";
  else if (hasMedicalError) errorType = "Medical error";
  else if (hasTechnicalError) errorType = "Technical error";

  return {
    ...claim,
    status: errorType === "No error" ? "Validated" : "Invalid",
    error_type: errorType,
    error_explanation: errorExplanation,
    recommended_action: recommendedAction,
  };
};
