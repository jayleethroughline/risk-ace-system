// Data parsing utilities for training/eval dataset uploads

import { VALID_CATEGORIES, VALID_RISKS, isValidCategory, isValidRisk } from './constants';

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

  if (!isValidCategory(row.true_category.toLowerCase())) {
    return {
      valid: false,
      error: `Row ${index + 1}: Invalid category "${row.true_category}". Must be one of: ${VALID_CATEGORIES.join(', ')}`,
    };
  }

  if (!row.true_risk || row.true_risk.trim().length === 0) {
    return { valid: false, error: `Row ${index + 1}: Missing true_risk` };
  }

  if (!isValidRisk(row.true_risk.toUpperCase())) {
    return {
      valid: false,
      error: `Row ${index + 1}: Invalid risk "${row.true_risk}". Must be one of: ${VALID_RISKS.join(', ')}`,
    };
  }

  return { valid: true };
}

/**
 * Parse CSV string into training data rows
 * Supports two formats:
 * 1. text,true_category,true_risk
 * 2. category,risk_level,prompt (or any order with header)
 */
export function parseCSV(csvContent: string): ParseResult {
  const errors: string[] = [];
  const data: TrainingDataRow[] = [];

  try {
    const lines = csvContent.split('\n').filter((line) => line.trim().length > 0);

    if (lines.length === 0) {
      return { success: false, data: [], errors: ['CSV file is empty'] };
    }

    // Check for header row and determine column mapping
    const firstLine = lines[0].toLowerCase();
    const hasHeader =
      (firstLine.includes('text') || firstLine.includes('prompt')) &&
      (firstLine.includes('true_category') || firstLine.includes('category')) &&
      (firstLine.includes('true_risk') || firstLine.includes('risk_level') || firstLine.includes('risk'));

    let textIndex = 0;
    let categoryIndex = 1;
    let riskIndex = 2;
    let startIndex = 0;

    if (hasHeader) {
      // Parse header to get column indices
      const headers = firstLine.split(',').map((h) => h.trim());

      textIndex = headers.findIndex((h) => h === 'text' || h === 'prompt');
      categoryIndex = headers.findIndex((h) => h === 'true_category' || h === 'category');
      riskIndex = headers.findIndex((h) => h === 'true_risk' || h === 'risk_level' || h === 'risk');

      if (textIndex === -1 || categoryIndex === -1 || riskIndex === -1) {
        return {
          success: false,
          data: [],
          errors: [
            'CSV header must contain columns for text/prompt, category/true_category, and risk_level/true_risk',
          ],
        };
      }

      startIndex = 1; // Skip header row
    }

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Proper CSV parsing that handles quoted fields with commas
      const fields: string[] = [];
      let currentField = '';
      let inQuotes = false;

      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        const nextChar = line[j + 1];

        if (char === '"') {
          if (inQuotes && nextChar === '"') {
            // Escaped quote
            currentField += '"';
            j++; // Skip next quote
          } else {
            // Toggle quote state
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          // End of field
          fields.push(currentField.trim());
          currentField = '';
        } else {
          currentField += char;
        }
      }
      // Add the last field
      fields.push(currentField.trim());

      if (fields.length < 3) {
        errors.push(
          `Row ${i + 1}: Invalid format. Expected 3 columns, got ${fields.length}`
        );
        continue;
      }

      const text = fields[textIndex] || '';
      const true_category = fields[categoryIndex] || '';
      const true_risk = fields[riskIndex] || '';

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
