import { pgTable, text, integer, serial, timestamp } from 'drizzle-orm/pg-core';

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
