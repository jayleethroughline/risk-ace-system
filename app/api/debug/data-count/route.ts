import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { trainingData, trainingRun } from '@/lib/schema';
import { sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Get all training runs
    const runs = await db.select().from(trainingRun);

    // Get count by run_id and data_type
    const counts = await db
      .select({
        run_id: trainingData.run_id,
        data_type: trainingData.data_type,
        count: sql<number>`count(*)::int`,
      })
      .from(trainingData)
      .groupBy(trainingData.run_id, trainingData.data_type);

    // Get total count
    const total = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(trainingData);

    return NextResponse.json({
      runs: runs.map(r => ({
        run_id: r.run_id,
        name: r.name,
        status: r.status,
      })),
      data_distribution: counts,
      total_samples: total[0].count,
    });
  } catch (error) {
    console.error('Error checking data:', error);
    return NextResponse.json(
      { error: 'Failed to check data' },
      { status: 500 }
    );
  }
}
