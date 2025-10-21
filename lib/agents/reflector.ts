/**
 * Reflector Agent: Analyzes classification errors to extract insights
 */

import { callLLMWithJSON } from '../models';
import { createReflectorPrompt } from '../prompts';

export interface ReflectorResult {
  error_type: string;
  correct_approach: string;
  key_insight: string;
  affected_section: string;
  tag: string;
  latency_ms: number;
}

/**
 * Analyzes a classification error and generates insights
 *
 * @param text - The input text that was misclassified
 * @param predictedCategory - What the model predicted
 * @param predictedRisk - What risk level the model predicted
 * @param trueCategory - The actual correct category
 * @param trueRisk - The actual correct risk level
 * @returns Reflection with error analysis and insights
 */
export async function analyzeError(
  text: string,
  predictedCategory: string,
  predictedRisk: string,
  trueCategory: string,
  trueRisk: string
): Promise<ReflectorResult> {
  // Use the extracted prompt template
  const prompt = createReflectorPrompt(
    text,
    predictedCategory,
    predictedRisk,
    trueCategory,
    trueRisk
  );

  // Call LLM with JSON output mode
  const llmResponse = await callLLMWithJSON(prompt);
  const parsed = JSON.parse(llmResponse.text);

  return {
    error_type: parsed.error_type || 'unknown_error',
    correct_approach: parsed.correct_approach || '',
    key_insight: parsed.key_insight || '',
    affected_section: parsed.affected_section || trueCategory,
    tag: parsed.tag || 'general',
    latency_ms: llmResponse.latency_ms,
  };
}
