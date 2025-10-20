import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { evalLog } from '@/lib/schema';
import { sql } from 'drizzle-orm';

interface MetricsResult {
  precision: number;
  recall: number;
  f1: number;
  accuracy: number;
  total: number;
}

function calculateMetrics(
  truePositives: number,
  falsePositives: number,
  falseNegatives: number,
  trueNegatives: number
): MetricsResult {
  const precision =
    truePositives + falsePositives > 0
      ? truePositives / (truePositives + falsePositives)
      : 0;

  const recall =
    truePositives + falseNegatives > 0
      ? truePositives / (truePositives + falseNegatives)
      : 0;

  const f1 =
    precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

  const total = truePositives + trueNegatives + falsePositives + falseNegatives;
  const accuracy = total > 0 ? (truePositives + trueNegatives) / total : 0;

  return {
    precision: Math.round(precision * 1000) / 1000,
    recall: Math.round(recall * 1000) / 1000,
    f1: Math.round(f1 * 1000) / 1000,
    accuracy: Math.round(accuracy * 1000) / 1000,
    total,
  };
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const metricType = searchParams.get('type') || 'overall'; // overall, category, risk

    // Get all evaluation logs
    const logs = await db.select().from(evalLog);

    if (logs.length === 0) {
      return NextResponse.json({
        message: 'No evaluation data available',
        metrics: null,
      });
    }

    if (metricType === 'overall') {
      // Calculate overall accuracy
      const correct = logs.filter((log) => log.correct === 1).length;
      const total = logs.length;
      const accuracy = total > 0 ? correct / total : 0;

      // Calculate average latency
      const logsWithLatency = logs.filter((log) => log.latency_ms !== null);
      const avgLatency = logsWithLatency.length > 0
        ? Math.round(logsWithLatency.reduce((sum, log) => sum + (log.latency_ms || 0), 0) / logsWithLatency.length)
        : null;

      return NextResponse.json({
        overall: {
          accuracy: Math.round(accuracy * 1000) / 1000,
          correct,
          total,
          avg_latency_ms: avgLatency,
        },
      });
    }

    if (metricType === 'category') {
      // Calculate category-level metrics
      const categoryMetrics: Record<string, any> = {};

      // Get unique categories
      const categories = [...new Set(logs.map((log) => log.true_category))];

      for (const category of categories) {
        if (!category) continue;

        const truePositives = logs.filter(
          (log) =>
            log.true_category === category && log.predicted_category === category
        ).length;

        const falsePositives = logs.filter(
          (log) =>
            log.true_category !== category && log.predicted_category === category
        ).length;

        const falseNegatives = logs.filter(
          (log) =>
            log.true_category === category && log.predicted_category !== category
        ).length;

        const trueNegatives = logs.filter(
          (log) =>
            log.true_category !== category && log.predicted_category !== category
        ).length;

        categoryMetrics[category] = calculateMetrics(
          truePositives,
          falsePositives,
          falseNegatives,
          trueNegatives
        );
      }

      // Calculate macro-averaged F1
      const f1Scores = Object.values(categoryMetrics).map(
        (m: any) => m.f1
      );
      const macroF1 =
        f1Scores.length > 0
          ? f1Scores.reduce((a, b) => a + b, 0) / f1Scores.length
          : 0;

      return NextResponse.json({
        category_metrics: categoryMetrics,
        macro_f1: Math.round(macroF1 * 1000) / 1000,
      });
    }

    if (metricType === 'risk') {
      // Calculate risk-level metrics
      const riskMetrics: Record<string, any> = {};

      // Get unique risk levels
      const riskLevels = [...new Set(logs.map((log) => log.true_risk))];

      for (const risk of riskLevels) {
        if (!risk) continue;

        const truePositives = logs.filter(
          (log) => log.true_risk === risk && log.predicted_risk === risk
        ).length;

        const falsePositives = logs.filter(
          (log) => log.true_risk !== risk && log.predicted_risk === risk
        ).length;

        const falseNegatives = logs.filter(
          (log) => log.true_risk === risk && log.predicted_risk !== risk
        ).length;

        const trueNegatives = logs.filter(
          (log) => log.true_risk !== risk && log.predicted_risk !== risk
        ).length;

        riskMetrics[risk] = calculateMetrics(
          truePositives,
          falsePositives,
          falseNegatives,
          trueNegatives
        );
      }

      // Calculate macro-averaged F1
      const f1Scores = Object.values(riskMetrics).map((m: any) => m.f1);
      const macroF1 =
        f1Scores.length > 0
          ? f1Scores.reduce((a, b) => a + b, 0) / f1Scores.length
          : 0;

      return NextResponse.json({
        risk_metrics: riskMetrics,
        macro_f1: Math.round(macroF1 * 1000) / 1000,
      });
    }

    return NextResponse.json(
      { error: 'Invalid metric type' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error in evaluate route:', error);
    return NextResponse.json(
      { error: 'Failed to calculate metrics' },
      { status: 500 }
    );
  }
}
