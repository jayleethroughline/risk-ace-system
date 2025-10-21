// Metrics calculation utilities for F1 scores

export interface ClassificationMetrics {
  precision: number;
  recall: number;
  f1: number;
  accuracy: number;
  total: number;
}

export interface EvaluationResult {
  category_f1: number;
  risk_f1: number;
  overall_f1: number;
  accuracy: number;
  category_metrics: Record<string, ClassificationMetrics>;
  risk_metrics: Record<string, ClassificationMetrics>;
}

export interface Prediction {
  input_text: string;
  predicted_category: string;
  predicted_risk: string;
  true_category: string;
  true_risk: string;
  heuristics_used?: string[]; // Optional: heuristics cited during classification
}

function calculateMetrics(
  truePositives: number,
  falsePositives: number,
  falseNegatives: number,
  trueNegatives: number
): ClassificationMetrics {
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

  return { precision, recall, f1, accuracy, total };
}

export function evaluatePredictions(
  predictions: Prediction[]
): EvaluationResult {
  if (predictions.length === 0) {
    return {
      category_f1: 0,
      risk_f1: 0,
      overall_f1: 0,
      accuracy: 0,
      category_metrics: {},
      risk_metrics: {},
    };
  }

  // Calculate overall accuracy
  const correct = predictions.filter(
    (p) =>
      p.predicted_category === p.true_category &&
      p.predicted_risk === p.true_risk
  ).length;
  const accuracy = correct / predictions.length;

  // Calculate category-level metrics
  const categories = Array.from(new Set(predictions.map((p) => p.true_category)));
  const categoryMetrics: Record<string, ClassificationMetrics> = {};

  for (const category of categories) {
    const truePositives = predictions.filter(
      (p) =>
        p.true_category === category && p.predicted_category === category
    ).length;

    const falsePositives = predictions.filter(
      (p) =>
        p.true_category !== category && p.predicted_category === category
    ).length;

    const falseNegatives = predictions.filter(
      (p) =>
        p.true_category === category && p.predicted_category !== category
    ).length;

    const trueNegatives = predictions.filter(
      (p) =>
        p.true_category !== category && p.predicted_category !== category
    ).length;

    categoryMetrics[category] = calculateMetrics(
      truePositives,
      falsePositives,
      falseNegatives,
      trueNegatives
    );
  }

  // Calculate risk-level metrics
  const riskLevels = Array.from(new Set(predictions.map((p) => p.true_risk)));
  const riskMetrics: Record<string, ClassificationMetrics> = {};

  for (const risk of riskLevels) {
    const truePositives = predictions.filter(
      (p) => p.true_risk === risk && p.predicted_risk === risk
    ).length;

    const falsePositives = predictions.filter(
      (p) => p.true_risk !== risk && p.predicted_risk === risk
    ).length;

    const falseNegatives = predictions.filter(
      (p) => p.true_risk === risk && p.predicted_risk !== risk
    ).length;

    const trueNegatives = predictions.filter(
      (p) => p.true_risk !== risk && p.predicted_risk !== risk
    ).length;

    riskMetrics[risk] = calculateMetrics(
      truePositives,
      falsePositives,
      falseNegatives,
      trueNegatives
    );
  }

  // Calculate macro-averaged F1 for categories and risks
  const category_f1 =
    Object.values(categoryMetrics).reduce((sum, m) => sum + m.f1, 0) /
    (Object.keys(categoryMetrics).length || 1);

  const risk_f1 =
    Object.values(riskMetrics).reduce((sum, m) => sum + m.f1, 0) /
    (Object.keys(riskMetrics).length || 1);

  // Overall F1 is the average of category and risk F1
  const overall_f1 = (category_f1 + risk_f1) / 2;

  return {
    category_f1,
    risk_f1,
    overall_f1,
    accuracy,
    category_metrics: categoryMetrics,
    risk_metrics: riskMetrics,
  };
}
