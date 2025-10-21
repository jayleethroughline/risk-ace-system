// Zod validation schemas for API requests

import { z } from 'zod';
import { VALID_CATEGORIES, VALID_RISKS } from './constants';

/**
 * Common query parameter schemas
 */
export const RunIdQuerySchema = z.object({
  run_id: z.coerce.number().positive('run_id must be a positive number'),
});

export const EpochNumberQuerySchema = z.object({
  epoch_number: z.coerce.number().int().nonnegative('epoch_number must be a non-negative integer').optional(),
});

export const AgentTypeQuerySchema = z.object({
  agent_type: z.enum(['generator', 'reflector', 'curator']).optional(),
});

export const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(1000).default(100),
});

/**
 * Training data validation
 */
export const TrainingDataRowSchema = z.object({
  text: z.string().min(1, 'Text cannot be empty'),
  true_category: z.enum(VALID_CATEGORIES as any),
  true_risk: z.enum(VALID_RISKS as any),
});

export const TrainingDataArraySchema = z.array(TrainingDataRowSchema).min(1, 'Dataset must contain at least one sample');

/**
 * Training run creation/update
 */
export const CreateTrainingRunSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name too long'),
  training_data: z.string().min(1, 'Training data is required'),
  eval_data: z.string().min(1, 'Evaluation data is required'),
  max_epochs: z.number().int().positive().max(100).default(10),
  plateau_threshold: z.number().positive().max(1).default(0.01),
  plateau_patience: z.number().int().positive().max(20).default(3),
  auto_start: z.boolean().default(true),
});

/**
 * Playbook bullet validation
 */
export const PlaybookBulletSchema = z.object({
  bullet_id: z.string().min(1),
  section: z.string().min(1),
  content: z.string().min(1, 'Content cannot be empty').max(1000, 'Content too long'),
  helpful_count: z.number().int().nonnegative().default(0),
  harmful_count: z.number().int().nonnegative().default(0),
});

/**
 * Classification prediction
 */
export const ClassificationPredictionSchema = z.object({
  category: z.string(),
  risk_level: z.string(),
  heuristics_used: z.array(z.string()).optional(),
});

/**
 * Helper function to parse query parameters with validation
 */
export function parseQueryParams<T extends z.ZodSchema>(
  url: URL,
  schema: T
): z.infer<T> {
  const params = Object.fromEntries(url.searchParams.entries());
  return schema.parse(params);
}

/**
 * Helper function to parse JSON body with validation
 */
export async function parseBody<T extends z.ZodSchema>(
  req: Request,
  schema: T
): Promise<z.infer<T>> {
  const body = await req.json();
  return schema.parse(body);
}

/**
 * Helper to validate run_id from query params
 */
export function validateRunId(url: URL): number {
  const { run_id } = parseQueryParams(url, RunIdQuerySchema);
  return run_id;
}
