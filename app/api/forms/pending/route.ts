import { NextRequest, NextResponse } from 'next/server'
import { dataLayer } from '@/lib/dataLayer'
import { getFormById } from '@/lib/forms'

/**
 * GET /api/forms/pending
 * Retrieves all pending/incomplete forms
 * Forms are identified by their primary key (id) and can be continued via URL params
 */
export async function GET() {
  try {
    // Get all pending forms ordered by most recently updated
    const result = await dataLayer('submissions', 'form_step_saves', 'read', {
      columns: [
        'id',
        'data',
        'metadata_ip_address',
        'metadata_user_agent',
        'created_at',
        'updated_at',
      ],
      orderBy: [{ column: 'updated_at', direction: 'DESC' }],
    })

    if (!result.success) {
      throw new Error(result.details || result.error)
    }

    const rows = result.rows || []

    // Enrich with form details and extract metadata
    const pendingForms = await Promise.all(
      rows.map(async (row: any) => {
        try {
          const formData = row.data || {}
          const { _metadata, ...cleanData } = formData as any

          // Get form ID from metadata
          const formId = _metadata?.currentFormId || 8
          const stepIndex = _metadata?.currentStepIndex ?? 0

          let form = null
          if (formId) {
            try {
              form = await getFormById(formId)
            } catch (e) {
              console.error(`Error fetching form ${formId}:`, e)
            }
          }

          return {
            id: row.id,
            formId: formId,
            formTitle: form?.title || 'Simple Stepper Form',
            formSlug: form?.slug || 'simple-stepper',
            stepIndex: stepIndex,
            currentForm: formId,
            currentStep: stepIndex,
            lastUpdated: row.updated_at,
            createdAt: row.created_at,
            ipAddress: row.metadata_ip_address,
            userAgent: row.metadata_user_agent,
            hasData: Object.keys(cleanData).length > 0,
          }
        } catch (error) {
          console.error(`Error processing row ${row.id}:`, error)
          return {
            id: row.id,
            formId: 8,
            formTitle: 'Simple Stepper Form',
            formSlug: 'simple-stepper',
            stepIndex: 0,
            currentForm: 8,
            currentStep: 0,
            lastUpdated: row.updated_at,
            createdAt: row.created_at,
            ipAddress: row.metadata_ip_address,
            userAgent: row.metadata_user_agent,
            hasData: false,
          }
        }
      })
    )

    return NextResponse.json({
      success: true,
      count: pendingForms.length,
      forms: pendingForms,
    })
  } catch (error: any) {
    console.error('Get pending forms error:', error)
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
    })

    return NextResponse.json(
      {
        error: 'Failed to get pending forms',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    )
  }
}

// Handle preflight requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
