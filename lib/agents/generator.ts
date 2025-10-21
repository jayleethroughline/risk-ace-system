/**
 * Generator Agent: Classifies text using current playbook heuristics
 */

import { callLLMWithJSON } from '../models';
import { createGeneratorPrompt } from '../prompts';

export interface GeneratorResult {
  category: string;
  risk_level: string;
  heuristics_used: string[];
  latency_ms: number;
}

export interface PlaybookBullet {
  bullet_id: string;
  section: string;
  content: string;
}

/**
 * Classifies a single text using the current playbook
 *
 * @param text - The text to classify
 * @param playbookBullets - Current playbook heuristics
 * @returns Classification result with category, risk level, and heuristics used
 */
export async function classifyText(
  text: string,
  playbookBullets: PlaybookBullet[]
): Promise<GeneratorResult> {
  // Format playbook context for the prompt
  const context = playbookBullets
    .map((b) => `[ID: ${b.bullet_id}] [${b.section}] ${b.content}`)
    .join('\n');

  // Use the extracted prompt template
  const prompt = createGeneratorPrompt(context, text);

  // Call LLM with JSON output mode
  const llmResponse = await callLLMWithJSON(prompt);
  const parsed = JSON.parse(llmResponse.text);

  return {
    category: parsed.category?.toLowerCase() || 'other_emergency',
    risk_level: parsed.risk_level?.toUpperCase() || 'MEDIUM',
    heuristics_used: Array.isArray(parsed.heuristics_used) ? parsed.heuristics_used : [],
    latency_ms: llmResponse.latency_ms,
  };
}
