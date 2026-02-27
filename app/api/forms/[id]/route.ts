import { NextRequest, NextResponse } from 'next/server'
import { getFormById } from '@/lib/forms'

/**
 * GET /api/forms/:id
 * Returns form schema (and meta) by form ID. Used by appDetailRef to embed another form.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const idNum = parseInt(id, 10)
  if (Number.isNaN(idNum) || idNum < 1) {
    return NextResponse.json({ error: 'Invalid form ID' }, { status: 400 })
  }

  try {
    const form = await getFormById(idNum)
    if (!form) {
      return NextResponse.json({ error: `Form not found: ${id}` }, { status: 404 })
    }
    return NextResponse.json(form)
  } catch (error) {
    console.error('Error fetching form by ID:', error)
    return NextResponse.json({ error: 'Failed to fetch form' }, { status: 500 })
  }
}
