import { NextRequest, NextResponse } from 'next/server';

import { db } from '@/lib/db';

import { reflections } from '@/lib/schema';

import { eq, and } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

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
        .from(reflections)
        .where(and(eq(reflections.run_id, parseInt(runId)), eq(reflections.epoch_number, parseInt(epochNumber))))
        .orderBy(reflections.created_at);
    } else {
      query = db
        .select()
        .from(reflections)
        .where(eq(reflections.run_id, parseInt(runId)))
        .orderBy(reflections.created_at);
    }

    const data = await query;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching reflections:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
