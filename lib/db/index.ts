import postgres from 'postgres'

/**
 * Database types supported in the application
 */
export type DatabaseType = 'admin' | 'submissions'

/**
 * Database configuration for different environments
 */
const databaseConfig = {
  dev: {
    admin: 'postgresql://postgres:admin@localhost:5432/hi_poc_fresh',
    submissions: 'postgresql://postgres:admin@localhost:5432/hi_poc_submissions',
  },
  qa: {
    admin: 'postgresql://postgres:admin@localhost:5432/hi_poc_fresh',
    submissions: 'postgresql://postgres:admin@localhost:5432/hi_poc_submissions',
  },
  prod: {
    admin: 'postgresql://postgres:admin@localhost:5432/hi_poc_fresh',
    submissions: 'postgresql://postgres:admin@localhost:5432/hi_poc_submissions',
  },
}

/**
 * Get current environment
 */
function getEnvironment(): 'dev' | 'qa' | 'prod' {
  const env = process.env.NODE_ENV as string || 'development'
  if (env === 'production') return 'prod'
  if (env === 'qa') return 'qa'
  return 'dev'
}

/**
 * Connection options for postgres
 */
const connectionOptions = {
  max: 20,
  idle_timeout: 30,
  connect_timeout: 10,
}

/**
 * Create postgres SQL instance for admin database
 */
export const adminDb = postgres(databaseConfig[getEnvironment()].admin, {
  ...connectionOptions,
  onnotice: () => {}, // Suppress notices
})

/**
 * Create postgres SQL instance for submissions database
 */
export const submissionsDb = postgres(databaseConfig[getEnvironment()].submissions, {
  ...connectionOptions,
  onnotice: () => {}, // Suppress notices
})

/**
 * Get database connection by type
 */
export function getDb(type: DatabaseType) {
  return type === 'admin' ? adminDb : submissionsDb
}

/**
 * Get database URI by type (for scripts/migrations)
 */
export function getDatabaseUri(type: DatabaseType): string {
  return databaseConfig[getEnvironment()][type]
}

export default { adminDb, submissionsDb, getDb, getDatabaseUri }
