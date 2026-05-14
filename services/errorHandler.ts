/**
 * Unified Error Handler Service
 * 
 * Centralizes error handling and classification
 */

import { captureError, addBreadcrumb } from './sentry'

/**
 * Error classification types
 */
export enum ErrorType {
  ValidationError = 'VALIDATION_ERROR',
  NetworkError = 'NETWORK_ERROR',
  AuthError = 'AUTH_ERROR',
  NotFoundError = 'NOT_FOUND_ERROR',
  RateLimitError = 'RATE_LIMIT_ERROR',
  ServerError = 'SERVER_ERROR',
  PaymentError = 'PAYMENT_ERROR',
  CacheError = 'CACHE_ERROR',
  UnknownError = 'UNKNOWN_ERROR'
}

/**
 * Custom error class with classification
 */
export class AppError extends Error {
  constructor(
    public type: ErrorType,
    message: string,
    public statusCode?: number,
    public context?: Record<string, any>
  ) {
    super(message)
    this.name = 'AppError'
  }

  toUserMessage(): string {
    const messages: Record<ErrorType, string> = {
      [ErrorType.ValidationError]: '输入无效，请检查后重试',
      [ErrorType.NetworkError]: '网络连接失败，请检查网络',
      [ErrorType.AuthError]: '认证失败，请重新登录',
      [ErrorType.NotFoundError]: '请求的资源不存在',
      [ErrorType.RateLimitError]: '请求过于频繁，请稍后重试',
      [ErrorType.ServerError]: '服务器错误，请稍后重试',
      [ErrorType.PaymentError]: '支付处理失败，请重试',
      [ErrorType.CacheError]: '缓存读取失败，请刷新页面',
      [ErrorType.UnknownError]: '发生未知错误，请重试'
    }
    return messages[this.type]
  }
}

/**
 * Error handler function
 */
export function handleError(
  error: any,
  namespace: string,
  context?: Record<string, any>
): AppError {
  console.error(`[ErrorHandler] Error in ${namespace}:`, error)

  // Classify error
  let appError: AppError

  if (error instanceof AppError) {
    appError = error
  } else if (error instanceof TypeError) {
    appError = new AppError(
      ErrorType.ValidationError,
      `类型错误: ${error.message}`,
      400,
      context
    )
  } else if (error instanceof RangeError) {
    appError = new AppError(
      ErrorType.ValidationError,
      `值范围错误: ${error.message}`,
      400,
      context
    )
  } else if (error instanceof SyntaxError) {
    appError = new AppError(
      ErrorType.ServerError,
      `服务器返回无效数据: ${error.message}`,
      500,
      context
    )
  } else if (error?.code === 'ECONNREFUSED') {
    appError = new AppError(
      ErrorType.NetworkError,
      '无法连接到服务器',
      503,
      context
    )
  } else if (error?.status === 401) {
    appError = new AppError(
      ErrorType.AuthError,
      '未授权，请重新登录',
      401,
      context
    )
  } else if (error?.status === 404) {
    appError = new AppError(
      ErrorType.NotFoundError,
      '资源不存在',
      404,
      context
    )
  } else if (error?.status === 429) {
    appError = new AppError(
      ErrorType.RateLimitError,
      '请求过于频繁，请稍后重试',
      429,
      context
    )
  } else if (error?.status >= 500) {
    appError = new AppError(
      ErrorType.ServerError,
      `服务器错误 (${error.status}): ${error.message}`,
      error.status,
      context
    )
  } else if (error instanceof DOMException && error.name === 'AbortError') {
    appError = new AppError(
      ErrorType.UnknownError,
      '操作已取消',
      0,
      context
    )
  } else {
    appError = new AppError(
      ErrorType.UnknownError,
      error?.message || '发生未知错误',
      error?.statusCode || 500,
      context
    )
  }

  // Add breadcrumb for tracking
  addBreadcrumb(namespace, 'error', {
    type: appError.type,
    message: appError.message,
    statusCode: appError.statusCode,
    ...context
  })

  // Report to Sentry
  captureError(appError, {
    namespace,
    type: appError.type,
    ...context
  })

  return appError
}

/**
 * Async error wrapper for try-catch elimination
 */
export function withErrorHandler<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  namespace: string
) {
  return async (...args: T): Promise<R | null> => {
    try {
      return await fn(...args)
    } catch (error) {
      handleError(error, namespace, { args })
      return null
    }
  }
}

/**
 * React hook for error handling
 */
import { useState, useCallback } from 'react'

export function useErrorHandler() {
  const [error, setError] = useState<AppError | null>(null)

  const handleError_ = useCallback((err: any, namespace: string, context?: Record<string, any>) => {
    const appError = handleError(err, namespace, context)
    setError(appError)
    return appError
  }, [])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    error,
    handleError: handleError_,
    clearError,
    errorMessage: error?.toUserMessage() ?? null
  }
}

/**
 * Error boundary wrapper for components
 */
export class ErrorBoundary extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ErrorBoundary'
  }
}
