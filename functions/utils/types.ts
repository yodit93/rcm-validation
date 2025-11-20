export interface Claim {
  claim_id: string;
  tenant_id: string;
  encounter_type: 'INPATIENT' | 'OUTPATIENT';
  service_date: string; // ISO date string
  national_id: string;
  member_id: string;
  facility_id: string;
  unique_id: string;
  diagnosis_codes: string[]; // array of diagnosis codes
  service_code: string;
  paid_amount_aed: number;
  approval_number?: string;

  // validation fields
  status?: "Validated" | "Invalid";
  error_type?: "No error" | "Medical error" | "Technical error" | "Both";
  error_explanation?: string[];
  recommended_action?: string[];
}



export type ConditionType =
  | "REQUIRES_PRIOR_APPROVAL"
  | "VALUE_CHECK"
  | "FORMAT_CHECK"
  | "ELIGIBILITY_CHECK";

export interface Condition {
  condition_type: ConditionType;
  target_codes: string[];          // Codes or IDs this condition applies to
  required_value?: string | number; // Expected value for comparison (e.g., "YES" or threshold)
  operator?: "EQUALS" | "GREATER_THAN" | "MATCHES_REGEX"; // Comparison operator
  threshold?: number;              // Numeric threshold for VALUE_CHECK
  action_on_fail?: string;         // e.g., "FLAG_FOR_APPROVAL", "DENY"
  format_regex?: string;           // Regex for FORMAT_CHECK
  condition_field?: string;        // Field name for eligibility checks: "encounter_type", "facility_id", "diagnosis_codes"
}

export interface Rule {
  type: "MEDICAL" | "TECHNICAL";
  code_type: string;               // "SERVICE_CODE", "DIAGNOSIS_CODE", "FINANCIAL_THRESHOLD", etc.
  code_identifier: string;         // Field in Claim to check
  rule_name: string;
  rule_description: string;
  conditions: Condition[];
}
