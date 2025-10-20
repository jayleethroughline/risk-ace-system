import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { playbook } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const runId = searchParams.get('run_id');
    const epochNumber = searchParams.get('epoch_number');

    if (!runId) {
      return NextResponse.json(
        { error: 'run_id is required' },
        { status: 400 }
      );
    }

    let query;
    if (epochNumber) {
      query = db
        .select()
        .from(playbook)
        .where(and(eq(playbook.run_id, parseInt(runId)), eq(playbook.epoch_number, parseInt(epochNumber))))
        .orderBy(playbook.last_updated);
    } else {
      query = db
        .select()
        .from(playbook)
        .where(eq(playbook.run_id, parseInt(runId)))
        .orderBy(playbook.last_updated);
    }

    const data = await query;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching heuristics:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
