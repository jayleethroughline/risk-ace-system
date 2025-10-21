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
import { eq, desc, and, sql } from 'drizzle-orm';
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
  status: 'running' | 'completed' | 'failed' | 'stopped';
  metrics?: EvaluationResult;
  message: string;
}

/**
 * Generator: Classifies a single text using current playbook
 */
async function classifyText(
  text: string,
  playbookBullets: Array<{ bullet_id: string; section: string; content: string }>
): Promise<{ category: string; risk_level: string; heuristics_used: string[]; latency_ms: number }> {
  const context = playbookBullets.map((b) => `[ID: ${b.bullet_id}] [${b.section}] ${b.content}`).join('\n');

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
{
  "category": "<category>",
  "risk_level": "<risk_level>",
  "heuristics_used": ["<bullet_id_1>", "<bullet_id_2>"]
}

IMPORTANT: In the "heuristics_used" array, list the IDs of the specific heuristics from the playbook that influenced your decision. Include 1-3 most relevant heuristics.`;

  const llmResponse = await callLLMWithJSON(prompt);
  const parsed = JSON.parse(llmResponse.text);

  return {
    category: parsed.category?.toLowerCase() || 'other_emergency',
    risk_level: parsed.risk_level?.toUpperCase() || 'MEDIUM',
    heuristics_used: Array.isArray(parsed.heuristics_used) ? parsed.heuristics_used : [],
    latency_ms: llmResponse.latency_ms,
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
  latency_ms: number;
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

  const llmResponse = await callLLMWithJSON(prompt);
  const parsed = JSON.parse(llmResponse.text);

  return {
    error_type: parsed.error_type || 'unknown_error',
    correct_approach: parsed.correct_approach || '',
    key_insight: parsed.key_insight || '',
    affected_section: parsed.affected_section || trueCategory,
    tag: parsed.tag || 'general',
    latency_ms: llmResponse.latency_ms,
  };
}

/**
 * Curator: Generates new heuristics from reflections
 */
async function generateHeuristics(
  reflection: {
    error_type: string | null;
    correct_approach: string | null;
    key_insight: string | null;
    affected_section: string | null;
    tag: string | null;
  },
  currentPlaybook: Array<{ section: string; content: string }>
): Promise<{ bullets: Array<{ section: string; content: string }>; latency_ms: number }> {
  const playbookContext = currentPlaybook
    .map((b) => `[${b.section}] ${b.content}`)
    .join('\n');

  const prompt = `You are a curator that maintains a playbook of classification heuristics.

CURRENT PLAYBOOK:
${playbookContext || 'Empty playbook'}

NEW REFLECTION:
- Error Type: ${reflection.error_type || 'unknown'}
- Correct Approach: ${reflection.correct_approach || 'N/A'}
- Key Insight: ${reflection.key_insight || 'N/A'}
- Affected Section: ${reflection.affected_section || 'other_emergency'}
- Tag: ${reflection.tag || 'general'}

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

  const llmResponse = await callLLMWithJSON(prompt);

  let parsed;
  try {
    parsed = JSON.parse(llmResponse.text);
  } catch (parseError) {
    console.error('❌ Curator JSON parse error:', parseError);
    console.error('Raw LLM response:', llmResponse.text);
    return { bullets: [], latency_ms: llmResponse.latency_ms };
  }

  if (!parsed.bullets) {
    console.warn('⚠️  Curator returned no bullets field:', parsed);
    return { bullets: [], latency_ms: llmResponse.latency_ms };
  }

  if (!Array.isArray(parsed.bullets)) {
    console.warn('⚠️  Curator bullets is not an array:', parsed.bullets);
    return { bullets: [], latency_ms: llmResponse.latency_ms };
  }

  const bullets = parsed.bullets.map((b: any) => ({
    section: b.section || reflection.affected_section || 'other_emergency',
    content: b.content || '',
  })).filter((b: { section: string; content: string }) => b.content.trim().length > 0);

  if (bullets.length === 0) {
    console.warn('⚠️  Curator generated empty bullets:', parsed.bullets);
  } else {
    console.log(`  ✓ Generated ${bullets.length} new heuristic(s)`);
  }

  return {
    bullets,
    latency_ms: llmResponse.latency_ms,
  };
}

/**
 * Main training loop controller
 */
export async function runTrainingEpoch(
  config: TrainingConfig,
  epochNumber: number
): Promise<EpochStatus> {
  console.log(`\n🔄 Starting Epoch ${epochNumber} for run_id ${config.run_id}`);

  try {
    // Update training run status
    await db
      .update(trainingRun)
      .set({ status: 'running' })
      .where(eq(trainingRun.run_id, config.run_id));

    // 1. Load eval dataset
    console.log(`📊 Loading eval dataset...`);
    const evalDataset = await db
      .select()
      .from(trainingData)
      .where(and(
        eq(trainingData.run_id, config.run_id),
        eq(trainingData.data_type, 'eval')
      ));

    console.log(`✓ Loaded ${evalDataset.length} eval samples`);

    if (evalDataset.length === 0) {
      console.log(`❌ No evaluation data found`);
      return {
        epoch_number: epochNumber,
        status: 'failed',
        message: 'No evaluation data found',
      };
    }

    // 2. Load current playbook
    console.log(`📖 Loading playbook...`);
    const playbookRaw = await db
      .select({
        bullet_id: playbook.bullet_id,
        section: playbook.section,
        content: playbook.content
      })
      .from(playbook)
      .orderBy(desc(playbook.helpful_count));

    // Filter out null values and type-cast
    const currentPlaybook: Array<{ bullet_id: string; section: string; content: string }> = playbookRaw
      .filter((b): b is { bullet_id: string; section: string; content: string } =>
        b.bullet_id !== null && b.section !== null && b.content !== null
      );

    console.log(`✓ Loaded ${currentPlaybook.length} playbook heuristics`);

    // 3. Run Generator on all eval samples
    console.log(`🤖 Starting Generator: classifying ${evalDataset.length} samples...`);
    const predictions: Prediction[] = [];
    const errors: Array<{
      text: string;
      predicted_category: string;
      predicted_risk: string;
      true_category: string;
      true_risk: string;
    }> = [];

    // Track heuristics usage: { bullet_id: { helpful: count, harmful: count } }
    const heuristicsTracking: Record<string, { helpful: number; harmful: number }> = {};
    let totalGeneratorLatency = 0;

    for (let i = 0; i < evalDataset.length; i++) {
      const sample = evalDataset[i];
      console.log(`  Classifying sample ${i + 1}/${evalDataset.length}...`);

      try {
        const { category, risk_level, heuristics_used, latency_ms } = await classifyText(
          sample.text || '',
          currentPlaybook
        );

        totalGeneratorLatency += latency_ms;
        console.log(`  ✓ Sample ${i + 1}: ${category}/${risk_level} (${latency_ms}ms)`);

        predictions.push({
          input_text: sample.text || '',
          predicted_category: category,
          predicted_risk: risk_level,
          true_category: sample.true_category || '',
          true_risk: sample.true_risk || '',
        });

        // Determine if prediction was correct
        const isCorrect =
          category === sample.true_category &&
          risk_level === sample.true_risk;

        // Track heuristics effectiveness
        for (const heuristicId of heuristics_used) {
          if (!heuristicsTracking[heuristicId]) {
            heuristicsTracking[heuristicId] = { helpful: 0, harmful: 0 };
          }
          if (isCorrect) {
            heuristicsTracking[heuristicId].helpful++;
          } else {
            heuristicsTracking[heuristicId].harmful++;
          }
        }

        // Track errors for reflection
        if (!isCorrect) {
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

    const avgGeneratorLatency = predictions.length > 0 ? Math.round(totalGeneratorLatency / predictions.length) : 0;

    console.log(`✅ Generator complete: ${predictions.length} predictions, ${errors.length} errors, avg ${avgGeneratorLatency}ms`);

    // Log Generator activity
    await db.insert(agentLog).values({
      run_id: config.run_id,
      epoch_number: epochNumber,
      agent_type: 'generator',
      system_prompt: 'Risk classifier using playbook heuristics',
      input_summary: `Classified ${evalDataset.length} samples`,
      output_summary: `Generated ${predictions.length} predictions, ${errors.length} errors found. Avg latency: ${avgGeneratorLatency}ms`,
      details: {
        predictions_count: predictions.length,
        errors_count: errors.length,
        total_latency_ms: totalGeneratorLatency,
        avg_latency_ms: avgGeneratorLatency,
      },
    });

    // Update heuristic effectiveness counts in database
    console.log(`📊 Updating heuristic effectiveness counts...`);
    const heuristicsUpdated = Object.keys(heuristicsTracking).length;
    for (const [bulletId, counts] of Object.entries(heuristicsTracking)) {
      try {
        await db.execute(
          sql`UPDATE playbook
              SET helpful_count = helpful_count + ${counts.helpful},
                  harmful_count = harmful_count + ${counts.harmful}
              WHERE bullet_id = ${bulletId}`
        );
      } catch (error) {
        console.error(`  ❌ Failed to update counts for ${bulletId}:`, error);
      }
    }
    console.log(`✓ Updated effectiveness counts for ${heuristicsUpdated} heuristics`);

    // 4. Calculate metrics
    console.log(`📈 Calculating F1 metrics...`);
    const metrics = evaluatePredictions(predictions);
    console.log(`✓ Metrics: F1=${metrics.overall_f1.toFixed(4)}, Acc=${metrics.accuracy.toFixed(4)}`);

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

    // 6. Run Reflector on all errors (comprehensive analysis per ACE paper)
    console.log(`🔍 Starting Reflector: analyzing ${errors.length} errors...`);
    const reflectionResults = [];
    const errorsToAnalyze = errors;
    let totalReflectorLatency = 0;

    for (const error of errorsToAnalyze) {
      try {
        const reflection = await analyzeError(
          error.text,
          error.predicted_category,
          error.predicted_risk,
          error.true_category,
          error.true_risk
        );

        totalReflectorLatency += reflection.latency_ms;

        const [inserted] = await db
          .insert(reflections)
          .values({
            run_id: config.run_id,
            epoch_number: epochNumber,
            error_type: reflection.error_type,
            correct_approach: reflection.correct_approach,
            key_insight: reflection.key_insight,
            affected_section: reflection.affected_section,
            tag: reflection.tag,
            input_text: error.text,
            predicted: `${error.predicted_category}/${error.predicted_risk}`,
            expected: `${error.true_category}/${error.true_risk}`,
          })
          .returning();

        reflectionResults.push(inserted);
      } catch (error) {
        console.error('Error analyzing error:', error);
        // Continue with next error
      }
    }

    const avgReflectorLatency = reflectionResults.length > 0 ? Math.round(totalReflectorLatency / reflectionResults.length) : 0;

    console.log(`✅ Reflector complete: ${reflectionResults.length} reflections, avg ${avgReflectorLatency}ms`);

    // Log Reflector activity
    if (reflectionResults.length > 0) {
      await db.insert(agentLog).values({
        run_id: config.run_id,
        epoch_number: epochNumber,
        agent_type: 'reflector',
        system_prompt: 'Error analysis and insight generation',
        input_summary: `Analyzed ${errorsToAnalyze.length} classification errors`,
        output_summary: `Generated ${reflectionResults.length} reflections. Avg latency: ${avgReflectorLatency}ms`,
        details: {
          reflections: reflectionResults,
          total_latency_ms: totalReflectorLatency,
          avg_latency_ms: avgReflectorLatency,
        },
      });
    }

    // 7. Run Curator to generate new heuristics
    console.log(`📝 Starting Curator: generating heuristics from ${reflectionResults.length} reflections...`);
    let heuristicsAdded = 0;
    const newHeuristics = [];
    let totalCuratorLatency = 0;
    let globalBulletIndex = 0; // Global counter across all reflections

    for (const reflection of reflectionResults) {
      try {
        console.log(`  Processing reflection: ${reflection.error_type} (${reflection.tag})`);
        const { bullets, latency_ms } = await generateHeuristics(reflection, currentPlaybook);

        totalCuratorLatency += latency_ms;

        if (bullets.length === 0) {
          console.warn(`  ⚠️  No heuristics generated for reflection: ${reflection.error_type}`);
        }

        for (let i = 0; i < bullets.length; i++) {
          const bullet = bullets[i];
          globalBulletIndex++; // Increment global counter

          // Extract risk level from bullet content
          const riskMatch = bullet.content.match(/=\s*(CRITICAL|HIGH|MEDIUM|LOW)\s*risk/i);
          const riskLevel = riskMatch ? riskMatch[1].toLowerCase() : 'medium';

          // Generate bullet_id in format: category-risk-r#-e#-globalIndex
          // Using global index to ensure uniqueness across all reflections in the epoch
          const bullet_id = `${bullet.section}-${riskLevel}-r${config.run_id}-e${epochNumber}-${globalBulletIndex}`;

          try {
            const [inserted] = await db
              .insert(playbook)
              .values({
                bullet_id,
                section: bullet.section,
                content: bullet.content,
                helpful_count: 0,
                harmful_count: 0,
                run_id: config.run_id,
                epoch_number: epochNumber,
              })
              .returning();

            newHeuristics.push(inserted);
            heuristicsAdded++;
            console.log(`  ✓ Added heuristic to playbook: [${bullet.section}] ${bullet.content.substring(0, 60)}...`);
          } catch (insertError) {
            console.error(`  ❌ Failed to insert heuristic: ${bullet_id}`);
            console.error(`  Error:`, insertError);
            // Continue with next bullet
          }
        }
      } catch (error) {
        console.error('❌ Error generating heuristics for reflection:', reflection.error_type);
        console.error('Error details:', error);
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

    const avgCuratorLatency = reflectionResults.length > 0 ? Math.round(totalCuratorLatency / reflectionResults.length) : 0;

    console.log(`✅ Curator complete: ${heuristicsAdded} heuristics added, avg ${avgCuratorLatency}ms`);

    // Log Curator activity
    if (heuristicsAdded > 0) {
      await db.insert(agentLog).values({
        run_id: config.run_id,
        epoch_number: epochNumber,
        agent_type: 'curator',
        system_prompt: 'Playbook heuristic generation',
        input_summary: `Processed ${reflectionResults.length} reflections`,
        output_summary: `Added ${heuristicsAdded} new heuristics to playbook. Avg latency: ${avgCuratorLatency}ms`,
        details: {
          new_heuristics: newHeuristics,
          total_latency_ms: totalCuratorLatency,
          avg_latency_ms: avgCuratorLatency,
        },
      });
    }

    console.log(`\n✨ Epoch ${epochNumber} COMPLETE - F1: ${metrics.overall_f1.toFixed(4)}, Accuracy: ${metrics.accuracy.toFixed(4)}\n`);

    return {
      epoch_number: epochNumber,
      status: 'completed',
      metrics,
      message: `Epoch ${epochNumber} completed. F1: ${metrics.overall_f1.toFixed(4)}, Accuracy: ${metrics.accuracy.toFixed(4)}`,
    };
  } catch (error) {
    console.error(`\n❌ Error in training epoch ${epochNumber}:`, error);
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
  console.log(`\n🚀 =======================================`);
  console.log(`🚀 STARTING TRAINING RUN ${runId}`);
  console.log(`🚀 =======================================\n`);

  try {
    // Get training run configuration
    const [run] = await db
      .select()
      .from(trainingRun)
      .where(eq(trainingRun.run_id, runId));

    if (!run) {
      console.log(`❌ Training run ${runId} not found`);
      throw new Error(`Training run ${runId} not found`);
    }

    console.log(`✓ Config: max_epochs=${run.max_epochs}, threshold=${run.plateau_threshold}, patience=${run.plateau_patience}`);

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
      // Check if training was stopped by user
      const [currentRun] = await db
        .select()
        .from(trainingRun)
        .where(eq(trainingRun.run_id, runId));

      if (currentRun.status === 'stopped') {
        console.log(`🛑 Training run ${runId} was stopped by user`);
        return;
      }

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
