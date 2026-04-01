import * as Sentry from '@sentry/react'

// Initialize Sentry for error tracking and performance monitoring
export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN

  if (!dsn) {
    console.warn('[Sentry] DSN not configured. Error tracking is disabled.')
    return
  }

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE || 'development',
    
    // Performance monitoring
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
    
    // Session replay for debugging
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,

    // Integration options
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],

    // Filter out known non-critical errors
    beforeSend(event, hint) {
      const error = hint.originalException

      // Ignore network errors that are expected
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        return null
      }

      // Ignore user-initiated aborts
      if (error instanceof DOMException && error.name === 'AbortError') {
        return null
      }

      return event
    },

    // Add custom tags
    initialScope: {
      tags: {
        app: 'gemini-stocks',
        version: '1.0.0',
      },
    },
  })

  console.log('[Sentry] Initialized successfully')
}

// Custom error boundary wrapper
export const SentryErrorBoundary = Sentry.ErrorBoundary

// Manual error capture utilities
export function captureError(error: Error, context?: Record<string, any>) {
  Sentry.captureException(error, {
    extra: context,
  })
}

export function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info') {
  Sentry.captureMessage(message, level)
}

// Set user context for better debugging
export function setUserContext(userId: string, extra?: Record<string, any>) {
  Sentry.setUser({
    id: userId,
    ...extra,
  })
}

// Add breadcrumb for tracking user actions
export function addBreadcrumb(
  category: string, 
  message: string, 
  data?: Record<string, any>
) {
  Sentry.addBreadcrumb({
    category,
    message,
    data,
    level: 'info',
  })
}

// Performance transaction helpers
export function startTransaction(name: string, op: string) {
  return Sentry.startSpan({ name, op }, () => {})
}

// Re-export Sentry for direct access if needed
export { Sentry }
