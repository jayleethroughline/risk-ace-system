// Shared TypeScript types and interfaces for the application

// ============================================================================
// Training & Epochs
// ============================================================================

export interface EpochData {
  epoch_number: number;
  overall_f1: number;
  category_f1: number;
  risk_f1: number;
  accuracy: number;
  playbook_size: number;
  errors_found: number;
  heuristics_added: number;
}

export interface TrainingStatus {
  run_id: number;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'stopped' | 'failed';
  started_at: string | null;
  completed_at: string | null;
  failure_reason?: string | null;
  config: {
    max_epochs: number;
    plateau_threshold: number;
    plateau_patience: number;
  };
  dataset: {
    training_samples: number;
    eval_samples: number;
  };
  progress: {
    current_epoch: number;
    max_epochs: number;
    progress_percent: number;
  };
  epochs: EpochData[];
  best_epoch: {
    epoch_number: number;
    overall_f1: number;
    category_f1: number;
    risk_f1: number;
    accuracy: number;
  } | null;
  plateau_status: PlateauStatus | null;
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

export interface TrainingRunSummary {
  run_id: number;
  name: string;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  failure_reason?: string | null;
  best_epoch: {
    epoch_number: number;
    overall_f1: number;
    category_f1: number;
    risk_f1: number;
    accuracy: number;
  } | null;
  epochs: EpochData[];
  dataset: {
    training_samples: number;
    eval_samples: number;
  };
}

// ============================================================================
// Agent Logs
// ============================================================================

export interface AgentLog {
  log_id: number;
  run_id: number;
  epoch_number: number;
  agent_type: 'generator' | 'reflector' | 'curator';
  system_prompt: string;
  input_summary: string;
  output_summary: string;
  details: any; // JSON field containing raw agent output
  timestamp: string;
}

// ============================================================================
// Reflections & Heuristics
// ============================================================================

export interface Reflection {
  reflection_id: number;
  run_id: number;
  epoch_number: number;
  error_type: string;
  correct_approach: string;
  key_insight: string;
  affected_section: string;
  tag: string;
  input_text: string;
  predicted: string;
  expected: string;
  created_at: string;
}

export interface Heuristic {
  bullet_id: string;
  section: string;
  content: string;
  helpful_count: number;
  harmful_count: number;
  run_id: number | null;
  epoch_number: number | null;
  last_updated: string;
}

// ============================================================================
// Dataset & Predictions
// ============================================================================

export interface DatasetSample {
  data_id: number;
  run_id: number;
  data_type: 'train' | 'eval';
  text: string;
  true_category: string;
  true_risk: string;
  created_at?: string;
}

export interface DatasetData {
  run_id: number;
  train: DatasetSample[];
  eval: DatasetSample[];
}

export interface Prediction {
  input_text: string;
  predicted_category: string;
  predicted_risk: string;
  true_category: string;
  true_risk: string;
  heuristics_used?: string[];
}

// ============================================================================
// Metrics & Evaluation
// ============================================================================

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

// ============================================================================
// API Responses
// ============================================================================

export interface ApiResponse<T = any> {
  success?: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
