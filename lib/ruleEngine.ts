import { Claim } from './db';

export interface Rule {
  RuleName: string;
  Field: string;
  Condition: string;
  Threshold?: number | string;
  AllowedValues?: string[];
}

export function runValidation(claim: Claim, techRules: Rule[], medRules: Rule[]): Claim {
  let error_type = 'No error';
  const explanation: string[] = [];
  let recommendation = '';

  // Apply technical rules
  techRules.forEach(rule => {
    if (rule.Condition === 'greater_than' && claim[rule.Field as keyof Claim] as number > Number(rule.Threshold)) {
      error_type = 'Technical error';
      explanation.push(`${rule.Field} exceeds ${rule.Threshold}`);
      recommendation = `Verify ${rule.Field}`;
    }
    if (rule.Condition === 'not_empty' && !claim[rule.Field as keyof Claim]) {
      error_type = 'Technical error';
      explanation.push(`${rule.Field} is required`);
      recommendation = `Add ${rule.Field}`;
    }
  });

  // Apply medical rules
  medRules.forEach(rule => {
    if (rule.Condition === 'not_empty' && !claim[rule.Field as keyof Claim]) {
      error_type = error_type === 'Technical error' ? 'Both' : 'Medical error';
      explanation.push(`${rule.Field} is missing`);
      recommendation += ` Add ${rule.Field}`;
    }
  });

  claim.status = error_type === 'No error' ? 'Validated' : 'Not validated';
  claim.error_type = error_type;
  claim.error_explanation = explanation.join(' ');
  claim.recommended_action = recommendation;

  return claim;
}
