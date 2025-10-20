// Data parsing utilities for training/eval dataset uploads

export interface TrainingDataRow {
  text: string;
  true_category: string;
  true_risk: string;
}

export interface ParseResult {
  success: boolean;
  data: TrainingDataRow[];
  errors: string[];
}

const VALID_CATEGORIES = [
  'suicide',
  'nssi',
  'child_abuse',
  'domestic_violence',
  'sexual_violence',
  'elder_abuse',
  'homicide',
  'psychosis',
  'manic_episode',
  'eating_disorder',
  'substance_abuse',
  'other_emergency',
];

const VALID_RISKS = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

/**
 * Validates a single data row
 */
function validateRow(
  row: TrainingDataRow,
  index: number
): { valid: boolean; error?: string } {
  if (!row.text || row.text.trim().length === 0) {
    return { valid: false, error: `Row ${index + 1}: Missing or empty text` };
  }

  if (!row.true_category || row.true_category.trim().length === 0) {
    return {
      valid: false,
      error: `Row ${index + 1}: Missing true_category`,
    };
  }

  if (!VALID_CATEGORIES.includes(row.true_category.toLowerCase())) {
    return {
      valid: false,
      error: `Row ${index + 1}: Invalid category "${row.true_category}". Must be one of: ${VALID_CATEGORIES.join(', ')}`,
    };
  }

  if (!row.true_risk || row.true_risk.trim().length === 0) {
    return { valid: false, error: `Row ${index + 1}: Missing true_risk` };
  }

  if (!VALID_RISKS.includes(row.true_risk.toUpperCase())) {
    return {
      valid: false,
      error: `Row ${index + 1}: Invalid risk "${row.true_risk}". Must be one of: ${VALID_RISKS.join(', ')}`,
    };
  }

  return { valid: true };
}

/**
 * Parse CSV string into training data rows
 * Expected format: text,true_category,true_risk
 */
export function parseCSV(csvContent: string): ParseResult {
  const errors: string[] = [];
  const data: TrainingDataRow[] = [];

  try {
    const lines = csvContent.split('\n').filter((line) => line.trim().length > 0);

    if (lines.length === 0) {
      return { success: false, data: [], errors: ['CSV file is empty'] };
    }

    // Check for header row
    const firstLine = lines[0].toLowerCase();
    const hasHeader =
      firstLine.includes('text') &&
      firstLine.includes('true_category') &&
      firstLine.includes('true_risk');

    const startIndex = hasHeader ? 1 : 0;

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Simple CSV parsing (handles quotes)
      const matches = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);

      if (!matches || matches.length < 3) {
        errors.push(
          `Row ${i + 1}: Invalid format. Expected 3 columns: text,true_category,true_risk`
        );
        continue;
      }

      const text = matches[0].replace(/^"|"$/g, '').trim();
      const true_category = matches[1].replace(/^"|"$/g, '').trim();
      const true_risk = matches[2].replace(/^"|"$/g, '').trim();

      const row: TrainingDataRow = {
        text,
        true_category: true_category.toLowerCase(),
        true_risk: true_risk.toUpperCase(),
      };

      const validation = validateRow(row, i);
      if (!validation.valid) {
        errors.push(validation.error!);
        continue;
      }

      data.push(row);
    }

    if (data.length === 0 && errors.length > 0) {
      return { success: false, data: [], errors };
    }

    return {
      success: errors.length === 0,
      data,
      errors,
    };
  } catch (error) {
    return {
      success: false,
      data: [],
      errors: [`CSV parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`],
    };
  }
}

/**
 * Parse JSON string into training data rows
 * Expected format: [{ text: string, true_category: string, true_risk: string }]
 */
export function parseJSON(jsonContent: string): ParseResult {
  const errors: string[] = [];
  const data: TrainingDataRow[] = [];

  try {
    const parsed = JSON.parse(jsonContent);

    if (!Array.isArray(parsed)) {
      return {
        success: false,
        data: [],
        errors: ['JSON must be an array of objects'],
      };
    }

    if (parsed.length === 0) {
      return {
        success: false,
        data: [],
        errors: ['JSON array is empty'],
      };
    }

    for (let i = 0; i < parsed.length; i++) {
      const item = parsed[i];

      if (typeof item !== 'object' || item === null) {
        errors.push(`Row ${i + 1}: Must be an object`);
        continue;
      }

      const row: TrainingDataRow = {
        text: item.text || '',
        true_category: (item.true_category || '').toLowerCase(),
        true_risk: (item.true_risk || '').toUpperCase(),
      };

      const validation = validateRow(row, i);
      if (!validation.valid) {
        errors.push(validation.error!);
        continue;
      }

      data.push(row);
    }

    if (data.length === 0 && errors.length > 0) {
      return { success: false, data: [], errors };
    }

    return {
      success: errors.length === 0,
      data,
      errors,
    };
  } catch (error) {
    return {
      success: false,
      data: [],
      errors: [`JSON parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`],
    };
  }
}

/**
 * Auto-detect format and parse data
 */
export function parseData(content: string, filename?: string): ParseResult {
  const trimmed = content.trim();

  // Try to detect format
  const isJSON =
    (trimmed.startsWith('[') && trimmed.endsWith(']')) ||
    (trimmed.startsWith('{') && trimmed.endsWith('}'));
  const isCSV =
    filename?.endsWith('.csv') || (!isJSON && trimmed.includes(','));

  if (isJSON) {
    return parseJSON(trimmed);
  } else if (isCSV) {
    return parseCSV(trimmed);
  }

  // Try JSON first, then CSV
  const jsonResult = parseJSON(trimmed);
  if (jsonResult.success) {
    return jsonResult;
  }

  return parseCSV(trimmed);
}
