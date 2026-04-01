/**
 * useAuth Hook
 * 
 * Manages authentication state and user data synchronization
 */

import { useState, useCallback, useEffect } from 'react'
import {
  registerUser,
  loginUser,
  logoutUser,
  getCurrentSession,
  refreshUserData,
  createGoogleSession,
  type User,
  type AuthSession,
  type LoginCredentials,
  type RegisterData
} from '../services/authService'
import {
  loginWithGoogle as googleLogin,
  linkGoogleAccount,
  unlinkGoogleAccount,
  isGoogleLinked
} from '../services/googleAuthService'
import {
  syncCredits,
  fullSync,
  addCreditsToDb,
  useCreditsFromDb,
  saveAnalysisToDb,
  getSyncStatus,
  migrateLocalDataToDb,
  type UserCredits,
  type SyncStatus
} from '../services/syncService'
import type { AnalysisReport, StockAnalysisReport, PositionalWarfareReport, TopicHistoryEntry, StockHistoryEntry } from '../types'

interface UseAuthReturn {
  // Auth state
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  
  // Credits
  credits: number
  
  // Sync status
  syncStatus: SyncStatus
  
  // Auth actions
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, username: string) => Promise<void>
  loginWithGoogle: (userId: string, username: string, isNewUser: boolean) => Promise<void>
  linkGoogle: () => Promise<void>
  unlinkGoogle: () => Promise<void>
  isGoogleAccountLinked: () => Promise<boolean>
  logout: () => void
  
  // Data actions
  syncData: () => Promise<void>
  addCredits: (amount: number, description?: string) => Promise<number>
  useCredits: (amount: number, description?: string) => Promise<number>
  saveAnalysis: (
    type: 'topic' | 'stock' | 'positional',
    query: string,
    result: AnalysisReport | StockAnalysisReport | PositionalWarfareReport,
    creditCost: number,
    executionTimeMs: number
  ) => Promise<number>
  
  // User ID helper
  getUserId: () => string
  
  // Clear error
  clearError: () => void
}

// Local storage fallback key for anonymous user ID
const ANONYMOUS_USER_ID_KEY = 'gemini-user-id'
const LOCAL_CREDITS_KEY = 'gemini-claude-credits'

/**
 * Generate or get anonymous user ID
 */
function getOrCreateAnonymousUserId(): string {
  let userId = localStorage.getItem(ANONYMOUS_USER_ID_KEY)
  if (!userId) {
    userId = crypto.randomUUID()
    localStorage.setItem(ANONYMOUS_USER_ID_KEY, userId)
  }
  return userId
}

/**
 * Get local credits
 */
function getLocalCredits(): number {
  const stored = localStorage.getItem(LOCAL_CREDITS_KEY)
  return stored ? parseInt(stored, 10) : 0
}

/**
 * Set local credits
 */
function setLocalCredits(credits: number): void {
  localStorage.setItem(LOCAL_CREDITS_KEY, String(credits))
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [credits, setCredits] = useState(0)
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(getSyncStatus())

  /**
   * Initialize auth state from session
   */
  useEffect(() => {
    const initAuth = async () => {
      try {
        const session = getCurrentSession()
        if (session) {
          setUser(session.user)
          
          // Sync credits from database
          const userCredits = await syncCredits(session.user.id)
          setCredits(userCredits.balance)
        } else {
          // Use local credits for anonymous users
          setCredits(getLocalCredits())
        }
      } catch (e) {
        console.error('[useAuth] Init failed:', e)
        setCredits(getLocalCredits())
      } finally {
        setIsLoading(false)
      }
    }

    initAuth()
  }, [])

  /**
   * Login
   */
  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const session = await loginUser({ email, password })
      setUser(session.user)

      // Sync data after login
      const { credits: userCredits } = await fullSync(session.user.id)
      setCredits(userCredits.balance)
      setSyncStatus(getSyncStatus())
    } catch (e) {
      const message = e instanceof Error ? e.message : '登录失败'
      setError(message)
      throw e
    } finally {
      setIsLoading(false)
    }
  }, [])

  /**
   * Register
   */
  const register = useCallback(async (email: string, password: string, username: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const session = await registerUser({ email, password, username })
      setUser(session.user)

      // Migrate local data to database
      await migrateLocalDataToDb(session.user.id)

      // Sync data
      const { credits: userCredits } = await fullSync(session.user.id)
      setCredits(userCredits.balance)
      setSyncStatus(getSyncStatus())
    } catch (e) {
      const message = e instanceof Error ? e.message : '注册失败'
      setError(message)
      throw e
    } finally {
      setIsLoading(false)
    }
  }, [])

  /**
   * Login with Google (called after OAuth callback)
   */
  const loginWithGoogle = useCallback(async (userId: string, username: string, isNewUser: boolean) => {
    setIsLoading(true)
    setError(null)

    try {
      // Create session for the Google user
      const session = await createGoogleSession(userId)
      setUser(session.user)

      // Migrate local data if new user
      if (isNewUser) {
        await migrateLocalDataToDb(session.user.id)
      }

      // Sync data
      const { credits: userCredits } = await fullSync(session.user.id)
      setCredits(userCredits.balance)
      setSyncStatus(getSyncStatus())
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Google 登录失败'
      setError(message)
      throw e
    } finally {
      setIsLoading(false)
    }
  }, [])

  /**
   * Link Google account to current user
   */
  const linkGoogle = useCallback(async () => {
    if (!user) {
      throw new Error('请先登录')
    }

    // This will redirect to Google OAuth
    const { initiateGoogleLogin } = await import('../services/googleAuthService')
    await initiateGoogleLogin(user.id)
  }, [user])

  /**
   * Unlink Google account
   */
  const unlinkGoogle = useCallback(async () => {
    if (!user) {
      throw new Error('请先登录')
    }

    await unlinkGoogleAccount(user.id)
    
    // Refresh user data
    const refreshedUser = await refreshUserData(user.id)
    if (refreshedUser) {
      setUser(refreshedUser)
    }
  }, [user])

  /**
   * Check if Google account is linked
   */
  const isGoogleAccountLinked = useCallback(async (): Promise<boolean> => {
    if (!user) return false
    return isGoogleLinked(user.id)
  }, [user])

  /**
   * Logout
   */
  const logout = useCallback(() => {
    logoutUser()
    setUser(null)
    setCredits(getLocalCredits())
    setSyncStatus({ lastSyncAt: 0, pendingChanges: 0, syncInProgress: false })
  }, [])

  /**
   * Sync data with database
   */
  const syncData = useCallback(async () => {
    if (!user) return

    setSyncStatus(prev => ({ ...prev, syncInProgress: true }))

    try {
      const { credits: userCredits } = await fullSync(user.id)
      setCredits(userCredits.balance)
      
      // Refresh user data
      const refreshedUser = await refreshUserData(user.id)
      if (refreshedUser) {
        setUser(refreshedUser)
      }

      setSyncStatus(getSyncStatus())
    } catch (e) {
      console.error('[useAuth] Sync failed:', e)
      setSyncStatus(prev => ({ ...prev, syncInProgress: false }))
    }
  }, [user])

  /**
   * Add credits
   */
  const addCredits = useCallback(async (amount: number, description = 'Credit added'): Promise<number> => {
    if (user) {
      // Add to database
      const newBalance = await addCreditsToDb(user.id, amount, description)
      setCredits(newBalance)
      return newBalance
    } else {
      // Add to local storage
      const newBalance = getLocalCredits() + amount
      setLocalCredits(newBalance)
      setCredits(newBalance)
      return newBalance
    }
  }, [user])

  /**
   * Use credits
   */
  const useCredits = useCallback(async (amount: number, description = 'Analysis'): Promise<number> => {
    if (user) {
      // Use from database
      const newBalance = await useCreditsFromDb(user.id, amount, description)
      setCredits(newBalance)
      return newBalance
    } else {
      // Use from local storage
      const current = getLocalCredits()
      if (current < amount) {
        throw new Error('积分不足')
      }
      const newBalance = current - amount
      setLocalCredits(newBalance)
      setCredits(newBalance)
      return newBalance
    }
  }, [user])

  /**
   * Save analysis
   */
  const saveAnalysis = useCallback(async (
    type: 'topic' | 'stock' | 'positional',
    query: string,
    result: AnalysisReport | StockAnalysisReport | PositionalWarfareReport,
    creditCost: number,
    executionTimeMs: number
  ): Promise<number> => {
    const userId = user?.id || getOrCreateAnonymousUserId()
    return saveAnalysisToDb(userId, type, query, result, creditCost, executionTimeMs)
  }, [user])

  /**
   * Get user ID (for use in API calls)
   */
  const getUserId = useCallback((): string => {
    return user?.id || getOrCreateAnonymousUserId()
  }, [user])

  /**
   * Clear error
   */
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    user,
    isAuthenticated: !!user,
    isLoading,
    error,
    credits,
    syncStatus,
    login,
    register,
    loginWithGoogle,
    linkGoogle,
    unlinkGoogle,
    isGoogleAccountLinked,
    logout,
    syncData,
    addCredits,
    useCredits,
    saveAnalysis,
    getUserId,
    clearError
  }
}

export type { User, AuthSession, LoginCredentials, RegisterData, UserCredits, SyncStatus }
