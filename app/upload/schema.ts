import { Schema, TypedSchema } from "firebase/ai";


// --- 1. Define the Schema for a single RuleCondition ---
const RuleConditionSchema: TypedSchema = Schema.object({
  description: "A single condition or check that must be satisfied for the parent rule to pass.",
  properties: {
    condition_type: Schema.string({
      description: "The type of check being performed.",
      enum: ['PRIOR_APPROVAL', 'REQUIRED_FACILITY_TYPE', 'ENCOUNTER_TYPE', 'REQUIRED_DIAGNOSIS', 'MUTUALLY_EXCLUSIVE', 'VALUE_CHECK', 'FORMAT_CHECK']
    }),
    target_codes: Schema.array({
      description: "List of required facility types, diagnoses, or mutually exclusive codes.",
      items: Schema.string(),
    }),
    required_value: Schema.string({
      description: "Required single value, e.g., 'INPATIENT' or 'OUTPATIENT'.",
    }),
    operator: Schema.string({
      description: "Comparison operator for value checks, e.g., 'GREATER_THAN', 'EQUALS', 'LESS_THAN'.",
      enum: ['GREATER_THAN', 'EQUALS', 'LESS_THAN']
    }),
    threshold: Schema.number({
      description: "The numerical threshold for value checks (e.g., 250).",
    }),
    action_on_fail: Schema.string({
      description: "The consequence if the condition is not met: 'DENY' or 'FLAG_FOR_APPROVAL'.",
      enum: ['DENY', 'FLAG_FOR_APPROVAL']
    }),
    format_regex: Schema.string({
      description: "A regular expression pattern for ID formatting rules.",
    })
  },
  // Minimal required fields for a condition
  required: ["condition_type", "action_on_fail"],
});

// --- 2. Define the Schema for a single ValidationRule ---
const ValidationRuleSchema: TypedSchema = Schema.object({
  description: "A complete, structured validation rule extracted from a policy document.",
  properties: {
    type: Schema.string({
      description: "The high-level category: 'TECHNICAL' or 'MEDICAL'.",
      enum: ['TECHNICAL', 'MEDICAL']
    }),
    code_type: Schema.string({
      description: "The focus area: 'SERVICE_CODE', 'DIAGNOSIS_CODE', 'FINANCIAL_THRESHOLD', 'ENCOUNTER_TYPE_RULE', or 'ID_FORMATTING'.",
      enum: ['SERVICE_CODE', 'DIAGNOSIS_CODE', 'FINANCIAL_THRESHOLD', 'ENCOUNTER_TYPE_RULE', 'ID_FORMATTING']
    }),
    code_identifier: Schema.string({
      description: "The specific code, field, or ID name this rule applies to (e.g., 'SRV1001', 'E11.9', 'paid_amount_aed', 'unique_id')."
    }),
    rule_name: Schema.string({
      description: "A concise name for the rule (e.g., 'Major Surgery Approval')."
    }),
    rule_description: Schema.string({
      description: "The full text or summary of the rule condition."
    }),
    // The nested array of RuleConditions
    conditions: Schema.array({
      description: "One or more condition checks that must all pass for the rule to be met.",
      items: RuleConditionSchema
    })
  },
  // These fields are mandatory for every rule object
  required: ["type", "code_type", "code_identifier", "rule_name", "conditions"]
});

// --- 3. Define the Root Schema (Array of ValidationRule) ---
export const VALIDATION_RULES_SCHEMA: TypedSchema = Schema.array({
  description: "An array of all unique claim validation rules extracted from the documents.",
  items: ValidationRuleSchema
});