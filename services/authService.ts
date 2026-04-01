/**
 * Authentication Service
 * 
 * Handles user registration, login, session management
 * with secure password hashing and database-backed storage
 */

import { neon } from '@neondatabase/serverless'

// Types
export interface User {
  id: string
  email: string
  username: string
  avatar_url?: string
  created_at: string
  last_login_at?: string
  total_analyses_count: number
  google_id?: string
  auth_provider?: 'email' | 'google'
}

export interface AuthSession {
  user: User
  token: string
  expiresAt: number
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  email: string
  password: string
  username: string
}

// Session storage key
const SESSION_STORAGE_KEY = 'gemini-auth-session'
const SESSION_EXPIRY_DAYS = 30

/**
 * Get database connection
 */
function getDb() {
  const connectionString = import.meta.env.VITE_NEON_CONNECTION_STRING || 
                           import.meta.env.DATABASE_URL ||
                           process.env.DATABASE_URL
  
  if (!connectionString) {
    throw new Error('Database connection string not found')
  }
  
  return neon(connectionString)
}

/**
 * Generate a simple hash for password (for demo purposes)
 * In production, use bcrypt on server-side
 */
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password + 'gemini-salt-2024')
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Generate a secure session token
 */
function generateSessionToken(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Register a new user
 */
export async function registerUser(data: RegisterData): Promise<AuthSession> {
  const sql = getDb()
  
  // Check if email already exists
  const existing = await sql`
    SELECT id FROM users WHERE email = ${data.email}
  `
  
  if (existing.length > 0) {
    throw new Error('该邮箱已被注册')
  }
  
  // Check if username already exists
  const existingUsername = await sql`
    SELECT id FROM users WHERE username = ${data.username}
  `
  
  if (existingUsername.length > 0) {
    throw new Error('该用户名已被使用')
  }
  
  // Hash password
  const passwordHash = await hashPassword(data.password)
  
  // Generate user ID
  const userId = crypto.randomUUID()
  
  // Create user
  const now = new Date().toISOString()
  await sql`
    INSERT INTO users (id, email, username, created_at, updated_at, last_login_at, total_analyses_count)
    VALUES (${userId}, ${data.email}, ${data.username}, ${now}, ${now}, ${now}, 0)
  `
  
  // Store password hash in a separate secure manner
  // For this demo, we'll use user_settings with a hashed field
  await sql`
    INSERT INTO user_settings (user_id, created_at, updated_at, preferences)
    VALUES (${userId}, ${now}, ${now}, ${JSON.stringify({ passwordHash })})
  `
  
  // Initialize credits for new user
  await sql`
    INSERT INTO credits (user_id, balance, created_at, updated_at, daily_free_credits, daily_free_used)
    VALUES (${userId}, 10, ${now}, ${now}, 3, 0)
  `
  
  // Create session
  const token = generateSessionToken()
  const expiresAt = Date.now() + (SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000)
  
  const user: User = {
    id: userId,
    email: data.email,
    username: data.username,
    created_at: now,
    last_login_at: now,
    total_analyses_count: 0
  }
  
  const session: AuthSession = { user, token, expiresAt }
  
  // Save session to localStorage
  saveSession(session)
  
  return session
}

/**
 * Login user
 */
export async function loginUser(credentials: LoginCredentials): Promise<AuthSession> {
  const sql = getDb()
  
  // Find user by email
  const users = await sql`
    SELECT id, email, username, avatar_url, created_at, last_login_at, total_analyses_count
    FROM users WHERE email = ${credentials.email}
  `
  
  if (users.length === 0) {
    throw new Error('邮箱或密码错误')
  }
  
  const dbUser = users[0]
  
  // Get password hash from settings
  const settings = await sql`
    SELECT preferences FROM user_settings WHERE user_id = ${dbUser.id}
  `
  
  if (settings.length === 0) {
    throw new Error('用户数据异常，请联系支持')
  }
  
  const storedHash = (settings[0].preferences as any)?.passwordHash
  const inputHash = await hashPassword(credentials.password)
  
  if (storedHash !== inputHash) {
    throw new Error('邮箱或密码错误')
  }
  
  // Update last login time
  const now = new Date().toISOString()
  await sql`
    UPDATE users SET last_login_at = ${now}, updated_at = ${now}
    WHERE id = ${dbUser.id}
  `
  
  // Create session
  const token = generateSessionToken()
  const expiresAt = Date.now() + (SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000)
  
  const user: User = {
    id: dbUser.id,
    email: dbUser.email,
    username: dbUser.username,
    avatar_url: dbUser.avatar_url,
    created_at: dbUser.created_at,
    last_login_at: now,
    total_analyses_count: dbUser.total_analyses_count || 0
  }
  
  const session: AuthSession = { user, token, expiresAt }
  
  // Save session to localStorage
  saveSession(session)
  
  return session
}

/**
 * Logout user
 */
export function logoutUser(): void {
  try {
    localStorage.removeItem(SESSION_STORAGE_KEY)
  } catch (e) {
    console.error('Failed to clear session:', e)
  }
}

/**
 * Get current session
 */
export function getCurrentSession(): AuthSession | null {
  try {
    const stored = localStorage.getItem(SESSION_STORAGE_KEY)
    if (!stored) return null
    
    const session: AuthSession = JSON.parse(stored)
    
    // Check if session is expired
    if (session.expiresAt < Date.now()) {
      logoutUser()
      return null
    }
    
    return session
  } catch (e) {
    console.error('Failed to get session:', e)
    return null
  }
}

/**
 * Save session to localStorage
 */
function saveSession(session: AuthSession): void {
  try {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session))
  } catch (e) {
    console.error('Failed to save session:', e)
  }
}

/**
 * Refresh user data from database
 */
export async function refreshUserData(userId: string): Promise<User | null> {
  try {
    const sql = getDb()
    
    const users = await sql`
      SELECT id, email, username, avatar_url, created_at, last_login_at, total_analyses_count
      FROM users WHERE id = ${userId}
    `
    
    if (users.length === 0) return null
    
    const dbUser = users[0]
    
    return {
      id: dbUser.id,
      email: dbUser.email,
      username: dbUser.username,
      avatar_url: dbUser.avatar_url,
      created_at: dbUser.created_at,
      last_login_at: dbUser.last_login_at,
      total_analyses_count: dbUser.total_analyses_count || 0
    }
  } catch (e) {
    console.error('Failed to refresh user data:', e)
    return null
  }
}

/**
 * Update user profile
 */
export async function updateUserProfile(userId: string, updates: Partial<User>): Promise<User | null> {
  try {
    const sql = getDb()
    const now = new Date().toISOString()
    
    if (updates.username) {
      await sql`
        UPDATE users SET username = ${updates.username}, updated_at = ${now}
        WHERE id = ${userId}
      `
    }
    
    if (updates.avatar_url) {
      await sql`
        UPDATE users SET avatar_url = ${updates.avatar_url}, updated_at = ${now}
        WHERE id = ${userId}
      `
    }
    
    return refreshUserData(userId)
  } catch (e) {
    console.error('Failed to update profile:', e)
    return null
  }
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return getCurrentSession() !== null
}

/**
 * Get current user ID (returns null if not logged in)
 */
export function getCurrentUserId(): string | null {
  const session = getCurrentSession()
  return session?.user.id || null
}

/**
 * Create session for Google OAuth login
 */
export async function createGoogleSession(userId: string): Promise<AuthSession> {
  const sql = getDb()
  
  // Fetch user data
  const users = await sql`
    SELECT id, email, username, avatar_url, google_id, created_at, last_login_at, total_analyses_count
    FROM users WHERE id = ${userId}
  `
  
  if (users.length === 0) {
    throw new Error('User not found')
  }
  
  const dbUser = users[0]
  
  // Create session
  const token = generateSessionToken()
  const expiresAt = Date.now() + (SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000)
  
  const user: User = {
    id: dbUser.id,
    email: dbUser.email,
    username: dbUser.username,
    avatar_url: dbUser.avatar_url,
    google_id: dbUser.google_id,
    created_at: dbUser.created_at,
    last_login_at: dbUser.last_login_at,
    total_analyses_count: dbUser.total_analyses_count || 0,
    auth_provider: dbUser.google_id ? 'google' : 'email'
  }
  
  const session: AuthSession = { user, token, expiresAt }
  
  // Save session to localStorage
  saveSession(session)
  
  return session
}

/**
 * Update session with new user data
 */
export function updateSession(user: Partial<User>): void {
  const session = getCurrentSession()
  if (!session) return
  
  const updatedSession: AuthSession = {
    ...session,
    user: { ...session.user, ...user }
  }
  
  saveSession(updatedSession)
}

/**
 * Check if user has password set
 */
export async function hasPasswordSet(userId: string): Promise<boolean> {
  const sql = getDb()
  
  const settings = await sql`
    SELECT preferences FROM user_settings WHERE user_id = ${userId}
  `
  
  return settings.length > 0 && !!(settings[0].preferences as any)?.passwordHash
}

/**
 * Set password for user (for Google users who want to add email login)
 */
export async function setPassword(userId: string, password: string): Promise<void> {
  const sql = getDb()
  const now = new Date().toISOString()
  
  const passwordHash = await hashPassword(password)
  
  // Check if settings exist
  const existing = await sql`
    SELECT user_id FROM user_settings WHERE user_id = ${userId}
  `
  
  if (existing.length > 0) {
    // Update existing settings
    const currentSettings = await sql`
      SELECT preferences FROM user_settings WHERE user_id = ${userId}
    `
    const preferences = { ...(currentSettings[0]?.preferences || {}), passwordHash }
    
    await sql`
      UPDATE user_settings 
      SET preferences = ${JSON.stringify(preferences)}, updated_at = ${now}
      WHERE user_id = ${userId}
    `
  } else {
    // Create new settings
    await sql`
      INSERT INTO user_settings (user_id, created_at, updated_at, preferences)
      VALUES (${userId}, ${now}, ${now}, ${JSON.stringify({ passwordHash })})
    `
  }
}
