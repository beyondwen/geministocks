// Sentry integration with graceful fallback when not installed
// Note: Sentry is optional - the app works fine without it

let Sentry: any = null
let isSentryInitialized = false

// Dynamically try to load Sentry, but gracefully handle if not installed
async function loadSentry() {
  if (isSentryInitialized) return
  isSentryInitialized = true

  try {
    // @ts-ignore - Sentry is optional
    const sentryModule = await import('@sentry/react')
    Sentry = sentryModule.default || sentryModule
  } catch (error) {
    console.info('[Sentry] Not installed or import failed. Error tracking disabled.')
    Sentry = null
  }
}

// Initialize Sentry for error tracking and performance monitoring
export function initSentry() {
  if (!Sentry) {
    const dsn = import.meta.env.VITE_SENTRY_DSN

    if (!dsn) {
      console.info('[Sentry] DSN not configured. Error tracking is disabled.')
      return
    }

    console.warn('[Sentry] Package not available. Error tracking is disabled.')
    return
  }

  const dsn = import.meta.env.VITE_SENTRY_DSN

  if (!dsn) {
    console.info('[Sentry] DSN not configured. Error tracking is disabled.')
    return
  }

  try {
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
      beforeSend(event: any, hint: any) {
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
  } catch (error) {
    console.warn('[Sentry] Initialization failed:', error)
  }
}

// Custom error boundary wrapper - fallback if Sentry not available
export const SentryErrorBoundary = Sentry?.ErrorBoundary || function DefaultErrorBoundary(props: any) {
  return props.children
}

// Manual error capture utilities with graceful fallback
export function captureError(error: Error, context?: Record<string, any>) {
  if (Sentry?.captureException) {
    Sentry.captureException(error, { extra: context })
  } else {
    console.error('[Error Captured]', error, context)
  }
}

export function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info') {
  if (Sentry?.captureMessage) {
    Sentry.captureMessage(message, level)
  } else {
    console.log(`[${level.toUpperCase()}]`, message)
  }
}

// Set user context for better debugging
export function setUserContext(userId: string, extra?: Record<string, any>) {
  if (Sentry?.setUser) {
    Sentry.setUser({
      id: userId,
      ...extra,
    })
  }
}

// Add breadcrumb for tracking user actions
export function addBreadcrumb(
  category: string,
  message: string,
  data?: Record<string, any>
) {
  if (Sentry?.addBreadcrumb) {
    Sentry.addBreadcrumb({
      category,
      message,
      data,
      level: 'info',
    })
  }
}

// Performance transaction helpers
export function startTransaction(name: string, op: string) {
  if (Sentry?.startSpan) {
    return Sentry.startSpan({ name, op }, () => {})
  }
  return null
}

// Initialize Sentry on module load (try-catch to handle missing package)
loadSentry().catch(() => {
  // Silently fail if Sentry not installed
})
