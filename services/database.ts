import { createPool } from '@neondatabase/serverless'

// Database connection pool
let pool: any = null

/**
 * Get or create the database connection pool
 */
export function getPool() {
  if (!pool) {
    const connectionString = import.meta.env.VITE_NEON_CONNECTION_STRING || process.env.NEON_DATABASE_URL
    
    if (!connectionString) {
      console.warn('[v0] No database connection string found. Database operations will be limited.')
      return null
    }

    pool = createPool({
      connectionString,
      maxConnections: 10,
    })
  }

  return pool
}

/**
 * Execute a query with RLS context set for the current user
 */
export async function executeWithRLS<T>(
  userId: string,
  queryFn: (client: any) => Promise<T>
): Promise<T> {
  const client = getPool()?.connect()
  
  if (!client) {
    throw new Error('Database connection not available')
  }

  try {
    // Set the current user ID for RLS policies
    await client.query("SELECT set_config('app.current_user_id', $1, false)", [userId])
    
    // Execute the query
    const result = await queryFn(client)
    
    return result
  } finally {
    client.release()
  }
}

/**
 * Query helper with RLS context
 */
export async function queryWithRLS<T = any>(
  userId: string,
  sql: string,
  params?: any[]
): Promise<T[]> {
  return executeWithRLS(userId, async (client) => {
    const result = await client.query(sql, params)
    return result.rows as T[]
  })
}

/**
 * Insert helper with RLS context
 */
export async function insertWithRLS<T = any>(
  userId: string,
  sql: string,
  params?: any[]
): Promise<T> {
  return executeWithRLS(userId, async (client) => {
    const result = await client.query(sql, params)
    return result.rows[0] as T
  })
}

/**
 * Update helper with RLS context
 */
export async function updateWithRLS<T = any>(
  userId: string,
  sql: string,
  params?: any[]
): Promise<T[]> {
  return executeWithRLS(userId, async (client) => {
    const result = await client.query(sql, params)
    return result.rows as T[]
  })
}

/**
 * Delete helper with RLS context
 */
export async function deleteWithRLS(
  userId: string,
  sql: string,
  params?: any[]
): Promise<number> {
  return executeWithRLS(userId, async (client) => {
    const result = await client.query(sql, params)
    return result.rowCount || 0
  })
}

/**
 * Transaction helper with RLS context
 */
export async function transactionWithRLS<T>(
  userId: string,
  txFn: (client: any) => Promise<T>
): Promise<T> {
  return executeWithRLS(userId, async (client) => {
    try {
      await client.query('BEGIN')
      const result = await txFn(client)
      await client.query('COMMIT')
      return result
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    }
  })
}
