/**
 * Performance Monitoring Service
 * 
 * Tracks Web Vitals and custom performance metrics
 */

interface PerformanceMetric {
  name: string
  value: number
  timestamp: number
  context?: Record<string, any>
}

interface PerformanceMetrics {
  // Core Web Vitals
  lcp?: number          // Largest Contentful Paint
  fid?: number          // First Input Delay
  cls?: number          // Cumulative Layout Shift
  ttfb?: number         // Time to First Byte
  fcp?: number          // First Contentful Paint
  
  // Custom metrics
  aiAnalysisTime?: number
  cacheHitRate?: number
  apiResponseTime?: number
  componentRenderTime?: number
}

class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric[]> = new Map()
  private marks: Map<string, number> = new Map()
  private observers: Map<string, PerformanceObserver> = new Map()
  private isInitialized = false

  /**
   * Initialize performance monitoring
   */
  initialize() {
    if (this.isInitialized) return
    this.isInitialized = true

    // Monitor Core Web Vitals if available
    this.monitorWebVitals()
    
    // Monitor long tasks
    this.monitorLongTasks()
    
    // Monitor resource timing
    this.monitorResourceTiming()
    
    console.log('[Performance] Monitoring initialized')
  }

  /**
   * Start measuring a named operation
   */
  startMeasure(name: string): void {
    this.marks.set(name, performance.now())
    console.log(`[Perf] Started measuring: ${name}`)
  }

  /**
   * End measuring and record the metric
   */
  endMeasure(name: string, context?: Record<string, any>): number {
    const start = this.marks.get(name)
    if (!start) {
      console.warn(`[Perf] No start mark for: ${name}`)
      return 0
    }

    const duration = performance.now() - start
    this.recordMetric(name, duration, context)
    
    // Warn if slow
    if (duration > 100) {
      console.warn(`[Perf] Slow operation: ${name} (${duration.toFixed(2)}ms)`)
    }

    this.marks.delete(name)
    return duration
  }

  /**
   * Record a custom metric
   */
  recordMetric(name: string, value: number, context?: Record<string, any>): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, [])
    }

    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: Date.now(),
      context
    }

    this.metrics.get(name)!.push(metric)
    console.log(`[Perf] ${name}: ${value.toFixed(2)}`)
  }

  /**
   * Monitor Core Web Vitals
   */
  private monitorWebVitals(): void {
    // LCP - Largest Contentful Paint
    if ('PerformanceObserver' in window) {
      try {
        const lcpObserver = new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries()
          const lastEntry = entries[entries.length - 1] as any
          this.recordMetric('lcp', lastEntry.renderTime || lastEntry.loadTime)
        })
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] })
        this.observers.set('lcp', lcpObserver)
      } catch (e) {
        console.warn('[Perf] LCP monitoring not available')
      }

      // CLS - Cumulative Layout Shift
      try {
        let clsValue = 0
        const clsObserver = new PerformanceObserver((entryList) => {
          for (const entry of entryList.getEntries()) {
            if (!(entry as any).hadRecentInput) {
              clsValue += (entry as any).value
              this.recordMetric('cls', clsValue)
            }
          }
        })
        clsObserver.observe({ entryTypes: ['layout-shift'] })
        this.observers.set('cls', clsObserver)
      } catch (e) {
        console.warn('[Perf] CLS monitoring not available')
      }

      // FID - First Input Delay (via PerformanceObserver)
      try {
        const fidObserver = new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries()
          for (const entry of entries) {
            this.recordMetric('fid', (entry as any).processingDuration)
          }
        })
        fidObserver.observe({ entryTypes: ['first-input'] })
        this.observers.set('fid', fidObserver)
      } catch (e) {
        console.warn('[Perf] FID monitoring not available')
      }
    }

    // TTFB - Time to First Byte (from navigation timing)
    if (window.performance && window.performance.timing) {
      const timing = window.performance.timing
      const ttfb = timing.responseStart - timing.navigationStart
      this.recordMetric('ttfb', ttfb)

      // FCP - First Contentful Paint
      if (performance.getEntriesByName) {
        const fcpEntries = performance.getEntriesByName('first-contentful-paint')
        if (fcpEntries.length > 0) {
          this.recordMetric('fcp', (fcpEntries[0] as any).startTime)
        }
      }
    }
  }

  /**
   * Monitor long tasks
   */
  private monitorLongTasks(): void {
    if (!('PerformanceObserver' in window)) return

    try {
      const observer = new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          console.warn(`[Perf] Long task detected: ${entry.duration.toFixed(2)}ms`)
          this.recordMetric('long-task', entry.duration)
        }
      })
      observer.observe({ entryTypes: ['longtask'] })
      this.observers.set('longtask', observer)
    } catch (e) {
      console.warn('[Perf] Long task monitoring not available')
    }
  }

  /**
   * Monitor resource timing
   */
  private monitorResourceTiming(): void {
    if (window.performance && window.performance.getEntriesByType) {
      // Collect resource timing data
      const resources = window.performance.getEntriesByType('resource')
      
      let totalTime = 0
      let cachedCount = 0
      
      for (const resource of resources) {
        const res = resource as PerformanceResourceTiming
        totalTime += res.duration
        
        // Check if from cache
        if (res.transferSize === 0 && res.decodedBodySize > 0) {
          cachedCount++
        }
      }

      const cacheHitRate = resources.length > 0 ? (cachedCount / resources.length) * 100 : 0
      this.recordMetric('cache-hit-rate', cacheHitRate)
      this.recordMetric('total-resource-time', totalTime)
    }
  }

  /**
   * Get all collected metrics
   */
  getMetrics(): Record<string, PerformanceMetric[]> {
    return Object.fromEntries(this.metrics)
  }

  /**
   * Get summary of metrics
   */
  getSummary(): PerformanceMetrics {
    const summary: PerformanceMetrics = {}

    for (const [name, entries] of this.metrics.entries()) {
      if (entries.length > 0) {
        const lastEntry = entries[entries.length - 1]
        ;(summary as any)[name.toLowerCase().replace('-', '')] = lastEntry.value
      }
    }

    return summary
  }

  /**
   * Export metrics to JSON
   */
  exportMetrics(): string {
    const data = {
      timestamp: new Date().toISOString(),
      metrics: this.getMetrics(),
      summary: this.getSummary()
    }
    return JSON.stringify(data, null, 2)
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.metrics.clear()
    this.marks.clear()
  }

  /**
   * Disconnect all observers
   */
  dispose(): void {
    for (const observer of this.observers.values()) {
      observer.disconnect()
    }
    this.observers.clear()
    console.log('[Performance] Monitoring disposed')
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor()

/**
 * React Hook for performance monitoring
 */
import { useEffect } from 'react'

export function usePerformanceMonitoring() {
  useEffect(() => {
    performanceMonitor.initialize()
    
    return () => {
      // Don't dispose on unmount, keep monitoring
    }
  }, [])

  return {
    startMeasure: (name: string) => performanceMonitor.startMeasure(name),
    endMeasure: (name: string) => performanceMonitor.endMeasure(name),
    recordMetric: (name: string, value: number) => performanceMonitor.recordMetric(name, value),
    getMetrics: () => performanceMonitor.getMetrics(),
    getSummary: () => performanceMonitor.getSummary(),
    exportMetrics: () => performanceMonitor.exportMetrics()
  }
}

/**
 * Hook to measure component render time
 */
export function useComponentPerformance(componentName: string) {
  useEffect(() => {
    performanceMonitor.startMeasure(`render-${componentName}`)
    
    return () => {
      performanceMonitor.endMeasure(`render-${componentName}`)
    }
  }, [componentName])
}
