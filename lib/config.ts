/**
 * Application Configuration
 * Handles environment-specific settings
 */

type Environments = 'dev' | 'qa' | 'prod'

/**
 * Get current environment from NODE_ENV
 */
function getEnvironment(): Environments {
  const env = process.env.NODE_ENV || 'development'
  
  if (env === 'production') return 'prod'
  if (env === 'qa') return 'qa'
  return 'dev'
}

/**
 * Database configuration for different environments
 */
const databaseConfig = {
  dev: {
    uri: 'postgresql://postgres:admin@localhost:5432/hi_poc_fresh',
  },
  qa: {
    uri: 'postgresql://postgres:admin@localhost:5432/hi_poc_fresh',
  },
  prod: {
    uri: 'postgresql://postgres:admin@localhost:5432/hi_poc_fresh',
  },
}

/**
 * Get database URI for current environment
 */
export function getDatabaseUri(): string {
  const env = getEnvironment()
  return databaseConfig[env].uri
}

/**
 * Get current environment
 */
export function getCurrentEnvironment(): Environments {
  return getEnvironment()
}

/**
 * Export all database configs
 */
export const config = {
  database: databaseConfig,
  environment: getEnvironment(),
}

export default config
