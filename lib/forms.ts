import { adminDb } from './db'

/**
 * Form definitions are stored in the admin database (hi_poc_fresh), table: forms.
 * Submissions/step data use the submissions DB (form_step_saves, etc.).
 */
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
    const result = await adminDb`
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
      WHERE slug = ${slug} AND status = 'published'
      LIMIT 1
    `
    
    if (result.length === 0) {
      return null
    }
    
    const row = result[0]
    
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
    
    const result = await adminDb`
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
      WHERE slug = ANY(${slugs}) AND status = 'published'
      ORDER BY array_position(${slugs}::text[], slug)
    `
    
    return result.map((row) => ({
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
    const result = await adminDb`
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
      WHERE id = ${id} AND status = 'published'
      LIMIT 1
    `
    
    if (result.length === 0) {
      return null
    }
    
    const row = result[0]
    
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

/**
 * Fetch form by ID without status restriction (for admin operations)
 */
export async function getFormByIdAdmin(id: number): Promise<Form | null> {
  try {
    const result = await adminDb`
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
      WHERE id = ${id}
      LIMIT 1
    `
    
    if (result.length === 0) {
      return null
    }
    
    const row = result[0]
    
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
    console.error('Error fetching form by ID (admin):', error)
    throw error
  }
}

/**
 * Update form schema in database
 */
export async function updateFormSchema(id: number, schema: any): Promise<boolean> {
  try {
    const schemaJson = typeof schema === 'string' ? schema : JSON.stringify(schema)
    
    const result = await adminDb`
      UPDATE forms
      SET 
        schema = ${schemaJson}::jsonb,
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING id
    `
    
    return result.length > 0
  } catch (error) {
    console.error('Error updating form schema:', error)
    throw error
  }
}
