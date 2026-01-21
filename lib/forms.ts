import pool from './db'

export interface Form {
  id: number
  title: string
  slug: string
  description?: string
  status: 'draft' | 'published'
  schema: any // FormIO JSON schema
  settings?: {
    submitButtonText?: string
    successMessage?: string
    allowMultipleSubmissions?: boolean
  }
  created_at: Date
  updated_at: Date
}

/**
 * Fetch a form by slug from PostgreSQL
 */
export async function getFormBySlug(slug: string): Promise<Form | null> {
  try {
    const query = `
      SELECT 
        id,
        title,
        slug,
        description,
        status,
        schema,
        settings_submit_button_text,
        settings_success_message,
        settings_allow_multiple_submissions,
        created_at,
        updated_at
      FROM forms
      WHERE slug = $1 AND status = 'published'
      LIMIT 1
    `
    
    const result = await pool.query(query, [slug])
    
    if (result.rows.length === 0) {
      return null
    }
    
    const row = result.rows[0]
    
    // Parse JSON fields if they're strings (PostgreSQL might return JSON as string)
    return {
      id: row.id,
      title: row.title,
      slug: row.slug,
      description: row.description || undefined,
      status: row.status,
      schema: typeof row.schema === 'string' ? JSON.parse(row.schema) : row.schema,
      settings: {
        submitButtonText: row.settings_submit_button_text || undefined,
        successMessage: row.settings_success_message || undefined,
        allowMultipleSubmissions: row.settings_allow_multiple_submissions ?? undefined,
      },
      created_at: row.created_at,
      updated_at: row.updated_at,
    } as Form
  } catch (error) {
    console.error('Error fetching form by slug:', error)
    throw error
  }
}

/**
 * Fetch multiple forms by slugs
 */
export async function getFormsBySlugs(slugs: string[]): Promise<Form[]> {
  try {
    if (slugs.length === 0) return []
    
    const placeholders = slugs.map((_, index) => `$${index + 1}`).join(', ')
    
    const query = `
      SELECT 
        id,
        title,
        slug,
        description,
        status,
        schema,
        settings_submit_button_text,
        settings_success_message,
        settings_allow_multiple_submissions,
        created_at,
        updated_at
      FROM forms
      WHERE slug IN (${placeholders}) AND status = 'published'
      ORDER BY array_position(ARRAY[${placeholders}], slug)
    `
    
    const result = await pool.query(query, slugs)
    
    return result.rows.map((row) => ({
      id: row.id,
      title: row.title,
      slug: row.slug,
      description: row.description || undefined,
      status: row.status,
      schema: typeof row.schema === 'string' ? JSON.parse(row.schema) : row.schema,
      settings: {
        submitButtonText: row.settings_submit_button_text || undefined,
        successMessage: row.settings_success_message || undefined,
        allowMultipleSubmissions: row.settings_allow_multiple_submissions ?? undefined,
      },
      created_at: row.created_at,
      updated_at: row.updated_at,
    })) as Form[]
  } catch (error) {
    console.error('Error fetching forms by slugs:', error)
    throw error
  }
}

/**
 * Fetch form by ID (for submission)
 */
export async function getFormById(id: number): Promise<Form | null> {
  try {
    const query = `
      SELECT 
        id,
        title,
        slug,
        description,
        status,
        schema,
        settings_submit_button_text,
        settings_success_message,
        settings_allow_multiple_submissions,
        created_at,
        updated_at
      FROM forms
      WHERE id = $1 AND status = 'published'
      LIMIT 1
    `
    
    const result = await pool.query(query, [id])
    
    if (result.rows.length === 0) {
      return null
    }
    
    const row = result.rows[0]
    
    // Parse JSON fields if they're strings (PostgreSQL might return JSON as string)
    return {
      id: row.id,
      title: row.title,
      slug: row.slug,
      description: row.description || undefined,
      status: row.status,
      schema: typeof row.schema === 'string' ? JSON.parse(row.schema) : row.schema,
      settings: {
        submitButtonText: row.settings_submit_button_text || undefined,
        successMessage: row.settings_success_message || undefined,
        allowMultipleSubmissions: row.settings_allow_multiple_submissions ?? undefined,
      },
      created_at: row.created_at,
      updated_at: row.updated_at,
    } as Form
  } catch (error) {
    console.error('Error fetching form by ID:', error)
    throw error
  }
}
