// Training orchestration controller

import { db } from './db';
import {
  trainingRun,
  epochResult,
  agentLog,
  trainingData,
  playbook,
  reflections,
} from './schema';
import { eq, desc } from 'drizzle-orm';
import { callLLMWithJSON, callLLM } from './models';
import {
  evaluatePredictions,
  type Prediction,
  type EvaluationResult,
} from './metrics';
import { detectPlateau, shouldContinueTraining } from './plateau-detector';
import type { TrainingDataRow } from './data-parser';

export interface TrainingConfig {
  run_id: number;
  max_epochs: number;
  plateau_threshold: number;
  plateau_patience: number;
}

export interface EpochStatus {
  epoch_number: number;
  status: 'running' | 'completed' | 'failed';
  metrics?: EvaluationResult;
  message: string;
}

/**
 * Generator: Classifies a single text using current playbook
 */
async function classifyText(
  text: string,
  playbookBullets: Array<{ section: string; content: string }>
): Promise<{ category: string; risk_level: string }> {
  const context = playbookBullets.map((b) => `[${b.section}] ${b.content}`).join('\n');

  const prompt = `You are a risk classifier that assigns a category and risk level to user input.

CATEGORIES:
- suicide
- nssi
- child_abuse
- domestic_violence
- sexual_violence
- elder_abuse
- homicide
- psychosis
- manic_episode
- eating_disorder
- substance_abuse
- other_emergency

RISK LEVELS:
- CRITICAL
- HIGH
- MEDIUM
- LOW

Use the following heuristics to guide your classification:
${context || 'No heuristics available yet.'}

Text to classify: "${text}"

Respond with ONLY valid JSON in this exact format:
{"category":"<category>","risk_level":"<risk_level>"}`;

  const result = await callLLMWithJSON(prompt);
  const parsed = JSON.parse(result);

  return {
    category: parsed.category?.toLowerCase() || 'other_emergency',
    risk_level: parsed.risk_level?.toUpperCase() || 'MEDIUM',
  };
}

/**
 * Reflector: Analyzes a classification error and generates insight
 */
async function analyzeError(
  text: string,
  predictedCategory: string,
  predictedRisk: string,
  trueCategory: string,
  trueRisk: string
): Promise<{
  error_type: string;
  correct_approach: string;
  key_insight: string;
  affected_section: string;
  tag: string;
}> {
  const prompt = `You are a reflective agent analyzing classification errors.

INPUT TEXT: "${text}"

PREDICTED:
- Category: ${predictedCategory}
- Risk Level: ${predictedRisk}

ACTUAL (TRUE):
- Category: ${trueCategory}
- Risk Level: ${trueRisk}

Analyze this error and provide:
1. What type of error occurred (e.g., "category misclassification", "risk underestimation", "risk overestimation")
2. What the correct approach should be
3. A key insight that could help prevent similar errors
4. Which section of the playbook this affects (use the true category)
5. A short tag for this insight (e.g., "indirect_language", "context_clues")

Respond in this exact JSON format:
{
  "error_type": "<error type>",
  "correct_approach": "<correct approach>",
  "key_insight": "<key insight>",
  "affected_section": "<section>",
  "tag": "<tag>"
}`;

  const result = await callLLM(prompt);
  const parsed = JSON.parse(result);

  return {
    error_type: parsed.error_type || 'unknown_error',
    correct_approach: parsed.correct_approach || '',
    key_insight: parsed.key_insight || '',
    affected_section: parsed.affected_section || trueCategory,
    tag: parsed.tag || 'general',
  };
}

/**
 * Curator: Generates new heuristics from reflections
 */
async function generateHeuristics(
  reflection: {
    error_type: string;
    correct_approach: string;
    key_insight: string;
    affected_section: string;
    tag: string;
  },
  currentPlaybook: Array<{ section: string; content: string }>
): Promise<Array<{ section: string; content: string }>> {
  const playbookContext = currentPlaybook
    .map((b) => `[${b.section}] ${b.content}`)
    .join('\n');

  const prompt = `You are a curator that maintains a playbook of classification heuristics.

CURRENT PLAYBOOK:
${playbookContext || 'Empty playbook'}

NEW REFLECTION:
- Error Type: ${reflection.error_type}
- Correct Approach: ${reflection.correct_approach}
- Key Insight: ${reflection.key_insight}
- Affected Section: ${reflection.affected_section}
- Tag: ${reflection.tag}

Based on this reflection, generate 1-2 NEW heuristic bullets that should be added to the playbook.
Each bullet should be:
- Actionable and specific
- Clear and concise
- Directly applicable to classification

Respond in JSON format:
{
  "bullets": [
    {
      "section": "<section name>",
      "content": "<heuristic bullet point>"
    }
  ]
}`;

  const result = await callLLM(prompt);
  const parsed = JSON.parse(result);

  if (parsed.bullets && Array.isArray(parsed.bullets)) {
    return parsed.bullets.map((b: any) => ({
      section: b.section || reflection.affected_section,
      content: b.content || '',
    }));
  }

  return [];
}

/**
 * Main training loop controller
 */
export async function runTrainingEpoch(
  config: TrainingConfig,
  epochNumber: number
): Promise<EpochStatus> {
  try {
    // Update training run status
    await db
      .update(trainingRun)
      .set({ status: 'running' })
      .where(eq(trainingRun.run_id, config.run_id));

    // 1. Load eval dataset
    const evalDataset = await db
      .select()
      .from(trainingData)
      .where(eq(trainingData.run_id, config.run_id))
      .where(eq(trainingData.data_type, 'eval'));

    if (evalDataset.length === 0) {
      return {
        epoch_number: epochNumber,
        status: 'failed',
        message: 'No evaluation data found',
      };
    }

    // 2. Load current playbook
    const currentPlaybook = await db
      .select({ section: playbook.section, content: playbook.content })
      .from(playbook)
      .orderBy(desc(playbook.helpful_count));

    // 3. Run Generator on all eval samples
    const predictions: Prediction[] = [];
    const errors: Array<{
      text: string;
      predicted_category: string;
      predicted_risk: string;
      true_category: string;
      true_risk: string;
    }> = [];

    for (const sample of evalDataset) {
      try {
        const { category, risk_level } = await classifyText(
          sample.text || '',
          currentPlaybook
        );

        predictions.push({
          input_text: sample.text || '',
          predicted_category: category,
          predicted_risk: risk_level,
          true_category: sample.true_category || '',
          true_risk: sample.true_risk || '',
        });

        // Track errors for reflection
        if (
          category !== sample.true_category ||
          risk_level !== sample.true_risk
        ) {
          errors.push({
            text: sample.text || '',
            predicted_category: category,
            predicted_risk: risk_level,
            true_category: sample.true_category || '',
            true_risk: sample.true_risk || '',
          });
        }
      } catch (error) {
        console.error('Error classifying text:', error);
        // Continue with next sample
      }
    }

    // Log Generator activity
    await db.insert(agentLog).values({
      run_id: config.run_id,
      epoch_number: epochNumber,
      agent_type: 'generator',
      system_prompt: 'Risk classifier using playbook heuristics',
      input_summary: `Classified ${evalDataset.length} samples`,
      output_summary: `Generated ${predictions.length} predictions, ${errors.length} errors found`,
      details: { predictions_count: predictions.length, errors_count: errors.length },
    });

    // 4. Calculate metrics
    const metrics = evaluatePredictions(predictions);

    // 5. Save epoch results
    const [savedEpoch] = await db
      .insert(epochResult)
      .values({
        run_id: config.run_id,
        epoch_number: epochNumber,
        category_f1: metrics.category_f1,
        risk_f1: metrics.risk_f1,
        overall_f1: metrics.overall_f1,
        accuracy: metrics.accuracy,
        playbook_size: currentPlaybook.length,
        errors_found: errors.length,
        heuristics_added: 0, // will update after curation
      })
      .returning();

    // 6. Run Reflector on errors (limit to top 10 to avoid overwhelming)
    const reflectionResults = [];
    const errorsToAnalyze = errors.slice(0, 10);

    for (const error of errorsToAnalyze) {
      try {
        const reflection = await analyzeError(
          error.text,
          error.predicted_category,
          error.predicted_risk,
          error.true_category,
          error.true_risk
        );

        const [inserted] = await db
          .insert(reflections)
          .values(reflection)
          .returning();

        reflectionResults.push(inserted);
      } catch (error) {
        console.error('Error analyzing error:', error);
        // Continue with next error
      }
    }

    // Log Reflector activity
    if (reflectionResults.length > 0) {
      await db.insert(agentLog).values({
        run_id: config.run_id,
        epoch_number: epochNumber,
        agent_type: 'reflector',
        system_prompt: 'Error analysis and insight generation',
        input_summary: `Analyzed ${errorsToAnalyze.length} classification errors`,
        output_summary: `Generated ${reflectionResults.length} reflections`,
        details: { reflections: reflectionResults },
      });
    }

    // 7. Run Curator to generate new heuristics
    let heuristicsAdded = 0;
    const newHeuristics = [];

    for (const reflection of reflectionResults) {
      try {
        const bullets = await generateHeuristics(reflection, currentPlaybook);

        for (const bullet of bullets) {
          const bullet_id = `${bullet.section}_${Date.now()}_${Math.random()
            .toString(36)
            .substr(2, 9)}`;

          const [inserted] = await db
            .insert(playbook)
            .values({
              bullet_id,
              section: bullet.section,
              content: bullet.content,
              helpful_count: 0,
              harmful_count: 0,
            })
            .returning();

          newHeuristics.push(inserted);
          heuristicsAdded++;
        }
      } catch (error) {
        console.error('Error generating heuristics:', error);
        // Continue with next reflection
      }
    }

    // Update epoch result with heuristics count
    if (heuristicsAdded > 0) {
      await db
        .update(epochResult)
        .set({ heuristics_added: heuristicsAdded })
        .where(eq(epochResult.epoch_id, savedEpoch.epoch_id));
    }

    // Log Curator activity
    if (heuristicsAdded > 0) {
      await db.insert(agentLog).values({
        run_id: config.run_id,
        epoch_number: epochNumber,
        agent_type: 'curator',
        system_prompt: 'Playbook heuristic generation',
        input_summary: `Processed ${reflectionResults.length} reflections`,
        output_summary: `Added ${heuristicsAdded} new heuristics to playbook`,
        details: { new_heuristics: newHeuristics },
      });
    }

    return {
      epoch_number: epochNumber,
      status: 'completed',
      metrics,
      message: `Epoch ${epochNumber} completed. F1: ${metrics.overall_f1.toFixed(4)}, Accuracy: ${metrics.accuracy.toFixed(4)}`,
    };
  } catch (error) {
    console.error('Error in training epoch:', error);
    return {
      epoch_number: epochNumber,
      status: 'failed',
      message: `Epoch ${epochNumber} failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Run complete training loop
 */
export async function runTraining(runId: number): Promise<void> {
  try {
    // Get training run configuration
    const [run] = await db
      .select()
      .from(trainingRun)
      .where(eq(trainingRun.run_id, runId));

    if (!run) {
      throw new Error(`Training run ${runId} not found`);
    }

    const config: TrainingConfig = {
      run_id: runId,
      max_epochs: run.max_epochs || 10,
      plateau_threshold: run.plateau_threshold || 0.01,
      plateau_patience: run.plateau_patience || 3,
    };

    // Update status and start time
    await db
      .update(trainingRun)
      .set({
        status: 'running',
        started_at: new Date(),
      })
      .where(eq(trainingRun.run_id, runId));

    // Training loop
    for (let epoch = 1; epoch <= config.max_epochs; epoch++) {
      const epochStatus = await runTrainingEpoch(config, epoch);

      if (epochStatus.status === 'failed') {
        await db
          .update(trainingRun)
          .set({
            status: 'failed',
            completed_at: new Date(),
          })
          .where(eq(trainingRun.run_id, runId));
        return;
      }

      // Get all epoch results to check plateau
      const allEpochs = await db
        .select({
          epoch_number: epochResult.epoch_number,
          overall_f1: epochResult.overall_f1,
          category_f1: epochResult.category_f1,
          risk_f1: epochResult.risk_f1,
        })
        .from(epochResult)
        .where(eq(epochResult.run_id, runId))
        .orderBy(epochResult.epoch_number);

      const continuationCheck = shouldContinueTraining(
        allEpochs.map((e) => ({
          epoch_number: e.epoch_number || 0,
          overall_f1: e.overall_f1 || 0,
          category_f1: e.category_f1 || 0,
          risk_f1: e.risk_f1 || 0,
        })),
        config.max_epochs,
        {
          threshold: config.plateau_threshold,
          patience: config.plateau_patience,
        }
      );

      if (!continuationCheck.continue) {
        console.log(`Training stopped: ${continuationCheck.reason}`);
        await db
          .update(trainingRun)
          .set({
            status: 'completed',
            completed_at: new Date(),
          })
          .where(eq(trainingRun.run_id, runId));
        return;
      }
    }

    // Training completed all epochs
    await db
      .update(trainingRun)
      .set({
        status: 'completed',
        completed_at: new Date(),
      })
      .where(eq(trainingRun.run_id, runId));
  } catch (error) {
    console.error('Error in training loop:', error);
    await db
      .update(trainingRun)
      .set({
        status: 'failed',
        completed_at: new Date(),
      })
      .where(eq(trainingRun.run_id, runId));
    throw error;
  }
}
