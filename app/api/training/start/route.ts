import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { trainingRun, trainingData } from '@/lib/schema';
import { parseData } from '@/lib/data-parser';
import { runTraining } from '@/lib/controller';
import { eq } from 'drizzle-orm';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      name,
      training_data,
      eval_data,
      max_epochs = 10,
      plateau_threshold = 0.01,
      plateau_patience = 3,
      auto_start = true,
    } = body;

    // Validate inputs
    if (!name || !training_data || !eval_data) {
      return NextResponse.json(
        { error: 'Missing required fields: name, training_data, eval_data' },
        { status: 400 }
      );
    }

    // Parse training data
    const trainingParsed = parseData(training_data);
    if (!trainingParsed.success || trainingParsed.data.length === 0) {
      return NextResponse.json(
        {
          error: 'Invalid training data',
          details: trainingParsed.errors,
        },
        { status: 400 }
      );
    }

    // Parse eval data
    const evalParsed = parseData(eval_data);
    if (!evalParsed.success || evalParsed.data.length === 0) {
      return NextResponse.json(
        {
          error: 'Invalid evaluation data',
          details: evalParsed.errors,
        },
        { status: 400 }
      );
    }

    // Create training run
    const [run] = await db
      .insert(trainingRun)
      .values({
        name,
        max_epochs,
        plateau_threshold,
        plateau_patience,
        status: 'pending',
      })
      .returning();

    // Store training data
    for (const row of trainingParsed.data) {
      await db.insert(trainingData).values({
        run_id: run.run_id,
        data_type: 'train',
        text: row.text,
        true_category: row.true_category,
        true_risk: row.true_risk,
      });
    }

    // Store eval data
    for (const row of evalParsed.data) {
      await db.insert(trainingData).values({
        run_id: run.run_id,
        data_type: 'eval',
        text: row.text,
        true_category: row.true_category,
        true_risk: row.true_risk,
      });
    }

    // Start training if requested
    if (auto_start) {
      // Run training asynchronously (don't await)
      runTraining(run.run_id).catch(async (error) => {
        console.error('Training failed:', error);
        // Update database status to failed
        try {
          const errorMessage = error instanceof Error ? error.message : String(error);
          await db
            .update(trainingRun)
            .set({
              status: 'failed',
              completed_at: new Date(),
              failure_reason: `Training failed with error: ${errorMessage}`,
            })
            .where(eq(trainingRun.run_id, run.run_id));
        } catch (dbError) {
          console.error('Failed to update run status to failed:', dbError);
        }
      });

      return NextResponse.json({
        message: 'Training started',
        run_id: run.run_id,
        training_samples: trainingParsed.data.length,
        eval_samples: evalParsed.data.length,
      });
    }

    return NextResponse.json({
      message: 'Training run created. Call /api/training/start/{run_id} to start.',
      run_id: run.run_id,
      training_samples: trainingParsed.data.length,
      eval_samples: evalParsed.data.length,
    });
  } catch (error) {
    console.error('Error starting training:', error);
    return NextResponse.json(
      { error: 'Failed to start training' },
      { status: 500 }
    );
  }
}

// GET endpoint to manually start a training run by ID
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

    // Check if run exists
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

    if (run.status === 'running') {
      return NextResponse.json(
        { error: 'Training is already running' },
        { status: 400 }
      );
    }

    // Start training asynchronously
    runTraining(run_id).catch(async (error) => {
      console.error('Training failed:', error);
      // Update database status to failed
      try {
        const errorMessage = error instanceof Error ? error.message : String(error);
        await db
          .update(trainingRun)
          .set({
            status: 'failed',
            completed_at: new Date(),
            failure_reason: `Training failed with error: ${errorMessage}`,
          })
          .where(eq(trainingRun.run_id, run_id));
      } catch (dbError) {
        console.error('Failed to update run status to failed:', dbError);
      }
    });

    return NextResponse.json({
      message: 'Training started',
      run_id,
    });
  } catch (error) {
    console.error('Error starting training:', error);
    return NextResponse.json(
      { error: 'Failed to start training' },
      { status: 500 }
    );
  }
}
