import { NextRequest, NextResponse } from 'next/server'
import { dataLayer } from '@/lib/dataLayer'

/**
 * DELETE /api/forms/delete-record?id={recordId}
 * Deletes a form step save record
 */
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const recordId = searchParams.get('id')

    if (!recordId) {
      return NextResponse.json(
        { error: 'Missing record ID' },
        { status: 400 }
      )
    }

    const recordIdNum = parseInt(recordId, 10)

    if (isNaN(recordIdNum)) {
      return NextResponse.json(
        { error: 'Invalid record ID' },
        { status: 400 }
      )
    }

    // Delete the record
    const result = await dataLayer('submissions', 'form_step_saves', 'delete', {
      where: [{ column: 'id', operator: '=', value: recordIdNum }],
      returning: ['id'],
    })

    if (!result.success) {
      throw new Error(result.details || result.error)
    }

    return NextResponse.json({
      success: true,
      message: 'Record deleted successfully',
      deletedId: recordIdNum,
    })
  } catch (error: any) {
    console.error('Delete record error:', error)
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
    })

    return NextResponse.json(
      {
        error: 'Failed to delete record',
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
      'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
