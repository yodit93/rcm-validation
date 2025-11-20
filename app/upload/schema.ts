import { Schema, TypedSchema } from "firebase/ai";

// --- 1. RuleCondition Schema ---
const RuleConditionSchema: TypedSchema = Schema.object({
  description: "A single condition/check for a validation rule.",
  properties: {
    condition_type: Schema.string({
      description: "Type of condition being performed.",
      enum: [
        "REQUIRES_PRIOR_APPROVAL",
        "VALUE_CHECK",
        "FORMAT_CHECK",
        "ELIGIBILITY_CHECK"
      ]
    }),
    action_on_fail: Schema.string({
      description: "Consequence if condition fails.",
      enum: ["DENY", "FLAG_FOR_APPROVAL"]
    }),
    target_codes: Schema.array({
      description: "List of codes to match (diagnoses, service codes, or facilities).",
      items: Schema.string()
    }),
    required_value: Schema.string({
      description: "Required single value for the field, e.g., 'INPATIENT' or 'OUTPATIENT'."
    }),
    operator: Schema.string({
      description: "Operator for comparisons.",
      enum: ["GREATER_THAN", "EQUALS", "LESS_THAN", "MATCHES_REGEX"]
    }),
    threshold: Schema.number({
      description: "Numeric threshold for VALUE_CHECK."
    }),
    format_regex: Schema.string({
      description: "Regex pattern for FORMAT_CHECK."
    }),
    condition_field: Schema.string({
      description: "Claim field to validate (used in ELIGIBILITY_CHECK).",
      enum: ["encounter_type", "facility_id", "diagnosis_codes"]
    })
  },
  required: ["condition_type", "action_on_fail"],
  
});

// --- 2. ValidationRule Schema ---
const ValidationRuleSchema: TypedSchema = Schema.object({
  description: "A complete validation rule extracted from a policy document.",
  properties: {
    type: Schema.string({
      description: "Category of rule.",
      enum: ["TECHNICAL", "MEDICAL"]
    }),
    code_type: Schema.string({
      description: "Focus area of the rule.",
      enum: ["SERVICE_CODE", "DIAGNOSIS_CODE", "FINANCIAL_THRESHOLD", "ENCOUNTER_TYPE_RULE", "ID_FORMATTING"]
    }),
    code_identifier: Schema.string({
      description: "Field or code identifier this rule applies to."
    }),
    rule_name: Schema.string({
      description: "Name of the rule."
    }),
    rule_description: Schema.string({
      description: "Description of the rule."
    }),
    conditions: Schema.array({
      description: "Array of conditions for this rule.",
      items: RuleConditionSchema
    })
  },
  required: ["type", "code_type", "code_identifier", "rule_name", "conditions"]
});

// --- 3. Root Schema ---
export const VALIDATION_RULES_SCHEMA: TypedSchema = Schema.array({
  description: "Array of all validation rules.",
  items: ValidationRuleSchema
});
