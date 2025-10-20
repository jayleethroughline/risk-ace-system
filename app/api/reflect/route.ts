import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { evalLog, reflections } from '@/lib/schema';
import { callLLM } from '@/lib/models';
import { eq, desc } from 'drizzle-orm';

export async function POST(req: Request) {
  try {
    const { eval_id } = await req.json();

    // If eval_id is provided, analyze that specific error
    // Otherwise, analyze recent errors
    let errors;

    if (eval_id) {
      errors = await db
        .select()
        .from(evalLog)
        .where(eq(evalLog.id, eval_id))
        .limit(1);
    } else {
      // Get recent incorrect predictions
      errors = await db
        .select()
        .from(evalLog)
        .where(eq(evalLog.correct, 0))
        .orderBy(desc(evalLog.timestamp))
        .limit(5);
    }

    if (!errors || errors.length === 0) {
      return NextResponse.json(
        { message: 'No errors found to analyze' },
        { status: 200 }
      );
    }

    const reflectionResults = [];

    for (const error of errors) {
      const prompt = `You are a reflective agent analyzing classification errors.

INPUT TEXT: "${error.input_text}"

PREDICTED:
- Category: ${error.predicted_category}
- Risk Level: ${error.predicted_risk}

ACTUAL (TRUE):
- Category: ${error.true_category}
- Risk Level: ${error.true_risk}

Analyze this error and provide:
1. What type of error occurred (e.g., "category misclassification", "risk underestimation", "risk overestimation")
2. What the correct approach should be
3. A key insight that could help prevent similar errors
4. Which section of the playbook this affects (e.g., "suicidal_ideation", "risk_assessment")
5. A short tag for this insight (e.g., "indirect_language", "context_clues")

Respond in this exact JSON format:
{
  "error_type": "<error type>",
  "correct_approach": "<correct approach>",
  "key_insight": "<key insight>",
  "affected_section": "<section>",
  "tag": "<tag>"
}`;

      try {
        const result = await callLLM(prompt);
        // Try to parse as JSON
        const reflection = JSON.parse(result);

        // Store the reflection
        const inserted = await db
          .insert(reflections)
          .values({
            error_type: reflection.error_type,
            correct_approach: reflection.correct_approach,
            key_insight: reflection.key_insight,
            affected_section: reflection.affected_section,
            tag: reflection.tag,
          })
          .returning();

        reflectionResults.push(inserted[0]);
      } catch (parseError) {
        console.error('Failed to parse reflection:', parseError);
        // Continue with next error
      }
    }

    return NextResponse.json({
      message: `Analyzed ${errors.length} error(s)`,
      reflections: reflectionResults,
    });
  } catch (error) {
    console.error('Error in reflect route:', error);
    return NextResponse.json(
      { error: 'Failed to analyze errors' },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve recent reflections
export async function GET() {
  try {
    const recentReflections = await db
      .select()
      .from(reflections)
      .orderBy(desc(reflections.created_at))
      .limit(20);

    return NextResponse.json({ reflections: recentReflections });
  } catch (error) {
    console.error('Error fetching reflections:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reflections' },
      { status: 500 }
    );
  }
}
