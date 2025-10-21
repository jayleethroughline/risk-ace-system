// Centralized logging utility with consistent formatting

/**
 * Log levels for different types of messages
 */
export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  SUCCESS = 'SUCCESS',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

/**
 * Emoji prefixes for different log levels
 */
const LOG_PREFIXES = {
  [LogLevel.DEBUG]: '🔍',
  [LogLevel.INFO]: 'ℹ️ ',
  [LogLevel.SUCCESS]: '✅',
  [LogLevel.WARN]: '⚠️ ',
  [LogLevel.ERROR]: '❌',
} as const;

/**
 * Logger interface
 */
export interface Logger {
  debug(message: string, ...args: any[]): void;
  info(message: string, ...args: any[]): void;
  success(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, error?: any): void;
  group(label: string): void;
  groupEnd(): void;
}

/**
 * Creates a formatted log message
 */
function formatMessage(level: LogLevel, message: string): string {
  const timestamp = new Date().toISOString();
  const prefix = LOG_PREFIXES[level];
  return `${prefix} [${timestamp}] ${message}`;
}

/**
 * Main logger implementation
 */
class ConsoleLogger implements Logger {
  debug(message: string, ...args: any[]): void {
    if (process.env.NODE_ENV === 'development') {
      console.log(formatMessage(LogLevel.DEBUG, message), ...args);
    }
  }

  info(message: string, ...args: any[]): void {
    console.log(formatMessage(LogLevel.INFO, message), ...args);
  }

  success(message: string, ...args: any[]): void {
    console.log(formatMessage(LogLevel.SUCCESS, message), ...args);
  }

  warn(message: string, ...args: any[]): void {
    console.warn(formatMessage(LogLevel.WARN, message), ...args);
  }

  error(message: string, error?: any): void {
    console.error(formatMessage(LogLevel.ERROR, message));
    if (error) {
      console.error(error);
    }
  }

  group(label: string): void {
    console.group(`\n${LOG_PREFIXES[LogLevel.INFO]} ${label}`);
  }

  groupEnd(): void {
    console.groupEnd();
    console.log(''); // Add blank line after group
  }
}

/**
 * Default logger instance
 */
export const logger: Logger = new ConsoleLogger();

/**
 * Creates a scoped logger with a prefix
 */
export function createScopedLogger(scope: string): Logger {
  return {
    debug: (message: string, ...args: any[]) => logger.debug(`[${scope}] ${message}`, ...args),
    info: (message: string, ...args: any[]) => logger.info(`[${scope}] ${message}`, ...args),
    success: (message: string, ...args: any[]) => logger.success(`[${scope}] ${message}`, ...args),
    warn: (message: string, ...args: any[]) => logger.warn(`[${scope}] ${message}`, ...args),
    error: (message: string, error?: any) => logger.error(`[${scope}] ${message}`, error),
    group: (label: string) => logger.group(`[${scope}] ${label}`),
    groupEnd: () => logger.groupEnd(),
  };
}

/**
 * Helper to log training progress
 */
export function logTrainingProgress(
  runId: number,
  epoch: number,
  phase: 'generator' | 'reflector' | 'curator' | 'evaluation',
  message: string
): void {
  logger.info(`[Run ${runId}] [Epoch ${epoch}] [${phase.toUpperCase()}] ${message}`);
}

/**
 * Helper to log agent execution
 */
export function logAgentExecution(
  agent: 'generator' | 'reflector' | 'curator',
  action: string,
  details?: string
): void {
  logger.info(`[${agent.toUpperCase()}] ${action}${details ? `: ${details}` : ''}`);
}
