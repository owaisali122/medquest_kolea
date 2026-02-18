import { NextRequest, NextResponse } from 'next/server'
import { dataLayer } from '@/lib/dataLayer'

/**
 * GET /api/forms/get-session-state
 * Retrieves form data by record ID
 * 
 * Query params:
 *   - recordId (required): The database record ID to fetch
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const recordId = searchParams.get('recordId')

    if (!recordId) {
      return NextResponse.json({
        hasSavedState: false,
        recordId: null,
        currentForm: null,
        currentPage: null,
        data: {},
      })
    }

    const result = await dataLayer('submissions', 'form_step_saves', 'read', {
      columns: ['id', 'data', 'created_at', 'updated_at'],
      where: [{ column: 'id', operator: '=', value: parseInt(recordId, 10) }],
      limit: 1,
    })

    if (!result.success) {
      throw new Error(result.details || result.error)
    }

    if (!result.rows || result.rows.length === 0) {
      // Record not found
      return NextResponse.json({
        hasSavedState: false,
        recordId: null,
        currentForm: null,
        currentPage: null,
        data: {},
      })
    }

    const savedRecord = result.rows[0]
    const savedData = savedRecord.data || {}

    // Extract metadata and form data separately
    const { _metadata, ...formData } = savedData as any

    // Get current form and page from metadata
    const currentForm = _metadata?.currentFormId || null
    const currentPage = _metadata?.currentStepIndex !== undefined ? _metadata.currentStepIndex : null
    const maxStepIndex = _metadata?.maxStepIndex !== undefined ? _metadata.maxStepIndex : currentPage

    return NextResponse.json({
      hasSavedState: true,
      recordId: savedRecord.id,
      currentForm: currentForm,
      currentPage: currentPage,
      maxStepIndex: maxStepIndex,
      data: formData,
      metadata: _metadata || null,
      createdAt: savedRecord.created_at,
      updatedAt: savedRecord.updated_at,
    })
  } catch (error: any) {
    console.error('Get session state error:', error)
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
    })

    return NextResponse.json(
      {
        error: 'Failed to get session state',
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
