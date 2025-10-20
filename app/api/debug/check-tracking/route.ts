import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { reflections, playbook } from '@/lib/schema';
import { sql } from 'drizzle-orm';

export async function GET() {
  try {
    // Check reflections with and without tracking
    const allReflections = await db
      .select({
        reflection_id: reflections.reflection_id,
        run_id: reflections.run_id,
        epoch_number: reflections.epoch_number,
        error_type: reflections.error_type,
        created_at: reflections.created_at,
      })
      .from(reflections)
      .orderBy(sql`${reflections.created_at} DESC`)
      .limit(20);

    // Check playbook with and without tracking
    const allHeuristics = await db
      .select({
        bullet_id: playbook.bullet_id,
        run_id: playbook.run_id,
        epoch_number: playbook.epoch_number,
        section: playbook.section,
        last_updated: playbook.last_updated,
      })
      .from(playbook)
      .orderBy(sql`${playbook.last_updated} DESC`)
      .limit(20);

    return NextResponse.json({
      reflections: allReflections,
      heuristics: allHeuristics,
      summary: {
        totalReflections: allReflections.length,
        reflectionsWithTracking: allReflections.filter(r => r.run_id !== null).length,
        reflectionsWithoutTracking: allReflections.filter(r => r.run_id === null).length,
        totalHeuristics: allHeuristics.length,
        heuristicsWithTracking: allHeuristics.filter(h => h.run_id !== null).length,
        heuristicsWithoutTracking: allHeuristics.filter(h => h.run_id === null).length,
      }
    });
  } catch (error) {
    console.error('Error checking tracking data:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
