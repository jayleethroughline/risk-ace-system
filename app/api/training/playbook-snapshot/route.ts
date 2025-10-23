import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { playbook } from '@/lib/schema';
import { and, or, lte, isNull, eq } from 'drizzle-orm';
import { createGeneratorPrompt } from '@/lib/prompts';

export const dynamic = 'force-dynamic';

/**
 * Get playbook snapshot for a specific epoch
 * Returns the playbook content as it existed at the end of that epoch
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const runId = url.searchParams.get('run_id');
    const epochNumber = url.searchParams.get('epoch_number');

    if (!runId || !epochNumber) {
      return NextResponse.json(
        { error: 'Missing run_id or epoch_number parameter' },
        { status: 400 }
      );
    }

    const run_id = parseInt(runId, 10);
    const epoch_number = parseInt(epochNumber, 10);

    // Get all playbook entries that existed at this epoch
    // This includes:
    // 1. Baseline entries (run_id = null)
    // 2. Entries from this run up to and including this epoch
    const playbookEntries = await db
      .select({
        bullet_id: playbook.bullet_id,
        section: playbook.section,
        content: playbook.content,
        run_id: playbook.run_id,
        epoch_number: playbook.epoch_number,
      })
      .from(playbook)
      .where(
        or(
          isNull(playbook.run_id), // Baseline entries
          and(
            eq(playbook.run_id, run_id),
            lte(playbook.epoch_number, epoch_number)
          )
        )
      );

    // Filter and format entries
    const validEntries = playbookEntries
      .filter((b): b is { bullet_id: string; section: string; content: string; run_id: number | null; epoch_number: number | null } =>
        b.bullet_id !== null && b.section !== null && b.content !== null
      );

    // Format the playbook context as it would appear in the Generator prompt
    const context = validEntries
      .map((b) => `[ID: ${b.bullet_id}] [${b.section}] ${b.content}`)
      .join('\n');

    // Create the full prompt with a placeholder for the text
    const fullPrompt = createGeneratorPrompt(context, '{{USER_INPUT}}');

    // Calculate approximate token count (rough estimate: ~4 chars per token)
    // More accurate would be to use a tokenizer library
    const tokenCount = Math.ceil(fullPrompt.length / 4);

    return NextResponse.json({
      run_id,
      epoch_number,
      playbook_entries: validEntries,
      playbook_size: validEntries.length,
      playbook_context: context,
      full_prompt: fullPrompt,
      prompt_length: fullPrompt.length,
      token_count: tokenCount,
    });
  } catch (error) {
    console.error('Error getting playbook snapshot:', error);
    return NextResponse.json(
      { error: 'Failed to get playbook snapshot' },
      { status: 500 }
    );
  }
}
