import { NextRequest, NextResponse } from 'next/server'
import { dataLayer } from '@/lib/dataLayer'
import { getFormById } from '@/lib/forms'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('Step save received:', { 
      formId: body.formId, 
      stepIndex: body.stepIndex,
      hasData: !!body.data,
      recordId: body.recordId
    })
    
    const { formId, stepIndex, data, recordId } = body

    if (!formId || stepIndex === undefined || !data) {
      console.error('Missing required fields:', { formId, stepIndex, hasData: !!data })
      return NextResponse.json(
        { error: 'Missing formId, stepIndex, or data' },
        { status: 400 }
      )
    }

    // Convert formId to number if it's a string
    const formIdNum = typeof formId === 'string' ? parseInt(formId, 10) : formId
    const stepIndexNum = typeof stepIndex === 'string' ? parseInt(stepIndex, 10) : stepIndex

    if (isNaN(formIdNum) || isNaN(stepIndexNum)) {
      return NextResponse.json(
        { error: 'Invalid form ID or step index' },
        { status: 400 }
      )
    }

    // Verify the form exists
    const form = await getFormById(formIdNum)

    if (!form) {
      return NextResponse.json(
        { error: 'Form not found' },
        { status: 404 }
      )
    }

    // Clean submission data - remove form button states and ensure flat structure
    const cleanData: Record<string, any> = {}
    Object.keys(data).forEach((key) => {
      if (key !== 'submit' && key !== 'cancel' && !key.startsWith('_') && !key.startsWith('$')) {
        cleanData[key] = data[key]
      }
    })

    // Store metadata about current form and step for navigation
    const metadata = {
      currentFormId: formIdNum,
      currentStepIndex: stepIndexNum,
      lastUpdated: new Date().toISOString(),
      savedAtStep: stepIndexNum,
    }
    
    console.log('Saving step metadata:', {
      formId: formIdNum,
      stepIndex: stepIndexNum,
      hasData: Object.keys(cleanData).length > 0,
      dataKeys: Object.keys(cleanData).slice(0, 5),
    })

    if (Object.keys(cleanData).length === 0) {
      console.warn('No data to save after cleaning')
    }

    // Get metadata from request
    const ipAddress = request.headers.get('x-forwarded-for') || 
                      request.headers.get('x-real-ip') || 
                      'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'
    const ipAddr = (ipAddress.split(',')[0] || 'unknown').trim()
    const userAgentStr = (userAgent || 'unknown').substring(0, 500)

    // Parse recordId if provided
    const recordIdNum = recordId ? (typeof recordId === 'string' ? parseInt(recordId, 10) : recordId) : null

    console.log('Preparing to save:', {
      recordId: recordIdNum,
      formId: formIdNum,
      stepIndex: stepIndexNum,
      newDataKeys: Object.keys(cleanData),
      newDataCount: Object.keys(cleanData).length
    })

    let result: any
    
    if (recordIdNum) {
      // Update existing record by ID
      const existingResult = await dataLayer('submissions', 'form_step_saves', 'read', {
        columns: ['id', 'data'],
        where: [{ column: 'id', operator: '=', value: recordIdNum }],
        limit: 1,
      })
      
      const existingRows = existingResult.rows || []
      
      if (existingRows.length > 0) {
        // Merge new data with existing data
        const existingData = existingRows[0].data || {}
        const { _metadata: existingMeta, ...existingFormData } = existingData as any
        
        const mergedData = {
          ...existingFormData,
          ...cleanData,
          _metadata: metadata,
        }
        
        console.log('Updating existing record:', {
          recordId: recordIdNum,
          existingKeys: Object.keys(existingFormData),
          newKeys: Object.keys(cleanData),
          mergedKeys: Object.keys(mergedData),
        })
        
        result = await dataLayer('submissions', 'form_step_saves', 'update', {
          data: {
            data: mergedData,
            updated_at: new Date(),
          },
          where: [{ column: 'id', operator: '=', value: recordIdNum }],
          returning: ['id'],
        })
      } else {
        // Record ID provided but not found - create new
        console.warn('Record ID not found, creating new record')
        const newDataWithMetadata = {
          ...cleanData,
          _metadata: metadata,
        }
        
        result = await dataLayer('submissions', 'form_step_saves', 'create', {
          data: {
            data: newDataWithMetadata,
            metadata_ip_address: ipAddr,
            metadata_user_agent: userAgentStr,
            created_at: new Date(),
            updated_at: new Date(),
          },
          returning: ['id'],
        })
      }
    } else {
      // No record ID - create new record
      const newDataWithMetadata = {
        ...cleanData,
        _metadata: metadata,
      }
      
      console.log('Creating new record')
      
      result = await dataLayer('submissions', 'form_step_saves', 'create', {
        data: {
          data: newDataWithMetadata,
          metadata_ip_address: ipAddr,
          metadata_user_agent: userAgentStr,
          created_at: new Date(),
          updated_at: new Date(),
        },
        returning: ['id'],
      })
    }

    if (!result.success) {
      throw new Error(result.details || result.error)
    }

    const savedRecordId = result.data?.id || recordIdNum

    console.log('Step save successful:', {
      recordId: savedRecordId,
      formId: formIdNum,
      stepIndex: stepIndexNum,
      newFieldsCount: Object.keys(cleanData).length,
      wasUpdate: !!recordIdNum
    })

    return NextResponse.json({
      success: true,
      recordId: savedRecordId,
      message: 'Form data saved successfully',
      isUpdate: !!recordIdNum,
    })
  } catch (error: any) {
    console.error('Step save error:', error)
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      stack: error.stack,
      name: error.name,
    })
    
    const errorResponse: any = {
      error: 'Failed to save step data',
    }
    
    if (process.env.NODE_ENV === 'development') {
      errorResponse.details = error.message
      errorResponse.code = error.code
      errorResponse.detail = error.detail
      errorResponse.stack = error.stack
    }
    
    return NextResponse.json(
      errorResponse,
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
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
