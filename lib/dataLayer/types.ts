/**
 * Supported database identifiers
 */
export type DatabaseType = 'admin' | 'submissions'

/**
 * Supported CRUD operation types
 */
export type OperationType = 'create' | 'read' | 'update' | 'delete' | 'upsert'

/**
 * Query result from database operations
 */
export interface QueryResult<T = any> {
  success: boolean
  data?: T
  rows?: T[]
  count?: number
  error?: string
  details?: string
}

/**
 * Where clause condition for queries
 */
export interface WhereCondition {
  column: string
  operator: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'LIKE' | 'ILIKE' | 'IN' | 'IS NULL' | 'IS NOT NULL'
  value?: any
}

/**
 * Order by clause for queries
 */
export interface OrderBy {
  column: string
  direction: 'ASC' | 'DESC'
}

/**
 * Options for read operations
 */
export interface ReadOptions {
  columns?: string[]
  where?: WhereCondition[]
  orderBy?: OrderBy[]
  limit?: number
  offset?: number
}

/**
 * Options for create operations
 */
export interface CreateOptions {
  data: Record<string, any>
  returning?: string[]
}

/**
 * Options for update operations
 */
export interface UpdateOptions {
  data: Record<string, any>
  where: WhereCondition[]
  returning?: string[]
}

/**
 * Options for delete operations
 */
export interface DeleteOptions {
  where: WhereCondition[]
  returning?: string[]
}

/**
 * Options for upsert operations
 */
export interface UpsertOptions {
  data: Record<string, any>
  conflictColumns: string[]
  updateColumns?: string[]
  returning?: string[]
}
