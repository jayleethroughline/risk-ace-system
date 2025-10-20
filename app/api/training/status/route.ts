import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { trainingRun, epochResult, trainingData } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';
import { detectPlateau } from '@/lib/plateau-detector';

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

    return NextResponse.json({
      run_id,
      name: run.name,
      status: run.status,
      started_at: run.started_at,
      completed_at: run.completed_at,
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
      epochs: epochs.map((e) => ({
        epoch_number: e.epoch_number,
        overall_f1: e.overall_f1,
        category_f1: e.category_f1,
        risk_f1: e.risk_f1,
        accuracy: e.accuracy,
        playbook_size: e.playbook_size,
        errors_found: e.errors_found,
        heuristics_added: e.heuristics_added,
        created_at: e.created_at,
      })),
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
