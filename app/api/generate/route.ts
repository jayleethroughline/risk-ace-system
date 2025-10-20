import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { playbook, evalLog } from '@/lib/schema';
import { callLLMWithJSON } from '@/lib/models';
import { desc } from 'drizzle-orm';

export async function POST(req: Request) {
  try {
    const { text, true_category, true_risk } = await req.json();

    if (!text) {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

    // Retrieve top playbook bullets (ordered by helpful count)
    const bullets = await db
      .select()
      .from(playbook)
      .orderBy(desc(playbook.helpful_count))
      .limit(10);

    const context = bullets.map((b) => `- ${b.content}`).join('\n');

    const prompt = `You are a risk classifier that assigns a category and risk level to user input.

CATEGORIES:
- suicide
- nssi
- child_abuse
- domestic_violence
- sexual_violence
- elder_abuse
- homicide
- psychosis
- manic_episode
- eating_disorder
- substance_abuse
- other_emergency

RISK LEVELS:
- CRITICAL
- HIGH
- MEDIUM
- LOW

Use the following heuristics to guide your classification:
${context || 'No heuristics available yet.'}

Text to classify: "${text}"

Respond with ONLY valid JSON in this exact format:
{"category":"<category>","risk_level":"<risk_level>"}`;

    const result = await callLLMWithJSON(prompt);
    const { category, risk_level } = JSON.parse(result);

    // Log the evaluation if true labels are provided
    if (true_category && true_risk) {
      const correct =
        category === true_category && risk_level === true_risk ? 1 : 0;

      await db.insert(evalLog).values({
        input_text: text,
        predicted_category: category,
        predicted_risk: risk_level,
        true_category,
        true_risk,
        correct,
      });
    }

    return NextResponse.json({ category, risk_level });
  } catch (error) {
    console.error('Error in generate route:', error);
    return NextResponse.json(
      { error: 'Failed to generate classification' },
      { status: 500 }
    );
  }
}
