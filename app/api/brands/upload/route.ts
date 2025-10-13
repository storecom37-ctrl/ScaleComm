
import { NextRequest, NextResponse } from 'next/server'
import { uploadToS3, generateFileKey, validateImageFile, fileToBuffer } from '@/lib/services/aws-s3'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const folder = formData.get('folder') as string || 'brands'

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file
    const validation = validateImageFile(file)
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      )
    }

    // Convert file to buffer
    const buffer = await fileToBuffer(file)

    // Generate unique file key
    const key = generateFileKey(file.name, folder)

    // Upload to S3
    const result = await uploadToS3(buffer, key, file.type)

    return NextResponse.json({
      success: true,
      data: result,
      message: 'File uploaded successfully'
    })
  } catch (error) {
    console.error('Error uploading file:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to upload file' },
      { status: 500 }
    )
  }
}


