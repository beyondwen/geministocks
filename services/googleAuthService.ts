/**
 * Google OAuth Service
 * 
 * Handles Google OAuth 2.0 authentication flow with PKCE for enhanced security.
 * Supports account linking and unlinking functionality.
 */

import { neon } from '@neondatabase/serverless'

// Types
export interface GoogleUser {
  id: string
  email: string
  name: string
  picture: string
  verified_email: boolean
}

export interface OAuthState {
  nonce: string
  codeVerifier: string
  redirectUri: string
  timestamp: number
  linkToUserId?: string // For account linking
}

// Storage keys
const OAUTH_STATE_KEY = 'gemini-oauth-state'
const GOOGLE_LINKED_KEY = 'gemini-google-linked'

// OAuth Configuration
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''
const GOOGLE_REDIRECT_URI = import.meta.env.VITE_GOOGLE_REDIRECT_URI || 
  `${window.location.origin}/auth/google/callback`

// OAuth URLs
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo'

/**
 * Get database connection
 */
function getDb() {
  const connectionString = import.meta.env.VITE_NEON_CONNECTION_STRING || 
                           import.meta.env.DATABASE_URL
  
  if (!connectionString) {
    throw new Error('Database connection string not found')
  }
  
  return neon(connectionString)
}

/**
 * Generate a cryptographically secure random string
 */
function generateSecureRandom(length: number = 32): string {
  const array = new Uint8Array(length)
  crypto.getRandomValues(array)
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Generate PKCE code verifier
 */
function generateCodeVerifier(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return base64UrlEncode(array)
}

/**
 * Generate PKCE code challenge from verifier
 */
async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(verifier)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return base64UrlEncode(new Uint8Array(digest))
}

/**
 * Base64 URL encode
 */
function base64UrlEncode(buffer: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...buffer))
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

/**
 * Save OAuth state for CSRF protection
 */
function saveOAuthState(state: OAuthState): void {
  try {
    localStorage.setItem(OAUTH_STATE_KEY, JSON.stringify(state))
  } catch (e) {
    console.error('Failed to save OAuth state:', e)
  }
}

/**
 * Get and validate OAuth state
 */
function getOAuthState(): OAuthState | null {
  try {
    const stored = localStorage.getItem(OAUTH_STATE_KEY)
    if (!stored) return null
    
    const state: OAuthState = JSON.parse(stored)
    
    // Check if state is expired (5 minutes)
    if (Date.now() - state.timestamp > 5 * 60 * 1000) {
      clearOAuthState()
      return null
    }
    
    return state
  } catch (e) {
    console.error('Failed to get OAuth state:', e)
    return null
  }
}

/**
 * Clear OAuth state
 */
function clearOAuthState(): void {
  try {
    localStorage.removeItem(OAUTH_STATE_KEY)
  } catch (e) {
    console.error('Failed to clear OAuth state:', e)
  }
}

/**
 * Initiate Google OAuth login flow
 */
export async function initiateGoogleLogin(linkToUserId?: string): Promise<void> {
  if (!GOOGLE_CLIENT_ID) {
    throw new Error('Google OAuth is not configured. Please set VITE_GOOGLE_CLIENT_ID.')
  }
  
  // Generate PKCE parameters
  const codeVerifier = generateCodeVerifier()
  const codeChallenge = await generateCodeChallenge(codeVerifier)
  const nonce = generateSecureRandom()
  
  // Save state for verification
  const state: OAuthState = {
    nonce,
    codeVerifier,
    redirectUri: GOOGLE_REDIRECT_URI,
    timestamp: Date.now(),
    linkToUserId
  }
  saveOAuthState(state)
  
  // Build authorization URL
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: GOOGLE_REDIRECT_URI,
    response_type: 'code',
    scope: 'openid email profile',
    state: nonce,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    prompt: 'select_account'
  })
  
  // Redirect to Google
  window.location.href = `${GOOGLE_AUTH_URL}?${params.toString()}`
}

/**
 * Handle OAuth callback
 */
export async function handleGoogleCallback(code: string, state: string): Promise<{
  user: GoogleUser
  isNewUser: boolean
  linkedUserId?: string
}> {
  // Verify state (CSRF protection)
  const savedState = getOAuthState()
  if (!savedState || savedState.nonce !== state) {
    clearOAuthState()
    throw new Error('Invalid OAuth state. Please try again.')
  }
  
  try {
    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code, savedState.codeVerifier, savedState.redirectUri)
    
    // Get user info
    const googleUser = await getGoogleUserInfo(tokens.access_token)
    
    // Check if user exists in database
    const sql = getDb()
    const existingUsers = await sql`
      SELECT id, email, username, google_id, avatar_url 
      FROM users 
      WHERE google_id = ${googleUser.id} OR email = ${googleUser.email}
    `
    
    let isNewUser = existingUsers.length === 0
    let linkedUserId = savedState.linkToUserId
    
    // If linking to existing account
    if (linkedUserId) {
      await linkGoogleAccount(linkedUserId, googleUser)
    }
    
    clearOAuthState()
    
    return {
      user: googleUser,
      isNewUser,
      linkedUserId
    }
  } catch (error) {
    clearOAuthState()
    throw error
  }
}

/**
 * Exchange authorization code for tokens
 */
async function exchangeCodeForTokens(
  code: string, 
  codeVerifier: string,
  redirectUri: string
): Promise<{ access_token: string; id_token: string }> {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      code,
      code_verifier: codeVerifier,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri
    })
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error_description || 'Failed to exchange code for tokens')
  }
  
  return response.json()
}

/**
 * Get Google user info from access token
 */
async function getGoogleUserInfo(accessToken: string): Promise<GoogleUser> {
  const response = await fetch(GOOGLE_USERINFO_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  })
  
  if (!response.ok) {
    throw new Error('Failed to get user info from Google')
  }
  
  return response.json()
}

/**
 * Create or login user with Google account
 */
export async function loginWithGoogle(googleUser: GoogleUser): Promise<{
  userId: string
  isNewUser: boolean
  username: string
}> {
  const sql = getDb()
  const now = new Date().toISOString()
  
  // Check if user exists by Google ID or email
  const existingUsers = await sql`
    SELECT id, email, username, google_id 
    FROM users 
    WHERE google_id = ${googleUser.id} OR email = ${googleUser.email}
    LIMIT 1
  `
  
  if (existingUsers.length > 0) {
    const user = existingUsers[0]
    
    // Update Google ID if not set
    if (!user.google_id) {
      await sql`
        UPDATE users 
        SET google_id = ${googleUser.id}, 
            avatar_url = ${googleUser.picture},
            updated_at = ${now},
            last_login_at = ${now}
        WHERE id = ${user.id}
      `
    } else {
      // Update last login
      await sql`
        UPDATE users 
        SET last_login_at = ${now}, updated_at = ${now}
        WHERE id = ${user.id}
      `
    }
    
    return {
      userId: user.id,
      isNewUser: false,
      username: user.username
    }
  }
  
  // Create new user
  const userId = crypto.randomUUID()
  const username = googleUser.name || googleUser.email.split('@')[0]
  
  await sql`
    INSERT INTO users (
      id, email, username, google_id, avatar_url, 
      created_at, updated_at, last_login_at, total_analyses_count
    )
    VALUES (
      ${userId}, ${googleUser.email}, ${username}, ${googleUser.id}, ${googleUser.picture},
      ${now}, ${now}, ${now}, 0
    )
  `
  
  // Initialize credits for new user (bonus for Google signup)
  await sql`
    INSERT INTO credits (user_id, balance, created_at, updated_at, daily_free_credits, daily_free_used)
    VALUES (${userId}, 15, ${now}, ${now}, 3, 0)
  `
  
  // Record credit transaction
  await sql`
    INSERT INTO credit_transactions (id, user_id, amount, type, description, created_at)
    VALUES (${crypto.randomUUID()}, ${userId}, 15, 'bonus', 'Google signup bonus', ${now})
  `
  
  // Create user settings
  await sql`
    INSERT INTO user_settings (user_id, created_at, updated_at, preferences)
    VALUES (${userId}, ${now}, ${now}, ${JSON.stringify({ authProvider: 'google' })})
  `
  
  return {
    userId,
    isNewUser: true,
    username
  }
}

/**
 * Link Google account to existing user
 */
export async function linkGoogleAccount(userId: string, googleUser: GoogleUser): Promise<void> {
  const sql = getDb()
  const now = new Date().toISOString()
  
  // Check if Google account is already linked to another user
  const existing = await sql`
    SELECT id FROM users WHERE google_id = ${googleUser.id} AND id != ${userId}
  `
  
  if (existing.length > 0) {
    throw new Error('This Google account is already linked to another user.')
  }
  
  // Link Google account
  await sql`
    UPDATE users 
    SET google_id = ${googleUser.id}, 
        avatar_url = COALESCE(avatar_url, ${googleUser.picture}),
        updated_at = ${now}
    WHERE id = ${userId}
  `
  
  // Save linked status
  localStorage.setItem(GOOGLE_LINKED_KEY, 'true')
}

/**
 * Unlink Google account from user
 */
export async function unlinkGoogleAccount(userId: string): Promise<void> {
  const sql = getDb()
  const now = new Date().toISOString()
  
  // Check if user has password set (can't unlink if no password)
  const settings = await sql`
    SELECT preferences FROM user_settings WHERE user_id = ${userId}
  `
  
  const hasPassword = settings.length > 0 && 
    (settings[0].preferences as any)?.passwordHash
  
  if (!hasPassword) {
    throw new Error('Cannot unlink Google account without setting a password first.')
  }
  
  // Unlink Google account
  await sql`
    UPDATE users 
    SET google_id = NULL, updated_at = ${now}
    WHERE id = ${userId}
  `
  
  localStorage.removeItem(GOOGLE_LINKED_KEY)
}

/**
 * Check if user has Google account linked
 */
export async function isGoogleLinked(userId: string): Promise<boolean> {
  const sql = getDb()
  
  const users = await sql`
    SELECT google_id FROM users WHERE id = ${userId}
  `
  
  return users.length > 0 && users[0].google_id !== null
}

/**
 * Get OAuth configuration status
 */
export function isGoogleOAuthConfigured(): boolean {
  return !!GOOGLE_CLIENT_ID
}
