import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { trainingRun } from '@/lib/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const { run_id } = await request.json();

    if (!run_id) {
      return NextResponse.json(
        { error: 'run_id is required' },
        { status: 400 }
      );
    }

    // Get current run status
    const [run] = await db
      .select()
      .from(trainingRun)
      .where(eq(trainingRun.run_id, run_id));

    if (!run) {
      return NextResponse.json(
        { error: 'Training run not found' },
        { status: 404 }
      );
    }

    if (run.status !== 'running') {
      return NextResponse.json(
        { error: `Cannot stop run with status: ${run.status}` },
        { status: 400 }
      );
    }

    // Update status to stopped
    await db
      .update(trainingRun)
      .set({
        status: 'stopped',
        completed_at: new Date(),
      })
      .where(eq(trainingRun.run_id, run_id));

    console.log(`Training run ${run_id} stopped by user`);

    return NextResponse.json({
      success: true,
      message: `Training run ${run_id} stopped successfully`,
    });
  } catch (error) {
    console.error('Error stopping training run:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
