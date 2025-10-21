// Configuration constants for the application

// LLM Configuration
export const LLM_CONFIG = {
  model: 'gemini-2.5-flash',
  temperature: 0.7,
  maxOutputTokens: 8192,
} as const;

// Timeout configurations (in milliseconds)
export const TIMEOUTS = {
  // Training run recovery
  HEARTBEAT_STALE_MS: 5 * 60 * 1000, // 5 minutes
  RUN_TIMEOUT_MS: 24 * 60 * 60 * 1000, // 24 hours

  // Polling intervals
  POLL_INTERVAL_MS: 3000, // 3 seconds

  // LLM request timeout
  LLM_REQUEST_TIMEOUT_MS: 60 * 1000, // 60 seconds
} as const;

// Training configuration defaults
export const TRAINING_DEFAULTS = {
  maxEpochs: 10,
  plateauThreshold: 0.01, // 1% improvement
  plateauPatience: 3, // epochs to wait
} as const;

// Database configuration
export const DB_CONFIG = {
  maxPoolSize: 20,
  connectionTimeout: 30000, // 30 seconds
} as const;

// File upload limits
export const UPLOAD_LIMITS = {
  maxFileSize: 10 * 1024 * 1024, // 10MB
  maxDatasetRows: 10000,
} as const;
