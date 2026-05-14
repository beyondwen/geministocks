/**
 * User Menu Component
 * 
 * Displays user info when logged in, or login button when not
 */

import React, { useState, useRef, useEffect } from 'react'
import { UserCircleIcon, ArrowRightOnRectangleIcon, CloudArrowUpIcon, SparklesIcon } from './icons/Icons'
import type { User } from '../services/authService'

interface UserMenuProps {
  user: User | null
  credits: number
  isLoading?: boolean
  onLoginClick: () => void
  onLogout: () => void
  onSync?: () => void
  syncStatus?: {
    lastSyncAt: number
    syncInProgress: boolean
  }
}

export default function UserMenu({
  user,
  credits,
  isLoading = false,
  onLoginClick,
  onLogout,
  onSync,
  syncStatus
}: UserMenuProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Format last sync time
  const formatSyncTime = (timestamp: number) => {
    if (!timestamp) return '从未同步'
    const diff = Date.now() - timestamp
    if (diff < 60000) return '刚刚'
    if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`
    return `${Math.floor(diff / 86400000)} 天前`
  }

  // Not logged in - show login button
  if (!user) {
    return (
      <button
        onClick={onLoginClick}
        disabled={isLoading}
        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-sm font-medium rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all shadow-md shadow-blue-500/20 disabled:opacity-50"
      >
        <UserCircleIcon className="w-4 h-4" />
        登录 / 注册
      </button>
    )
  }

  // Logged in - show user menu
  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        className="flex items-center gap-3 px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors border border-gray-100"
      >
        {/* Avatar */}
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-medium text-sm">
          {user.avatar_url ? (
            <img src={user.avatar_url} alt={user.username} className="w-8 h-8 rounded-full object-cover" />
          ) : (
            user.username.charAt(0).toUpperCase()
          )}
        </div>

        {/* User info */}
        <div className="text-left hidden sm:block">
          <p className="text-sm font-medium text-gray-800">{user.username}</p>
          <p className="text-xs text-gray-500 flex items-center gap-1">
            <SparklesIcon className="w-3 h-3" />
            {credits} 积分
          </p>
        </div>

        {/* Mobile credits badge */}
        <div className="sm:hidden flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
          <SparklesIcon className="w-3 h-3" />
          {credits}
        </div>

        {/* Dropdown arrow */}
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown menu */}
      {isMenuOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50 animate-fade-in">
          {/* User header */}
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="font-medium text-gray-800">{user.username}</p>
            <p className="text-sm text-gray-500">{user.email}</p>
          </div>

          {/* Credits */}
          <div className="px-4 py-3 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">当前积分</span>
              <span className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-sm font-medium rounded-lg">
                <SparklesIcon className="w-4 h-4" />
                {credits}
              </span>
            </div>
          </div>

          {/* Sync status */}
          {syncStatus && (
            <div className="px-4 py-3 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">数据同步</span>
                <span className="text-xs text-gray-400">
                  {syncStatus.syncInProgress ? '同步中...' : formatSyncTime(syncStatus.lastSyncAt)}
                </span>
              </div>
              {onSync && (
                <button
                  onClick={() => {
                    onSync()
                    setIsMenuOpen(false)
                  }}
                  disabled={syncStatus.syncInProgress}
                  className="mt-2 w-full flex items-center justify-center gap-2 px-3 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 text-sm rounded-lg transition-colors disabled:opacity-50"
                >
                  <CloudArrowUpIcon className={`w-4 h-4 ${syncStatus.syncInProgress ? 'animate-pulse' : ''}`} />
                  {syncStatus.syncInProgress ? '正在同步...' : '立即同步'}
                </button>
              )}
            </div>
          )}

          {/* Stats */}
          <div className="px-4 py-3 border-b border-gray-100">
            <div className="grid grid-cols-2 gap-3 text-center">
              <div>
                <p className="text-lg font-bold text-gray-800">{user.total_analyses_count}</p>
                <p className="text-xs text-gray-500">总分析次数</p>
              </div>
              <div>
                <p className="text-lg font-bold text-gray-800">
                  {Math.floor((Date.now() - new Date(user.created_at).getTime()) / 86400000)}
                </p>
                <p className="text-xs text-gray-500">使用天数</p>
              </div>
            </div>
          </div>

          {/* Logout */}
          <div className="px-2 py-2">
            <button
              onClick={() => {
                onLogout()
                setIsMenuOpen(false)
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm"
            >
              <ArrowRightOnRectangleIcon className="w-4 h-4" />
              退出登录
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
