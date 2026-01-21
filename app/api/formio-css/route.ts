import { readFile } from 'fs/promises'
import { join } from 'path'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Read Form.io CSS from node_modules
    const formioPath = join(process.cwd(), 'node_modules', 'formiojs', 'dist', 'formio.full.min.css')
    const cssContent = await readFile(formioPath, 'utf-8')
    
    return new NextResponse(cssContent, {
      headers: {
        'Content-Type': 'text/css',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch (error) {
    console.error('Error reading Form.io CSS:', error)
    // Fallback to CDN if local file not found
    return NextResponse.redirect('https://cdn.form.io/formiojs/formio.form.min.css')
  }
}
