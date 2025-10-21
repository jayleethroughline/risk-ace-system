import { NextResponse } from 'next/server';
import { recoverStuckRuns, checkRunTimeouts } from '@/lib/recovery';

export const dynamic = 'force-dynamic';

/**
 * POST /api/training/recover
 * Checks for and recovers stuck training runs
 */
export async function POST() {
  try {
    // Run both recovery checks
    const [stuckResult, timeoutResult] = await Promise.all([
      recoverStuckRuns(),
      checkRunTimeouts(),
    ]);

    return NextResponse.json({
      success: true,
      stuck_runs_recovered: stuckResult.recovered,
      stuck_runs: stuckResult.runs,
      timed_out_runs: timeoutResult.timedOut,
      timed_out: timeoutResult.runs,
    });
  } catch (error) {
    console.error('Error in recovery endpoint:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/training/recover
 * Same as POST but allows GET requests
 */
export async function GET() {
  return POST();
}
