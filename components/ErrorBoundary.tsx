import React, { Component, ErrorInfo, ReactNode } from 'react'
import { captureReactError, trackEvent } from '../services/monitoringService'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

/**
 * React 错误边界组件
 * 捕获子组件树中的 JavaScript 错误，记录错误并显示备用 UI
 */
class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // 记录错误到监控服务
    captureReactError(error, errorInfo)
    
    // 记录事件
    trackEvent({
      name: 'react_error_boundary_triggered',
      category: 'error',
      properties: {
        errorMessage: error.message,
        componentStack: errorInfo.componentStack
      }
    })

    // 更新状态
    this.setState({ errorInfo })

    // 调用自定义错误处理
    this.props.onError?.(error, errorInfo)

    // 控制台输出
    console.error('[ErrorBoundary] Caught error:', error)
    console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack)
  }

  handleRetry = () => {
    trackEvent({
      name: 'error_boundary_retry',
      category: 'navigation'
    })
    
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    })
  }

  handleReload = () => {
    trackEvent({
      name: 'error_boundary_reload',
      category: 'navigation'
    })
    
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      // 如果提供了自定义 fallback，使用它
      if (this.props.fallback) {
        return this.props.fallback
      }

      // 默认错误 UI
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
            {/* 错误图标 */}
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg 
                className="w-8 h-8 text-red-600" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
                />
              </svg>
            </div>

            {/* 错误标题 */}
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              出了点问题
            </h2>

            {/* 错误描述 */}
            <p className="text-gray-600 mb-6">
              应用遇到了意外错误。我们已记录此问题并将尽快修复。
            </p>

            {/* 错误详情 (开发环境显示) */}
            {import.meta.env.DEV && this.state.error && (
              <div className="bg-gray-100 rounded-lg p-4 mb-6 text-left">
                <p className="text-sm font-mono text-red-600 break-all">
                  {this.state.error.message}
                </p>
                {this.state.errorInfo && (
                  <pre className="text-xs text-gray-500 mt-2 overflow-auto max-h-40">
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </div>
            )}

            {/* 操作按钮 */}
            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleRetry}
                className="px-6 py-2.5 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-colors"
              >
                重试
              </button>
              <button
                onClick={this.handleReload}
                className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors"
              >
                刷新页面
              </button>
            </div>

            {/* 帮助链接 */}
            <p className="text-sm text-gray-400 mt-6">
              如果问题持续存在，请{' '}
              <a 
                href="mailto:support@example.com" 
                className="text-blue-600 hover:underline"
              >
                联系支持
              </a>
            </p>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

/**
 * 简化版错误边界 - 用于局部组件
 */
export function SimpleErrorBoundary({ 
  children, 
  fallback 
}: { 
  children: ReactNode
  fallback?: ReactNode 
}) {
  return (
    <ErrorBoundary 
      fallback={fallback || (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-center">
          <p className="text-red-600 text-sm">加载失败</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-2 text-xs text-blue-600 hover:underline"
          >
            刷新页面
          </button>
        </div>
      )}
    >
      {children}
    </ErrorBoundary>
  )
}

export default ErrorBoundary
