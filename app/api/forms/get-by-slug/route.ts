import { NextRequest, NextResponse } from 'next/server'
import { getFormBySlug } from '@/lib/forms'

/**
 * GET /api/forms/get-by-slug
 * Fetches a form from the admin DB (forms table) by slug.
 *
 * Query parameters:
 * - slug: Required. The form slug to look up (e.g. 'panel-form', 'tabs').
 */
export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug')

  if (!slug || slug.trim() === '') {
    return NextResponse.json(
      { error: 'Query parameter "slug" is required' },
      { status: 400 }
    )
  }

  try {
    const form = await getFormBySlug(slug.trim())

    if (!form) {
      return NextResponse.json(
        { error: `Form not found for slug: ${slug}` },
        { status: 404 }
      )
    }

    return NextResponse.json(form)
  } catch (error) {
    console.error('Error fetching form by slug:', error)
    return NextResponse.json(
      { error: 'Failed to fetch form' },
      { status: 500 }
    )
  }
}
