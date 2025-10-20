import { pgTable, text, integer, serial, timestamp, real, jsonb } from 'drizzle-orm/pg-core';

export const playbook = pgTable('playbook', {
  bullet_id: text('bullet_id').primaryKey(),
  section: text('section'),
  content: text('content'),
  helpful_count: integer('helpful_count').default(0),
  harmful_count: integer('harmful_count').default(0),
  last_updated: timestamp('last_updated').defaultNow(),
});

export const evalLog = pgTable('eval_log', {
  id: serial('id').primaryKey(),
  input_text: text('input_text'),
  predicted_category: text('predicted_category'),
  predicted_risk: text('predicted_risk'),
  true_category: text('true_category'),
  true_risk: text('true_risk'),
  correct: integer('correct'),
  latency_ms: integer('latency_ms'),
  timestamp: timestamp('timestamp').defaultNow(),
});

export const reflections = pgTable('reflections', {
  reflection_id: serial('reflection_id').primaryKey(),
  error_type: text('error_type'),
  correct_approach: text('correct_approach'),
  key_insight: text('key_insight'),
  affected_section: text('affected_section'),
  tag: text('tag'),
  created_at: timestamp('created_at').defaultNow(),
});

// Training orchestration tables
export const trainingRun = pgTable('training_run', {
  run_id: serial('run_id').primaryKey(),
  name: text('name'),
  max_epochs: integer('max_epochs').default(10),
  plateau_threshold: real('plateau_threshold').default(0.01), // 1% improvement
  plateau_patience: integer('plateau_patience').default(3), // epochs to wait
  status: text('status').default('pending'), // pending, running, completed, stopped, failed
  started_at: timestamp('started_at'),
  completed_at: timestamp('completed_at'),
  created_at: timestamp('created_at').defaultNow(),
});

export const epochResult = pgTable('epoch_result', {
  epoch_id: serial('epoch_id').primaryKey(),
  run_id: integer('run_id'),
  epoch_number: integer('epoch_number'),
  category_f1: real('category_f1'),
  risk_f1: real('risk_f1'),
  overall_f1: real('overall_f1'),
  accuracy: real('accuracy'),
  playbook_size: integer('playbook_size'),
  errors_found: integer('errors_found'),
  heuristics_added: integer('heuristics_added'),
  created_at: timestamp('created_at').defaultNow(),
});

export const agentLog = pgTable('agent_log', {
  log_id: serial('log_id').primaryKey(),
  run_id: integer('run_id'),
  epoch_number: integer('epoch_number'),
  agent_type: text('agent_type'), // generator, reflector, curator
  system_prompt: text('system_prompt'),
  input_summary: text('input_summary'),
  output_summary: text('output_summary'),
  details: jsonb('details'), // full data as JSON
  timestamp: timestamp('timestamp').defaultNow(),
});

export const trainingData = pgTable('training_data', {
  data_id: serial('data_id').primaryKey(),
  run_id: integer('run_id'),
  data_type: text('data_type'), // train or eval
  text: text('text'),
  true_category: text('true_category'),
  true_risk: text('true_risk'),
  created_at: timestamp('created_at').defaultNow(),
});
