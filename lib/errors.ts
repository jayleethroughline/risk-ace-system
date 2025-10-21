// Centralized error handling utilities

import { NextResponse } from 'next/server';

/**
 * Custom API error class with status code and optional details
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiError);
    }
  }
}

/**
 * Predefined error types for common scenarios
 */
export class NotFoundError extends ApiError {
  constructor(resource: string, id?: string | number) {
    super(
      id ? `${resource} with ID ${id} not found` : `${resource} not found`,
      404
    );
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends ApiError {
  constructor(message: string, details?: any) {
    super(message, 400, details);
    this.name = 'ValidationError';
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401);
    this.name = 'UnauthorizedError';
  }
}

export class ConflictError extends ApiError {
  constructor(message: string) {
    super(message, 409);
    this.name = 'ConflictError';
  }
}

/**
 * Centralized error handler for API routes
 * Converts errors to consistent NextResponse format
 */
export function handleApiError(error: unknown): NextResponse {
  console.error('API Error:', error);

  // Handle our custom ApiError instances
  if (error instanceof ApiError) {
    return NextResponse.json(
      {
        error: error.message,
        ...(error.details && { details: error.details })
      },
      { status: error.statusCode }
    );
  }

  // Handle Zod validation errors
  if (error && typeof error === 'object' && 'issues' in error) {
    return NextResponse.json(
      {
        error: 'Validation failed',
        details: error
      },
      { status: 400 }
    );
  }

  // Handle standard Error instances
  if (error instanceof Error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  // Fallback for unknown error types
  return NextResponse.json(
    { error: 'An unexpected error occurred' },
    { status: 500 }
  );
}

/**
 * Wraps an async API handler with error handling
 * Usage: export const GET = withErrorHandling(async (req) => { ... });
 */
export function withErrorHandling(
  handler: (req: Request) => Promise<NextResponse>
) {
  return async (req: Request): Promise<NextResponse> => {
    try {
      return await handler(req);
    } catch (error) {
      return handleApiError(error);
    }
  };
}

/**
 * Asserts that a value is truthy, throws NotFoundError if not
 */
export function assertExists<T>(
  value: T | null | undefined,
  resource: string,
  id?: string | number
): asserts value is T {
  if (!value) {
    throw new NotFoundError(resource, id);
  }
}

/**
 * Safely parses JSON and throws ValidationError if invalid
 */
export function parseJSON<T = any>(jsonString: string, context: string = 'JSON'): T {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    throw new ValidationError(
      `Invalid ${context}: ${error instanceof Error ? error.message : 'Parse error'}`,
      { jsonString }
    );
  }
}
