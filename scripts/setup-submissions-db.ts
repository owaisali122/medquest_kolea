/**
 * Script to setup the submissions database
 * 
 * This script:
 * 1. Creates the hi_poc_submissions database (if it doesn't exist)
 * 2. Runs the migration to create the required tables
 * 
 * Usage:
 *   npx tsx scripts/setup-submissions-db.ts
 */

import postgres from 'postgres'
import * as fs from 'fs'
import * as path from 'path'

// Default connection to postgres database (for creating new database)
const defaultConnectionUri = 'postgresql://postgres:admin@localhost:5432/postgres'
const submissionsDbName = 'hi_poc_submissions'
const submissionsDbUri = `postgresql://postgres:admin@localhost:5432/${submissionsDbName}`

async function createDatabase() {
  const sql = postgres(defaultConnectionUri)

  try {
    console.log('Connected to PostgreSQL server')

    // Check if database exists
    const checkResult = await sql`
      SELECT 1 FROM pg_database WHERE datname = ${submissionsDbName}
    `

    if (checkResult.length === 0) {
      // Create database - need to use unsafe for CREATE DATABASE
      await sql.unsafe(`CREATE DATABASE ${submissionsDbName}`)
      console.log(`✅ Database '${submissionsDbName}' created successfully`)
    } else {
      console.log(`ℹ️  Database '${submissionsDbName}' already exists`)
    }
  } catch (error: any) {
    if (error.code === '42P04') {
      // Database already exists
      console.log(`ℹ️  Database '${submissionsDbName}' already exists`)
    } else {
      throw error
    }
  } finally {
    await sql.end()
  }
}

async function runMigration() {
  const sql = postgres(submissionsDbUri)

  try {
    console.log(`\nConnecting to ${submissionsDbName} database...`)
    
    // Read migration file
    const migrationPath = path.join(process.cwd(), 'migrations', 'create_submissions_database.sql')
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8')

    console.log('Running migration...')
    await sql.unsafe(migrationSQL)
    console.log('✅ Migration completed successfully')

  } finally {
    await sql.end()
  }
}

async function main() {
  console.log('=== Setting up Submissions Database ===\n')

  try {
    // Step 1: Create database
    await createDatabase()

    // Step 2: Run migration
    await runMigration()

    console.log('\n=== Setup Complete ===')
    console.log(`\nSubmissions database is ready at: ${submissionsDbUri}`)
    console.log('\nTables created:')
    console.log('  - form_step_saves (for saving step data)')
    console.log('  - form_submissions (for completed submissions)')
  } catch (error: any) {
    console.error('\n❌ Setup failed:', error.message)
    if (error.code) {
      console.error('Error code:', error.code)
    }
    process.exit(1)
  }
}

main()
