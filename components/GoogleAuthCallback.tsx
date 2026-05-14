/**
 * Google OAuth Callback Component
 * 
 * Handles the OAuth redirect callback, processes the authorization code,
 * and completes the login/registration flow.
 */

import React, { useEffect, useState } from 'react'
import { handleGoogleCallback, loginWithGoogle } from '../services/googleAuthService'
import { SparklesIcon } from './icons/Icons'

interface GoogleAuthCallbackProps {
  onSuccess: (userId: string, username: string, isNewUser: boolean) => void
  onError: (error: string) => void
}

type CallbackStatus = 'processing' | 'success' | 'error'

export default function GoogleAuthCallback({
  onSuccess,
  onError
}: GoogleAuthCallbackProps) {
  const [status, setStatus] = useState<CallbackStatus>('processing')
  const [message, setMessage] = useState('正在处理登录...')
  const [errorDetail, setErrorDetail] = useState<string | null>(null)

  useEffect(() => {
    processCallback()
  }, [])

  const processCallback = async () => {
    try {
      // Parse URL parameters
      const urlParams = new URLSearchParams(window.location.search)
      const code = urlParams.get('code')
      const state = urlParams.get('state')
      const error = urlParams.get('error')
      const errorDescription = urlParams.get('error_description')

      // Check for OAuth error
      if (error) {
        throw new Error(errorDescription || `OAuth error: ${error}`)
      }

      // Validate required parameters
      if (!code || !state) {
        throw new Error('Missing authorization code or state parameter')
      }

      setMessage('正在验证授权...')

      // Handle callback and get Google user info
      const { user: googleUser, isNewUser, linkedUserId } = await handleGoogleCallback(code, state)

      setMessage(isNewUser ? '正在创建账户...' : '正在登录...')

      // Login or create user
      const { userId, username } = await loginWithGoogle(googleUser)

      setStatus('success')
      setMessage(isNewUser ? '账户创建成功！' : '登录成功！')

      // Clear URL parameters
      window.history.replaceState({}, document.title, window.location.pathname)

      // Notify parent
      setTimeout(() => {
        onSuccess(userId, username, isNewUser)
      }, 1000)

    } catch (err) {
      console.error('OAuth callback error:', err)
      setStatus('error')
      const errorMessage = err instanceof Error ? err.message : '登录失败，请重试'
      setMessage('登录失败')
      setErrorDetail(errorMessage)
      onError(errorMessage)
    }
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center z-50">
      <div className="bg-white p-8 rounded-2xl shadow-floating max-w-md w-full mx-4 text-center">
        {/* Logo */}
        <div className={`w-20 h-20 mx-auto mb-6 rounded-2xl flex items-center justify-center shadow-lg transition-all duration-500 ${
          status === 'processing' 
            ? 'bg-gradient-to-br from-blue-500 to-indigo-600 animate-pulse' 
            : status === 'success'
            ? 'bg-gradient-to-br from-green-500 to-emerald-600'
            : 'bg-gradient-to-br from-red-500 to-rose-600'
        }`}>
          {status === 'processing' && (
            <svg className="w-10 h-10 text-white animate-spin" viewBox="0 0 24 24">
              <circle 
                className="opacity-25" 
                cx="12" 
                cy="12" 
                r="10" 
                stroke="currentColor" 
                strokeWidth="4" 
                fill="none" 
              />
              <path 
                className="opacity-75" 
                fill="currentColor" 
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" 
              />
            </svg>
          )}
          {status === 'success' && (
            <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          )}
          {status === 'error' && (
            <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
        </div>

        {/* Status message */}
        <h2 className={`text-xl font-semibold mb-2 ${
          status === 'error' ? 'text-red-600' : 'text-gray-900'
        }`}>
          {message}
        </h2>

        {/* Progress indicator */}
        {status === 'processing' && (
          <div className="mt-4">
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full animate-progress" />
            </div>
            <p className="text-sm text-gray-500 mt-3">请稍候，正在完成授权...</p>
          </div>
        )}

        {/* Success message */}
        {status === 'success' && (
          <div className="mt-4">
            <p className="text-sm text-gray-500">正在跳转...</p>
          </div>
        )}

        {/* Error details */}
        {status === 'error' && errorDetail && (
          <div className="mt-4">
            <p className="text-sm text-gray-500 mb-4">{errorDetail}</p>
            <button
              onClick={() => window.location.href = '/'}
              className="px-6 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
            >
              返回首页
            </button>
          </div>
        )}
      </div>

      {/* Background decoration */}
      <style>{`
        @keyframes progress {
          0% { width: 0%; }
          50% { width: 70%; }
          100% { width: 100%; }
        }
        .animate-progress {
          animation: progress 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}
