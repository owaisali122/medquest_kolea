import { NextRequest, NextResponse } from 'next/server'
import { dataLayer } from '@/lib/dataLayer'
import { getFormById } from '@/lib/forms'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('Form submission received:', { formId: body.formId, hasData: !!body.data })
    
    const { formId, data } = body

    if (!formId || !data) {
      console.error('Missing formId or data:', { formId, hasData: !!data })
      return NextResponse.json(
        { error: 'Missing formId or data' },
        { status: 400 }
      )
    }

    // Convert formId to number if it's a string
    const formIdNum = typeof formId === 'string' ? parseInt(formId, 10) : formId

    if (isNaN(formIdNum)) {
      return NextResponse.json(
        { error: 'Invalid form ID' },
        { status: 400 }
      )
    }

    // Verify the form exists and is published
    const form = await getFormById(formIdNum)

    if (!form) {
      return NextResponse.json(
        { error: 'Form not found' },
        { status: 404 }
      )
    }

    if (form.status !== 'published') {
      return NextResponse.json(
        { error: 'Form is not available for submissions' },
        { status: 400 }
      )
    }

    // Extract email from submission data if available
    let submitterEmail: string | null = null
    if (typeof data === 'object' && data !== null) {
      const emailFields = ['email', 'Email', 'EMAIL', 'e-mail', 'emailAddress']
      for (const field of emailFields) {
        if (data[field] && typeof data[field] === 'string') {
          submitterEmail = data[field]
          break
        }
      }
    }

    // Get metadata from request
    const ipAddress = request.headers.get('x-forwarded-for') || 
                      request.headers.get('x-real-ip') || 
                      'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    // Clean submission data - remove form button states
    const cleanData = { ...data }
    delete cleanData.submit
    delete cleanData.cancel

    const ipAddr = ipAddress.split(',')[0].trim()
    const userAgentStr = userAgent.substring(0, 500)

    // Use data layer to create submission
    const result = await dataLayer('submissions', 'form_submissions', 'create', {
      data: {
        form_id: formIdNum,
        data: cleanData,
        submitter_email: submitterEmail,
        submitted_at: new Date(),
        metadata_ip_address: ipAddr,
        metadata_user_agent: userAgentStr,
        created_at: new Date(),
        updated_at: new Date(),
      },
      returning: ['id'],
    })

    if (!result.success) {
      throw new Error(result.details || result.error)
    }

    console.log('Form submission saved successfully:', result.data?.id)

    return NextResponse.json({
      success: true,
      submissionId: result.data?.id,
      message: form.settings?.successMessage || 'Thank you for your submission!',
    })
  } catch (error: any) {
    console.error('Form submission error:', error)
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
    })
    
    return NextResponse.json(
      { 
        error: 'Failed to submit form',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
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
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
