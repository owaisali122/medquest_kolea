import { getDb, DatabaseType } from '../db'
import {
  OperationType,
  QueryResult,
  ReadOptions,
  CreateOptions,
  UpdateOptions,
  DeleteOptions,
  UpsertOptions,
  WhereCondition,
  OrderBy,
} from './types'

// Re-export types
export * from './types'
export { DatabaseType } from '../db'

/**
 * Build WHERE clause string and values from conditions
 */
function buildWhereClause(conditions: WhereCondition[]): { clause: string; values: any[] } {
  if (!conditions || conditions.length === 0) {
    return { clause: '', values: [] }
  }

  const values: any[] = []
  const clauses: string[] = []
  let paramIndex = 1

  conditions.forEach((condition) => {
    if (condition.operator === 'IS NULL') {
      clauses.push(`${condition.column} IS NULL`)
    } else if (condition.operator === 'IS NOT NULL') {
      clauses.push(`${condition.column} IS NOT NULL`)
    } else if (condition.operator === 'IN') {
      const inValues = Array.isArray(condition.value) ? condition.value : [condition.value]
      const placeholders = inValues.map(() => `$${paramIndex++}`).join(', ')
      clauses.push(`${condition.column} IN (${placeholders})`)
      values.push(...inValues)
    } else {
      clauses.push(`${condition.column} ${condition.operator} $${paramIndex++}`)
      values.push(condition.value)
    }
  })

  return { clause: `WHERE ${clauses.join(' AND ')}`, values }
}

/**
 * Build ORDER BY clause
 */
function buildOrderByClause(orderBy?: OrderBy[]): string {
  if (!orderBy || orderBy.length === 0) {
    return ''
  }
  const clauses = orderBy.map((o) => `${o.column} ${o.direction}`)
  return `ORDER BY ${clauses.join(', ')}`
}

/**
 * Execute a READ operation using postgres template literals
 */
async function executeRead<T = any>(
  database: DatabaseType,
  table: string,
  options: ReadOptions
): Promise<QueryResult<T>> {
  try {
    const sql = getDb(database)
    const columns = options.columns?.join(', ') || '*'
    const { clause: whereClause, values } = buildWhereClause(options.where || [])
    const orderByClause = buildOrderByClause(options.orderBy)
    const limitClause = options.limit ? `LIMIT ${options.limit}` : ''
    const offsetClause = options.offset ? `OFFSET ${options.offset}` : ''

    const query = `
      SELECT ${columns}
      FROM ${table}
      ${whereClause}
      ${orderByClause}
      ${limitClause}
      ${offsetClause}
    `.trim()

    const result = await sql.unsafe(query, values)

    return {
      success: true,
      rows: result as T[],
      count: result.length,
    }
  } catch (error: any) {
    console.error(`Read operation error on ${table}:`, error)
    return {
      success: false,
      error: 'Read operation failed',
      details: error.message,
    }
  }
}

/**
 * Execute a CREATE operation using postgres template literals
 */
async function executeCreate<T = any>(
  database: DatabaseType,
  table: string,
  options: CreateOptions
): Promise<QueryResult<T>> {
  try {
    const sql = getDb(database)
    const columns = Object.keys(options.data)
    const values = Object.values(options.data)
    const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ')
    const returningClause = options.returning?.length
      ? `RETURNING ${options.returning.join(', ')}`
      : 'RETURNING *'

    const query = `
      INSERT INTO ${table} (${columns.join(', ')})
      VALUES (${placeholders})
      ${returningClause}
    `.trim()

    const result = await sql.unsafe(query, values)

    return {
      success: true,
      data: result[0] as T,
      rows: result as T[],
      count: result.length,
    }
  } catch (error: any) {
    console.error(`Create operation error on ${table}:`, error)
    return {
      success: false,
      error: 'Create operation failed',
      details: error.message,
    }
  }
}

/**
 * Execute an UPDATE operation using postgres template literals
 */
async function executeUpdate<T = any>(
  database: DatabaseType,
  table: string,
  options: UpdateOptions
): Promise<QueryResult<T>> {
  try {
    const sql = getDb(database)
    const columns = Object.keys(options.data)
    const values = Object.values(options.data)

    // Build SET clause
    const setClause = columns.map((col, i) => `${col} = $${i + 1}`).join(', ')

    // Build WHERE clause (starting index after SET values)
    const whereConditions = options.where.map((cond, i) => {
      const paramIndex = columns.length + i + 1
      if (cond.operator === 'IS NULL') return `${cond.column} IS NULL`
      if (cond.operator === 'IS NOT NULL') return `${cond.column} IS NOT NULL`
      return `${cond.column} ${cond.operator} $${paramIndex}`
    })
    
    const whereValues = options.where
      .filter((c) => c.operator !== 'IS NULL' && c.operator !== 'IS NOT NULL')
      .map((c) => c.value)

    if (whereConditions.length === 0) {
      throw new Error('UPDATE requires WHERE conditions')
    }

    const allValues = [...values, ...whereValues]
    const returningClause = options.returning?.length
      ? `RETURNING ${options.returning.join(', ')}`
      : 'RETURNING *'

    const query = `
      UPDATE ${table}
      SET ${setClause}
      WHERE ${whereConditions.join(' AND ')}
      ${returningClause}
    `.trim()

    const result = await sql.unsafe(query, allValues)

    return {
      success: true,
      data: result[0] as T,
      rows: result as T[],
      count: result.length,
    }
  } catch (error: any) {
    console.error(`Update operation error on ${table}:`, error)
    return {
      success: false,
      error: 'Update operation failed',
      details: error.message,
    }
  }
}

/**
 * Execute a DELETE operation using postgres template literals
 */
async function executeDelete<T = any>(
  database: DatabaseType,
  table: string,
  options: DeleteOptions
): Promise<QueryResult<T>> {
  try {
    const sql = getDb(database)
    const { clause: whereClause, values } = buildWhereClause(options.where)

    if (!whereClause) {
      throw new Error('DELETE requires WHERE conditions')
    }

    const returningClause = options.returning?.length
      ? `RETURNING ${options.returning.join(', ')}`
      : ''

    const query = `
      DELETE FROM ${table}
      ${whereClause}
      ${returningClause}
    `.trim()

    const result = await sql.unsafe(query, values)

    return {
      success: true,
      rows: result as T[],
      count: result.length,
    }
  } catch (error: any) {
    console.error(`Delete operation error on ${table}:`, error)
    return {
      success: false,
      error: 'Delete operation failed',
      details: error.message,
    }
  }
}

/**
 * Execute an UPSERT operation using postgres template literals
 */
async function executeUpsert<T = any>(
  database: DatabaseType,
  table: string,
  options: UpsertOptions
): Promise<QueryResult<T>> {
  try {
    const sql = getDb(database)
    const columns = Object.keys(options.data)
    const values = Object.values(options.data)
    const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ')

    // Build conflict target
    const conflictTarget = options.conflictColumns.join(', ')

    // Build update clause for ON CONFLICT
    const updateColumns = options.updateColumns || columns.filter(
      (col) => !options.conflictColumns.includes(col)
    )
    const updateClause = updateColumns
      .map((col) => `${col} = EXCLUDED.${col}`)
      .join(', ')

    const returningClause = options.returning?.length
      ? `RETURNING ${options.returning.join(', ')}`
      : 'RETURNING *'

    const query = `
      INSERT INTO ${table} (${columns.join(', ')})
      VALUES (${placeholders})
      ON CONFLICT (${conflictTarget}) DO UPDATE SET
        ${updateClause}
      ${returningClause}
    `.trim()

    const result = await sql.unsafe(query, values)

    return {
      success: true,
      data: result[0] as T,
      rows: result as T[],
      count: result.length,
    }
  } catch (error: any) {
    console.error(`Upsert operation error on ${table}:`, error)
    return {
      success: false,
      error: 'Upsert operation failed',
      details: error.message,
    }
  }
}

/**
 * Main data layer function - centralized CRUD operations
 * 
 * @param database - The database to use ('admin' | 'submissions')
 * @param table - The table name
 * @param operation - The operation type ('create' | 'read' | 'update' | 'delete' | 'upsert')
 * @param options - Operation-specific options
 * @returns Promise<QueryResult<T>>
 * 
 * @example
 * // Read operation
 * const result = await dataLayer('submissions', 'form_step_saves', 'read', {
 *   columns: ['id', 'session_id', 'data'],
 *   where: [{ column: 'session_id', operator: '=', value: 'session_123' }],
 *   limit: 1
 * })
 * 
 * @example
 * // Create operation
 * const result = await dataLayer('submissions', 'form_submissions', 'create', {
 *   data: { form_id: 1, data: { name: 'John' }, created_at: new Date() },
 *   returning: ['id']
 * })
 */
export async function dataLayer<T = any>(
  database: DatabaseType,
  table: string,
  operation: OperationType,
  options: ReadOptions | CreateOptions | UpdateOptions | DeleteOptions | UpsertOptions
): Promise<QueryResult<T>> {
  switch (operation) {
    case 'read':
      return executeRead<T>(database, table, options as ReadOptions)
    case 'create':
      return executeCreate<T>(database, table, options as CreateOptions)
    case 'update':
      return executeUpdate<T>(database, table, options as UpdateOptions)
    case 'delete':
      return executeDelete<T>(database, table, options as DeleteOptions)
    case 'upsert':
      return executeUpsert<T>(database, table, options as UpsertOptions)
    default:
      return {
        success: false,
        error: `Unknown operation: ${operation}`,
      }
  }
}

/**
 * Execute a raw SQL query using postgres template literals
 * 
 * @param database - The database to use
 * @param query - The raw SQL query with $1, $2 placeholders
 * @param params - Query parameters
 * @returns Promise<QueryResult<T>>
 * 
 * @example
 * const result = await rawQuery('submissions', 
 *   'SELECT * FROM form_step_saves WHERE data->>$1 = $2',
 *   ['email', 'john@example.com']
 * )
 */
export async function rawQuery<T = any>(
  database: DatabaseType,
  query: string,
  params: any[] = []
): Promise<QueryResult<T>> {
  try {
    const sql = getDb(database)
    const result = await sql.unsafe(query, params)

    return {
      success: true,
      rows: result as T[],
      data: result[0] as T,
      count: result.length,
    }
  } catch (error: any) {
    console.error('Raw query error:', error)
    return {
      success: false,
      error: 'Query execution failed',
      details: error.message,
    }
  }
}

// Default export
export default dataLayer
