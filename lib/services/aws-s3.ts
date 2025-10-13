import { S3Client, PutObjectCommand, DeleteObjectCommand} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME!

if (!BUCKET_NAME) {
  throw new Error('AWS_S3_BUCKET_NAME environment variable is required')
}

export interface UploadResult {
  url: string
  key: string
}

/**
 * Upload file to S3
 */
export async function uploadToS3(
  file: Buffer,
  key: string,
  contentType: string = 'image/jpeg'
): Promise<UploadResult> {
  try {
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: file,
      ContentType: contentType,
    })

    await s3Client.send(command)

    const url = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${key}`

    return { url, key }
  } catch (error) {
    console.error('Error uploading to S3:', error)
    throw new Error('Failed to upload image')
  }
}

/**
 * Delete file from S3
 */
export async function deleteFromS3(key: string): Promise<void> {
  try {
    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    })

    await s3Client.send(command)
  } catch (error) {
    console.error('Error deleting from S3:', error)
    throw new Error('Failed to delete image')
  }
}

/**
 * Generate presigned URL for secure file upload
 */
export async function generatePresignedUrl(
  key: string,
  contentType: string = 'image/jpeg',
  expiresIn: number = 3600
): Promise<string> {
  try {
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      ContentType: contentType,
      ACL: 'public-read',
    })

    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn })
    return signedUrl
  } catch (error) {
    console.error('Error generating presigned URL:', error)
    throw new Error('Failed to generate upload URL')
  }
}

/**
 * Generate unique file key with timestamp and random string
 */
export function generateFileKey(originalName: string, folder: string = 'brands'): string {
  const timestamp = Date.now()
  const randomString = Math.random().toString(36).substring(2, 15)
  const extension = originalName.split('.').pop()
  
  return `${folder}/${timestamp}-${randomString}.${extension}`
}

/**
 * Validate image file
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  // Check file type
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed.'
    }
  }

  // Check file size (5MB limit)
  const maxSize = 5 * 1024 * 1024 // 5MB in bytes
  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'File size too large. Maximum size is 5MB.'
    }
  }

  return { valid: true }
}

/**
 * Convert File to Buffer (for server-side processing)
 */
export async function fileToBuffer(file: File): Promise<Buffer> {
  const arrayBuffer = await file.arrayBuffer()
  return Buffer.from(arrayBuffer)
}


