/**
 * Monitoring Service - 应用监控和错误追踪
 * 
 * 功能:
 * - 错误捕获和上报
 * - 性能指标追踪
 * - 用户行为分析
 * - 自定义事件记录
 */

// 监控配置
interface MonitoringConfig {
  enabled: boolean
  environment: string
  version: string
  sampleRate: number
  debug: boolean
}

// 错误信息
interface ErrorInfo {
  message: string
  stack?: string
  componentStack?: string
  userId?: string
  extra?: Record<string, unknown>
}

// 性能指标
interface PerformanceMetric {
  name: string
  value: number
  unit: 'ms' | 's' | 'bytes' | 'count'
  tags?: Record<string, string>
}

// 用户事件
interface UserEvent {
  name: string
  category: 'auth' | 'analysis' | 'payment' | 'navigation' | 'error'
  properties?: Record<string, unknown>
}

// 监控实例
class MonitoringService {
  private config: MonitoringConfig
  private userId: string | null = null
  private sessionId: string
  private performanceBuffer: PerformanceMetric[] = []
  private eventBuffer: UserEvent[] = []
  private flushInterval: NodeJS.Timeout | null = null

  constructor() {
    this.config = {
      enabled: import.meta.env.VITE_SENTRY_DSN ? true : false,
      environment: import.meta.env.VITE_SENTRY_ENVIRONMENT || 'development',
      version: import.meta.env.VITE_APP_VERSION || '1.0.0',
      sampleRate: parseFloat(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE || '0.1'),
      debug: import.meta.env.VITE_DEBUG_MODE === 'true'
    }

    this.sessionId = this.generateSessionId()
    
    if (this.config.enabled) {
      this.initSentry()
      this.setupErrorHandlers()
      this.startFlushInterval()
    }
  }

  /**
   * 初始化 Sentry
   */
  private async initSentry() {
    try {
      const Sentry = await import('@sentry/browser')
      
      Sentry.init({
        dsn: import.meta.env.VITE_SENTRY_DSN,
        environment: this.config.environment,
        release: `gemini-stocks@${this.config.version}`,
        tracesSampleRate: this.config.sampleRate,
        debug: this.config.debug,
        
        // 集成配置
        integrations: [
          Sentry.browserTracingIntegration(),
          Sentry.replayIntegration({
            maskAllText: false,
            blockAllMedia: false,
          }),
        ],
        
        // 会话重放采样率
        replaysSessionSampleRate: 0.1,
        replaysOnErrorSampleRate: 1.0,
        
        // 错误过滤
        beforeSend(event) {
          // 过滤掉已知的无害错误
          if (event.exception?.values?.[0]?.value?.includes('ResizeObserver')) {
            return null
          }
          return event
        },
        
        // 性能采样
        beforeSendTransaction(event) {
          // 可以在这里修改或过滤性能事件
          return event
        }
      })

      if (this.config.debug) {
        console.log('[Monitoring] Sentry initialized')
      }
    } catch (error) {
      console.warn('[Monitoring] Failed to initialize Sentry:', error)
    }
  }

  /**
   * 设置全局错误处理器
   */
  private setupErrorHandlers() {
    // 未捕获的错误
    window.onerror = (message, source, lineno, colno, error) => {
      this.captureError({
        message: String(message),
        stack: error?.stack,
        extra: { source, lineno, colno }
      })
    }

    // Promise 拒绝
    window.onunhandledrejection = (event) => {
      this.captureError({
        message: `Unhandled Promise Rejection: ${event.reason}`,
        stack: event.reason?.stack,
        extra: { type: 'unhandledrejection' }
      })
    }

    // React 错误边界会调用 captureError
  }

  /**
   * 启动定期刷新
   */
  private startFlushInterval() {
    this.flushInterval = setInterval(() => {
      this.flush()
    }, 30000) // 每 30 秒刷新一次
  }

  /**
   * 生成会话 ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * 设置用户 ID
   */
  setUser(userId: string | null, email?: string, username?: string) {
    this.userId = userId

    if (this.config.enabled && userId) {
      import('@sentry/browser').then(Sentry => {
        Sentry.setUser({
          id: userId,
          email,
          username
        })
      })
    }
  }

  /**
   * 清除用户信息
   */
  clearUser() {
    this.userId = null

    if (this.config.enabled) {
      import('@sentry/browser').then(Sentry => {
        Sentry.setUser(null)
      })
    }
  }

  /**
   * 捕获错误
   */
  captureError(error: ErrorInfo) {
    if (!this.config.enabled) {
      if (this.config.debug) {
        console.error('[Monitoring] Error:', error)
      }
      return
    }

    import('@sentry/browser').then(Sentry => {
      Sentry.captureException(new Error(error.message), {
        extra: {
          ...error.extra,
          componentStack: error.componentStack,
          userId: this.userId,
          sessionId: this.sessionId
        }
      })
    })

    // 记录到事件缓冲
    this.trackEvent({
      name: 'error_captured',
      category: 'error',
      properties: {
        message: error.message,
        ...error.extra
      }
    })
  }

  /**
   * 捕获消息
   */
  captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info') {
    if (!this.config.enabled) {
      if (this.config.debug) {
        console.log(`[Monitoring] ${level.toUpperCase()}: ${message}`)
      }
      return
    }

    import('@sentry/browser').then(Sentry => {
      Sentry.captureMessage(message, level)
    })
  }

  /**
   * 记录性能指标
   */
  trackPerformance(metric: PerformanceMetric) {
    this.performanceBuffer.push({
      ...metric,
      tags: {
        ...metric.tags,
        sessionId: this.sessionId,
        userId: this.userId || 'anonymous'
      }
    })

    if (this.config.debug) {
      console.log('[Monitoring] Performance:', metric)
    }

    // 如果缓冲区过大，立即刷新
    if (this.performanceBuffer.length >= 50) {
      this.flush()
    }
  }

  /**
   * 记录用户事件
   */
  trackEvent(event: UserEvent) {
    this.eventBuffer.push(event)

    if (this.config.enabled) {
      import('@sentry/browser').then(Sentry => {
        Sentry.addBreadcrumb({
          category: event.category,
          message: event.name,
          data: event.properties,
          level: 'info'
        })
      })
    }

    if (this.config.debug) {
      console.log('[Monitoring] Event:', event)
    }

    // 如果缓冲区过大，立即刷新
    if (this.eventBuffer.length >= 100) {
      this.flush()
    }
  }

  /**
   * 开始性能追踪
   */
  startTransaction(name: string, operation: string) {
    if (!this.config.enabled) {
      return { finish: () => {} }
    }

    const startTime = performance.now()

    return {
      finish: () => {
        const duration = performance.now() - startTime
        this.trackPerformance({
          name,
          value: duration,
          unit: 'ms',
          tags: { operation }
        })
      }
    }
  }

  /**
   * 测量函数执行时间
   */
  async measure<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const transaction = this.startTransaction(name, 'function')
    try {
      return await fn()
    } finally {
      transaction.finish()
    }
  }

  /**
   * 刷新缓冲区
   */
  private flush() {
    if (this.performanceBuffer.length > 0) {
      // 在生产环境可以发送到分析服务
      if (this.config.debug) {
        console.log('[Monitoring] Flushing performance buffer:', this.performanceBuffer.length)
      }
      this.performanceBuffer = []
    }

    if (this.eventBuffer.length > 0) {
      if (this.config.debug) {
        console.log('[Monitoring] Flushing event buffer:', this.eventBuffer.length)
      }
      this.eventBuffer = []
    }
  }

  /**
   * 清理资源
   */
  destroy() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval)
    }
    this.flush()
  }
}

// 导出单例
export const monitoring = new MonitoringService()

// 便捷函数
export const captureError = monitoring.captureError.bind(monitoring)
export const captureMessage = monitoring.captureMessage.bind(monitoring)
export const trackPerformance = monitoring.trackPerformance.bind(monitoring)
export const trackEvent = monitoring.trackEvent.bind(monitoring)
export const startTransaction = monitoring.startTransaction.bind(monitoring)
export const measure = monitoring.measure.bind(monitoring)
export const setMonitoringUser = monitoring.setUser.bind(monitoring)
export const clearMonitoringUser = monitoring.clearUser.bind(monitoring)

// React 错误边界辅助
export function captureReactError(
  error: Error,
  errorInfo: { componentStack: string }
) {
  monitoring.captureError({
    message: error.message,
    stack: error.stack,
    componentStack: errorInfo.componentStack
  })
}

// 性能指标辅助
export function trackPageLoad() {
  if (typeof window !== 'undefined' && window.performance) {
    const timing = window.performance.timing
    const loadTime = timing.loadEventEnd - timing.navigationStart
    
    if (loadTime > 0) {
      trackPerformance({
        name: 'page_load',
        value: loadTime,
        unit: 'ms'
      })
    }
  }
}

// 自动追踪页面加载
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    setTimeout(trackPageLoad, 0)
  })
}

export default monitoring
