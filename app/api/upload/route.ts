import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

/**
 * File Upload API Route
 * 
 * POST /api/upload
 * 
 * Accepts multipart/form-data with file(s)
 * Saves files to /documents directory
 * 
 * Request: FormData with 'file' or 'files' field
 * Response: { success: true, files: [{ name, path, size, type }] }
 */

// Configure upload directory
const UPLOAD_DIR = path.join(process.cwd(), 'documents')

// Allowed file types (MIME types)
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
]

// Max file size (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024

interface UploadedFile {
  originalName: string
  savedName: string
  path: string
  size: number
  type: string
}

export async function POST(request: NextRequest) {
  try {
    // Ensure upload directory exists
    if (!existsSync(UPLOAD_DIR)) {
      await mkdir(UPLOAD_DIR, { recursive: true })
    }

    // Parse form data
    const formData = await request.formData()
    
    // Get all files from form data
    const files: File[] = []
    
    // Check for 'file' field (single file)
    const singleFile = formData.get('file')
    if (singleFile && singleFile instanceof File) {
      files.push(singleFile)
    }
    
    // Check for 'files' field (multiple files)
    const multipleFiles = formData.getAll('files')
    multipleFiles.forEach((file) => {
      if (file instanceof File) {
        files.push(file)
      }
    })

    if (files.length === 0) {
      return NextResponse.json(
        { error: 'No files provided' },
        { status: 400 }
      )
    }

    const uploadedFiles: UploadedFile[] = []
    const errors: string[] = []

    for (const file of files) {
      // Validate file type
      if (!ALLOWED_TYPES.includes(file.type)) {
        errors.push(`File "${file.name}" has unsupported type: ${file.type}`)
        continue
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        errors.push(`File "${file.name}" exceeds max size of 10MB`)
        continue
      }

      // Generate unique filename
      const timestamp = Date.now()
      const randomStr = Math.random().toString(36).substring(2, 8)
      const ext = path.extname(file.name)
      const baseName = path.basename(file.name, ext).replace(/[^a-zA-Z0-9-_]/g, '_')
      const savedName = `${baseName}_${timestamp}_${randomStr}${ext}`
      const filePath = path.join(UPLOAD_DIR, savedName)

      // Read file buffer and save
      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)
      await writeFile(filePath, buffer)

      uploadedFiles.push({
        originalName: file.name,
        savedName: savedName,
        path: `/documents/${savedName}`,
        size: file.size,
        type: file.type,
      })
    }

    if (uploadedFiles.length === 0 && errors.length > 0) {
      return NextResponse.json(
        { error: 'All files failed validation', details: errors },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `${uploadedFiles.length} file(s) uploaded successfully`,
      files: uploadedFiles,
      errors: errors.length > 0 ? errors : undefined,
    })

  } catch (error: any) {
    console.error('File upload error:', error)
    return NextResponse.json(
      { error: 'Failed to upload file', details: error.message },
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
