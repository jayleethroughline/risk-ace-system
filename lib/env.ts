// Environment variable validation and type-safe access

import { z } from 'zod';

/**
 * Environment variable schema
 */
const envSchema = z.object({
  // Database
  POSTGRES_URL: z.string().url('POSTGRES_URL must be a valid URL'),

  // LLM API
  GEMINI_API_KEY: z.string().min(1, 'GEMINI_API_KEY is required'),

  // Node environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Optional configuration
  PORT: z.coerce.number().positive().default(3000),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

/**
 * Parse and validate environment variables
 * Note: This should be called at application startup
 */
function validateEnv() {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Environment variable validation failed:');
      error.issues.forEach((err) => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
      // Don't throw during build/type-checking
      if (process.env.NODE_ENV !== 'production') {
        console.warn('⚠️  Continuing with invalid environment (development mode)');
        return {} as z.infer<typeof envSchema>;
      }
      throw new Error('Environment validation failed');
    }
    throw error;
  }
}

/**
 * Validated environment variables
 * Use this instead of process.env for type safety
 */
export const env = validateEnv();

/**
 * Helper to check if we're in production
 */
export const isProduction = env.NODE_ENV === 'production';

/**
 * Helper to check if we're in development
 */
export const isDevelopment = env.NODE_ENV === 'development';

/**
 * Helper to check if we're in test mode
 */
export const isTest = env.NODE_ENV === 'test';
