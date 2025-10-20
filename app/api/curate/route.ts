import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { playbook, reflections } from '@/lib/schema';
import { callLLM } from '@/lib/models';
import { desc, eq } from 'drizzle-orm';

export async function POST(req: Request) {
  try {
    const { reflection_id } = await req.json();

    // Get recent reflections to update the playbook
    let reflectionsToProcess;

    if (reflection_id) {
      reflectionsToProcess = await db
        .select()
        .from(reflections)
        .where(eq(reflections.reflection_id, reflection_id))
        .limit(1);
    } else {
      // Get the most recent unprocessed reflections
      reflectionsToProcess = await db
        .select()
        .from(reflections)
        .orderBy(desc(reflections.created_at))
        .limit(5);
    }

    if (!reflectionsToProcess || reflectionsToProcess.length === 0) {
      return NextResponse.json(
        { message: 'No reflections to process' },
        { status: 200 }
      );
    }

    // Get current playbook for context
    const currentPlaybook = await db.select().from(playbook).limit(20);
    const playbookContext = currentPlaybook
      .map((b) => `[${b.section}] ${b.content}`)
      .join('\n');

    const updatedBullets = [];

    for (const reflection of reflectionsToProcess) {
      const prompt = `You are a curator that maintains a playbook of classification heuristics.

CURRENT PLAYBOOK:
${playbookContext || 'Empty playbook'}

NEW REFLECTION:
- Error Type: ${reflection.error_type}
- Correct Approach: ${reflection.correct_approach}
- Key Insight: ${reflection.key_insight}
- Affected Section: ${reflection.affected_section}
- Tag: ${reflection.tag}

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

      try {
        const llmResponse = await callLLM(prompt);
        const parsed = JSON.parse(llmResponse.text);

        if (parsed.bullets && Array.isArray(parsed.bullets)) {
          for (const bullet of parsed.bullets) {
            // Generate a unique ID for the bullet
            const bullet_id = `${bullet.section}_${Date.now()}_${Math.random()
              .toString(36)
              .substr(2, 9)}`;

            // Insert the new bullet
            const inserted = await db
              .insert(playbook)
              .values({
                bullet_id,
                section: bullet.section,
                content: bullet.content,
                helpful_count: 0,
                harmful_count: 0,
              })
              .returning();

            updatedBullets.push(inserted[0]);
          }
        }
      } catch (parseError) {
        console.error('Failed to parse curator response:', parseError);
        // Continue with next reflection
      }
    }

    return NextResponse.json({
      message: `Processed ${reflectionsToProcess.length} reflection(s)`,
      updated_bullets: updatedBullets,
    });
  } catch (error) {
    console.error('Error in curate route:', error);
    return NextResponse.json(
      { error: 'Failed to update playbook' },
      { status: 500 }
    );
  }
}
