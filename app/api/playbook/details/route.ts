import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { reflections, agentLog } from '@/lib/schema';
import { and, eq } from 'drizzle-orm';

// GET heuristic details for a specific run_id and epoch_number
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const runIdParam = searchParams.get('run_id');
    const epochNumberParam = searchParams.get('epoch_number');

    if (!runIdParam || !epochNumberParam) {
      return NextResponse.json(
        { error: 'run_id and epoch_number are required' },
        { status: 400 }
      );
    }

    const run_id = parseInt(runIdParam, 10);
    const epoch_number = parseInt(epochNumberParam, 10);

    // Fetch reflections for this run and epoch
    const reflectionData = await db
      .select()
      .from(reflections)
      .where(
        and(
          eq(reflections.run_id, run_id),
          eq(reflections.epoch_number, epoch_number)
        )
      );

    // Fetch curator agent logs for this run and epoch
    const curatorLogs = await db
      .select()
      .from(agentLog)
      .where(
        and(
          eq(agentLog.run_id, run_id),
          eq(agentLog.epoch_number, epoch_number),
          eq(agentLog.agent_type, 'curator')
        )
      );

    // Extract curator output from the logs
    let curatorOutput = '';
    if (curatorLogs.length > 0) {
      curatorOutput = curatorLogs[0].output_summary || '';
      // If output_summary is empty, try to get from details
      if (!curatorOutput && curatorLogs[0].details) {
        const details = curatorLogs[0].details as any;
        curatorOutput = details.output || details.summary || '';
      }
    }

    return NextResponse.json({
      reflections: reflectionData.map(r => ({
        error_type: r.error_type,
        correct_approach: r.correct_approach,
        key_insight: r.key_insight,
      })),
      curatorOutput,
    });
  } catch (error) {
    console.error('Error fetching heuristic details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch heuristic details' },
      { status: 500 }
    );
  }
}
