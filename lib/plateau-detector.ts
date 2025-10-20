// Plateau detection logic for training orchestration

export interface EpochResult {
  epoch_number: number;
  overall_f1: number;
  category_f1: number;
  risk_f1: number;
}

export interface PlateauConfig {
  threshold: number; // minimum improvement required (e.g., 0.01 = 1%)
  patience: number; // number of epochs to wait before stopping
}

export interface PlateauStatus {
  should_stop: boolean;
  epochs_without_improvement: number;
  best_epoch: number;
  best_f1: number;
  current_f1: number;
  improvement: number;
  message: string;
}

/**
 * Detects if training has plateaued based on F1 score improvements
 * @param epochResults - Array of epoch results sorted by epoch_number ascending
 * @param config - Plateau detection configuration
 * @returns Status indicating whether training should stop
 */
export function detectPlateau(
  epochResults: EpochResult[],
  config: PlateauConfig
): PlateauStatus {
  if (epochResults.length === 0) {
    return {
      should_stop: false,
      epochs_without_improvement: 0,
      best_epoch: 0,
      best_f1: 0,
      current_f1: 0,
      improvement: 0,
      message: 'No epochs yet',
    };
  }

  if (epochResults.length === 1) {
    return {
      should_stop: false,
      epochs_without_improvement: 0,
      best_epoch: epochResults[0].epoch_number,
      best_f1: epochResults[0].overall_f1,
      current_f1: epochResults[0].overall_f1,
      improvement: 0,
      message: 'First epoch completed',
    };
  }

  // Find best F1 score and when it occurred
  let bestF1 = -Infinity;
  let bestEpoch = 0;

  for (const result of epochResults) {
    if (result.overall_f1 > bestF1) {
      bestF1 = result.overall_f1;
      bestEpoch = result.epoch_number;
    }
  }

  const currentResult = epochResults[epochResults.length - 1];
  const currentF1 = currentResult.overall_f1;

  // Calculate improvement from best
  const improvement = currentF1 - bestF1;

  // Count epochs without improvement
  let epochsWithoutImprovement = 0;
  for (let i = epochResults.length - 1; i >= 0; i--) {
    const result = epochResults[i];
    if (result.epoch_number === bestEpoch) {
      break;
    }
    epochsWithoutImprovement++;
  }

  // Check if we should stop
  const shouldStop = epochsWithoutImprovement >= config.patience;

  let message = '';
  if (shouldStop) {
    message = `Training plateaued. No improvement above ${(config.threshold * 100).toFixed(1)}% for ${config.patience} epochs.`;
  } else if (improvement >= config.threshold) {
    message = `New best F1: ${currentF1.toFixed(4)} (improvement: +${(improvement * 100).toFixed(2)}%)`;
  } else {
    message = `No significant improvement. ${config.patience - epochsWithoutImprovement} epochs remaining before stop.`;
  }

  return {
    should_stop: shouldStop,
    epochs_without_improvement: epochsWithoutImprovement,
    best_epoch: bestEpoch,
    best_f1: bestF1,
    current_f1: currentF1,
    improvement,
    message,
  };
}

/**
 * Helper to determine if training should continue
 * @param epochResults - Array of epoch results
 * @param maxEpochs - Maximum number of epochs allowed
 * @param config - Plateau detection configuration
 * @returns Whether training should continue
 */
export function shouldContinueTraining(
  epochResults: EpochResult[],
  maxEpochs: number,
  config: PlateauConfig
): { continue: boolean; reason: string } {
  const currentEpoch = epochResults.length;

  // Check if max epochs reached
  if (currentEpoch >= maxEpochs) {
    return {
      continue: false,
      reason: `Maximum epochs (${maxEpochs}) reached`,
    };
  }

  // Check for plateau
  const plateauStatus = detectPlateau(epochResults, config);
  if (plateauStatus.should_stop) {
    return {
      continue: false,
      reason: plateauStatus.message,
    };
  }

  return {
    continue: true,
    reason: `Training in progress: epoch ${currentEpoch}/${maxEpochs}`,
  };
}
