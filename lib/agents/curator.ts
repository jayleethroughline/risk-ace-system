/**
 * Curator Agent: Generates new heuristics based on reflection insights
 */

import { callLLMWithJSON } from '../models';
import { createCuratorPrompt } from '../prompts';
import { logger } from '../logger';

export interface CuratorResult {
  bullets: Array<{ section: string; content: string }>;
  latency_ms: number;
}

export interface Reflection {
  error_type: string | null;
  correct_approach: string | null;
  key_insight: string | null;
  affected_section: string | null;
  tag: string | null;
}

export interface PlaybookEntry {
  section: string;
  content: string;
}

/**
 * Generates new heuristics from a reflection
 *
 * @param reflection - The reflection containing error analysis
 * @param currentPlaybook - The current playbook entries
 * @returns New heuristic bullets to add to the playbook
 */
export async function generateHeuristics(
  reflection: Reflection,
  currentPlaybook: PlaybookEntry[]
): Promise<CuratorResult> {
  // Format playbook context
  const playbookContext = currentPlaybook
    .map((b) => `[${b.section}] ${b.content}`)
    .join('\n');

  // Use the extracted prompt template (reflection first, then playbook)
  const prompt = createCuratorPrompt(reflection, playbookContext);

  // Call LLM with JSON output mode
  const llmResponse = await callLLMWithJSON(prompt);

  // Parse and validate response
  let parsed;
  try {
    parsed = JSON.parse(llmResponse.text);
  } catch (parseError) {
    logger.error('Curator JSON parse error:', parseError);
    logger.error('Raw LLM response:', llmResponse.text);
    return { bullets: [], latency_ms: llmResponse.latency_ms };
  }

  if (!parsed.bullets) {
    logger.warn('Curator returned no bullets field:', parsed);
    return { bullets: [], latency_ms: llmResponse.latency_ms };
  }

  if (!Array.isArray(parsed.bullets)) {
    logger.warn('Curator bullets is not an array:', parsed.bullets);
    return { bullets: [], latency_ms: llmResponse.latency_ms };
  }

  // Clean and validate bullets
  const bullets = parsed.bullets
    .map((b: any) => ({
      section: b.section || reflection.affected_section || 'other_emergency',
      content: b.content || '',
    }))
    .filter((b: { section: string; content: string }) => b.content.trim().length > 0);

  if (bullets.length === 0) {
    logger.warn('Curator generated empty bullets:', parsed.bullets);
  } else {
    logger.success(`Generated ${bullets.length} new heuristic(s)`);
  }

  return {
    bullets,
    latency_ms: llmResponse.latency_ms,
  };
}
