// Constants for categories and risk levels used across the application

export const VALID_CATEGORIES = [
  'suicide',
  'nssi',
  'child_abuse',
  'domestic_violence',
  'domestic_abuse', // Alias for domestic_violence
  'sexual_violence',
  'elder_abuse',
  'homicide',
  'psychosis',
  'manic_episode',
  'eating_disorder',
  'substance_abuse',
  'other_emergency',
  'none', // For non-crisis scenarios
] as const;

export const VALID_RISKS = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'NONE'] as const;

// Type exports for TypeScript usage
export type Category = typeof VALID_CATEGORIES[number];
export type RiskLevel = typeof VALID_RISKS[number];

// Helper to check if a string is a valid category
export function isValidCategory(value: string): value is Category {
  return VALID_CATEGORIES.includes(value as Category);
}

// Helper to check if a string is a valid risk level
export function isValidRisk(value: string): value is RiskLevel {
  return VALID_RISKS.includes(value as RiskLevel);
}

// Formatted category list for display
export const CATEGORIES_DISPLAY = VALID_CATEGORIES.filter(c => c !== 'domestic_abuse').join(', ');

// Formatted risk list for display
export const RISKS_DISPLAY = VALID_RISKS.join(', ');
