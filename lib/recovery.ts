// Recovery utilities for handling stuck training runs

import { db } from './db';
import { trainingRun } from './schema';
import { eq, and, lt, sql } from 'drizzle-orm';
import { TIMEOUTS } from './config';
import { logger } from './logger';

/**
 * Detects and recovers stuck training runs on application startup.
 * A run is considered stuck if:
 * 1. Status is 'running'
 * 2. No activity for more than 5 minutes (last_activity_at is stale)
 *
 * Stuck runs are marked as 'failed' with reason "Process interrupted"
 */
export async function recoverStuckRuns(): Promise<{
  recovered: number;
  runs: Array<{ run_id: number; name: string | null }>;
}> {
  logger.info('Checking for stuck training runs...');

  try {
    // Find all runs with status 'running'
    const runningRuns = await db
      .select({
        run_id: trainingRun.run_id,
        name: trainingRun.name,
        started_at: trainingRun.started_at,
        last_activity_at: trainingRun.last_activity_at,
      })
      .from(trainingRun)
      .where(eq(trainingRun.status, 'running'));

    if (runningRuns.length === 0) {
      logger.info('No running training runs found');
      return { recovered: 0, runs: [] };
    }

    logger.info(`Found ${runningRuns.length} run(s) with status 'running'`);

    // Check each run for stale activity
    const staleRuns = [];
    const staleThreshold = new Date(Date.now() - TIMEOUTS.HEARTBEAT_STALE_MS);

    for (const run of runningRuns) {
      const lastActivity = run.last_activity_at || run.started_at;

      if (!lastActivity) {
        // No activity timestamp at all - definitely stuck
        logger.warn(`Run #${run.run_id} (${run.name}): No activity timestamp - marking as failed`);
        staleRuns.push(run);
      } else if (lastActivity < staleThreshold) {
        // Activity timestamp is older than threshold
        const minutesSinceActivity = Math.round((Date.now() - lastActivity.getTime()) / 60000);
        logger.warn(`Run #${run.run_id} (${run.name}): Last activity ${minutesSinceActivity} minutes ago - marking as failed`);
        staleRuns.push(run);
      } else {
        // Recent activity - still actively running
        logger.info(`Run #${run.run_id} (${run.name}): Active (last activity within threshold)`);
      }
    }

    // Mark stale runs as failed
    if (staleRuns.length > 0) {
      for (const run of staleRuns) {
        const lastActivity = run.last_activity_at || run.started_at;
        const minutesSinceActivity = lastActivity
          ? Math.round((Date.now() - lastActivity.getTime()) / 60000)
          : 'unknown';

        await db
          .update(trainingRun)
          .set({
            status: 'failed',
            completed_at: new Date(),
            failure_reason: `Training process died or became unresponsive. Last activity: ${minutesSinceActivity} minutes ago. The process likely crashed or the server was restarted during training.`,
          })
          .where(eq(trainingRun.run_id, run.run_id));
      }

      logger.success(`Recovered ${staleRuns.length} stuck training run(s)`);
      return {
        recovered: staleRuns.length,
        runs: staleRuns.map(r => ({ run_id: r.run_id, name: r.name })),
      };
    } else {
      logger.info('All running training runs are active');
      return { recovered: 0, runs: [] };
    }
  } catch (error) {
    logger.error('Error during stuck run recovery', error);
    // Don't throw - recovery should not block application startup
    return { recovered: 0, runs: [] };
  }
}

/**
 * Checks for training runs that have exceeded maximum runtime (24 hours)
 * and marks them as failed.
 */
export async function checkRunTimeouts(): Promise<{
  timedOut: number;
  runs: Array<{ run_id: number; name: string | null }>;
}> {
  logger.info('Checking for timed-out training runs...');

  try {
    const timeoutThreshold = new Date(Date.now() - TIMEOUTS.RUN_TIMEOUT_MS);

    // Find running runs that started more than 24 hours ago
    const timedOutRuns = await db
      .select({
        run_id: trainingRun.run_id,
        name: trainingRun.name,
        started_at: trainingRun.started_at,
      })
      .from(trainingRun)
      .where(
        and(
          eq(trainingRun.status, 'running'),
          lt(trainingRun.started_at, timeoutThreshold)
        )
      );

    if (timedOutRuns.length === 0) {
      logger.info('No timed-out runs found');
      return { timedOut: 0, runs: [] };
    }

    // Mark timed-out runs as failed
    for (const run of timedOutRuns) {
      const hoursSinceStart = run.started_at
        ? Math.round((Date.now() - run.started_at.getTime()) / 3600000)
        : 0;

      logger.warn(`Run #${run.run_id} (${run.name}): Running for ${hoursSinceStart} hours - marking as failed`);

      await db
        .update(trainingRun)
        .set({
          status: 'failed',
          completed_at: new Date(),
          failure_reason: `Training exceeded maximum runtime limit of 24 hours. The run was automatically terminated after running for ${hoursSinceStart} hours. This may indicate an infinite loop, extremely slow LLM responses, or misconfigured training parameters.`,
        })
        .where(eq(trainingRun.run_id, run.run_id));
    }

    logger.success(`Timed out ${timedOutRuns.length} training run(s)`);
    return {
      timedOut: timedOutRuns.length,
      runs: timedOutRuns.map(r => ({ run_id: r.run_id, name: r.name })),
    };
  } catch (error) {
    logger.error('Error checking run timeouts', error);
    return { timedOut: 0, runs: [] };
  }
}
