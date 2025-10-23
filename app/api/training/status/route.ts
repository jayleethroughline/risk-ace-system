import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { trainingRun, epochResult, trainingData, playbook } from '@/lib/schema';
import { eq, and, or, lte, isNull } from 'drizzle-orm';
import { detectPlateau } from '@/lib/plateau-detector';
import { createGeneratorPrompt } from '@/lib/prompts';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const runId = url.searchParams.get('run_id');

    if (!runId) {
      return NextResponse.json(
        { error: 'Missing run_id parameter' },
        { status: 400 }
      );
    }

    const run_id = parseInt(runId, 10);

    // Get training run info
    const [run] = await db
      .select()
      .from(trainingRun)
      .where(eq(trainingRun.run_id, run_id));

    if (!run) {
      return NextResponse.json(
        { error: `Training run ${run_id} not found` },
        { status: 404 }
      );
    }

    // Get all epoch results
    const epochs = await db
      .select()
      .from(epochResult)
      .where(eq(epochResult.run_id, run_id))
      .orderBy(epochResult.epoch_number);

    // Get dataset sizes
    const trainCount = await db
      .select()
      .from(trainingData)
      .where(and(
        eq(trainingData.run_id, run_id),
        eq(trainingData.data_type, 'train')
      ));

    const evalCount = await db
      .select()
      .from(trainingData)
      .where(and(
        eq(trainingData.run_id, run_id),
        eq(trainingData.data_type, 'eval')
      ));

    // Calculate plateau status if we have epoch results
    let plateauStatus = null;
    if (epochs.length > 0) {
      plateauStatus = detectPlateau(
        epochs.map((e) => ({
          epoch_number: e.epoch_number || 0,
          overall_f1: e.overall_f1 || 0,
          category_f1: e.category_f1 || 0,
          risk_f1: e.risk_f1 || 0,
        })),
        {
          threshold: run.plateau_threshold || 0.01,
          patience: run.plateau_patience || 3,
        }
      );
    }

    // Calculate progress
    const currentEpoch = epochs.length;
    const maxEpochs = run.max_epochs || 10;
    const progress = Math.round((currentEpoch / maxEpochs) * 100);

    // Get best epoch
    let bestEpoch = null;
    if (epochs.length > 0) {
      bestEpoch = epochs.reduce((best, current) => {
        return (current.overall_f1 || 0) > (best.overall_f1 || 0)
          ? current
          : best;
      });
    }

    // Calculate token counts for each epoch
    const epochsWithTokens = await Promise.all(
      epochs.map(async (epoch) => {
        const epoch_number = epoch.epoch_number || 0;

        // Get playbook state at this epoch
        const playbookEntries = await db
          .select({
            bullet_id: playbook.bullet_id,
            section: playbook.section,
            content: playbook.content,
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

        const validEntries = playbookEntries
          .filter((b): b is { bullet_id: string; section: string; content: string } =>
            b.bullet_id !== null && b.section !== null && b.content !== null
          );

        // Format playbook context
        const context = validEntries
          .map((b) => `[ID: ${b.bullet_id}] [${b.section}] ${b.content}`)
          .join('\n');

        // Create full prompt
        const fullPrompt = createGeneratorPrompt(context, '{{USER_INPUT}}');

        // Calculate token count (approximate: 4 chars per token)
        const tokenCount = Math.ceil(fullPrompt.length / 4);

        return {
          epoch_number: epoch.epoch_number,
          overall_f1: epoch.overall_f1,
          category_f1: epoch.category_f1,
          risk_f1: epoch.risk_f1,
          accuracy: epoch.accuracy,
          playbook_size: epoch.playbook_size,
          token_count: tokenCount,
          errors_found: epoch.errors_found,
          heuristics_added: epoch.heuristics_added,
          created_at: epoch.created_at,
        };
      })
    );

    return NextResponse.json({
      run_id,
      name: run.name,
      status: run.status,
      started_at: run.started_at,
      completed_at: run.completed_at,
      failure_reason: run.failure_reason,
      config: {
        max_epochs: run.max_epochs,
        plateau_threshold: run.plateau_threshold,
        plateau_patience: run.plateau_patience,
      },
      dataset: {
        training_samples: trainCount.length,
        eval_samples: evalCount.length,
      },
      progress: {
        current_epoch: currentEpoch,
        max_epochs: maxEpochs,
        progress_percent: progress,
      },
      epochs: epochsWithTokens,
      best_epoch: bestEpoch
        ? {
            epoch_number: bestEpoch.epoch_number,
            overall_f1: bestEpoch.overall_f1,
            category_f1: bestEpoch.category_f1,
            risk_f1: bestEpoch.risk_f1,
            accuracy: bestEpoch.accuracy,
          }
        : null,
      plateau_status: plateauStatus,
    });
  } catch (error) {
    console.error('Error getting training status:', error);
    return NextResponse.json(
      { error: 'Failed to get training status' },
      { status: 500 }
    );
  }
}
