// Agent prompts for the ACE system

import { VALID_CATEGORIES, VALID_RISKS, CATEGORIES_DISPLAY, RISKS_DISPLAY } from '../constants';

/**
 * Generator agent prompt - classifies text using playbook heuristics
 */
export function createGeneratorPrompt(context: string, text: string): string {
  return `You are a risk classifier that assigns a category and risk level to user input.

CATEGORIES:
${VALID_CATEGORIES.filter(c => c !== 'domestic_abuse').map(c => `- ${c}`).join('\n')}

RISK LEVELS:
${VALID_RISKS.map(r => `- ${r}`).join('\n')}

Use the following heuristics to guide your classification:
${context || 'No heuristics available yet.'}

Text to classify: "${text}"

Respond with ONLY valid JSON in this exact format:
{
  "category": "<category>",
  "risk_level": "<risk_level>",
  "heuristics_used": ["<bullet_id_1>", "<bullet_id_2>"]
}

IMPORTANT: In the "heuristics_used" array, list the IDs of the specific heuristics from the playbook that influenced your decision. Include 1-3 most relevant heuristics.`;
}

/**
 * Reflector agent prompt - analyzes classification errors
 */
export function createReflectorPrompt(
  text: string,
  predictedCategory: string,
  predictedRisk: string,
  trueCategory: string,
  trueRisk: string
): string {
  return `You are a reflective agent analyzing classification errors.

INPUT TEXT: "${text}"

PREDICTED:
- Category: ${predictedCategory}
- Risk Level: ${predictedRisk}

ACTUAL (TRUE):
- Category: ${trueCategory}
- Risk Level: ${trueRisk}

Analyze this error and provide:
1. What type of error occurred (e.g., "category misclassification", "risk underestimation", "risk overestimation")
2. What the correct approach should be
3. A key insight that could help prevent similar errors
4. Which section of the playbook this affects (use the true category)
5. A short tag for this insight (e.g., "indirect_language", "context_clues")

Respond in this exact JSON format:
{
  "error_type": "<error type>",
  "correct_approach": "<correct approach>",
  "key_insight": "<key insight>",
  "affected_section": "<section>",
  "tag": "<tag>"
}`;
}

/**
 * Curator agent prompt - generates new heuristics from reflections
 */
export function createCuratorPrompt(
  reflection: {
    error_type: string | null;
    correct_approach: string | null;
    key_insight: string | null;
    affected_section: string | null;
    tag: string | null;
  },
  playbookContext: string
): string {
  return `You are a curator that maintains a playbook of classification heuristics.

CURRENT PLAYBOOK:
${playbookContext || 'Empty playbook'}

NEW REFLECTION:
- Error Type: ${reflection.error_type || 'unknown'}
- Correct Approach: ${reflection.correct_approach || 'N/A'}
- Key Insight: ${reflection.key_insight || 'N/A'}
- Affected Section: ${reflection.affected_section || 'other_emergency'}
- Tag: ${reflection.tag || 'general'}

Based on this reflection, generate 1-2 NEW heuristic bullets that should be added to the playbook.
Each bullet should be:
- Actionable and specific
- Clear and concise
- Directly applicable to classification

Respond in JSON format:
{
  "bullets": [
    {
      "section": "<section name>",
      "content": "<heuristic bullet point>"
    }
  ]
}`;
}

/**
 * Format playbook bullets for use in prompts
 */
export function formatPlaybookContext(
  bullets: Array<{ bullet_id: string; section: string; content: string }>
): string {
  return bullets.map((b) => `[ID: ${b.bullet_id}] [${b.section}] ${b.content}`).join('\n');
}

/**
 * Format playbook for curator (without IDs)
 */
export function formatPlaybookForCurator(
  bullets: Array<{ section: string; content: string }>
): string {
  return bullets.map((b) => `[${b.section}] ${b.content}`).join('\n');
}
