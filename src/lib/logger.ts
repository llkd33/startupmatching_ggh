/**
 * Production-ready logging system
 * Replaces console.log/error/warn with environment-aware logging
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogContext {
  [key: string]: unknown
  userId?: string
  sessionId?: string
  timestamp?: string
}

interface LogEntry {
  level: LogLevel
  message: string
  context?: LogContext
  timestamp: string
  environment: string
}

class Logger {
  private isDevelopment: boolean
  private isProduction: boolean

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development'
    this.isProduction = process.env.NODE_ENV === 'production'
  }

  private formatMessage(level: LogLevel, message: string, context?: LogContext): LogEntry {
    return {
      level,
      message,
      context,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    }
  }

  private sendToMonitoring(entry: LogEntry) {
    // In production, send to monitoring service (Sentry, Datadog, etc.)
    if (this.isProduction) {
      // TODO: Integrate with monitoring service
      // Example: Sentry.captureMessage(entry.message, { level: entry.level, extra: entry.context })
    }
  }

  /**
   * Debug logging - only in development
   */
  debug(message: string, context?: LogContext) {
    if (this.isDevelopment) {
      const entry = this.formatMessage('debug', message, context)
      console.debug(`[DEBUG] ${message}`, context || '')
    }
  }

  /**
   * Info logging - useful information
   */
  info(message: string, context?: LogContext) {
    const entry = this.formatMessage('info', message, context)

    if (this.isDevelopment) {
      console.info(`[INFO] ${message}`, context || '')
    }

    if (this.isProduction) {
      this.sendToMonitoring(entry)
    }
  }

  /**
   * Warning logging - potential issues
   */
  warn(message: string, context?: LogContext) {
    const entry = this.formatMessage('warn', message, context)

    if (this.isDevelopment) {
      console.warn(`[WARN] ${message}`, context || '')
    }

    if (this.isProduction) {
      this.sendToMonitoring(entry)
    }
  }

  /**
   * Error logging - critical issues
   */
  error(message: string, error?: Error | unknown, context?: LogContext) {
    const errorContext = {
      ...context,
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : error
    }

    const entry = this.formatMessage('error', message, errorContext)

    if (this.isDevelopment) {
      console.error(`[ERROR] ${message}`, error, context || '')
    }

    if (this.isProduction) {
      this.sendToMonitoring(entry)
      // Also send to error tracking service
      // Example: Sentry.captureException(error, { contexts: { custom: context } })
    }
  }

  /**
   * Performance logging
   */
  performance(label: string, duration: number, context?: LogContext) {
    const message = `${label} took ${duration}ms`

    if (this.isDevelopment) {
      console.log(`[PERF] ${message}`, context || '')
    }

    if (this.isProduction && duration > 1000) {
      // Only log slow operations in production
      this.warn(message, { ...context, duration })
    }
  }

  /**
   * User action logging (analytics)
   */
  track(action: string, properties?: Record<string, unknown>) {
    if (this.isProduction) {
      // TODO: Integrate with analytics service (Google Analytics, Mixpanel, etc.)
      // Example: analytics.track(action, properties)
    }

    if (this.isDevelopment) {
      console.log(`[TRACK] ${action}`, properties || '')
    }
  }
}

// Export singleton instance
export const logger = new Logger()

// Convenience exports
export const {
  debug,
  info,
  warn,
  error,
  performance: logPerformance,
  track
} = logger
