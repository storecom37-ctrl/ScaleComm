import mongoose from 'mongoose'

// Error types
interface ApiError extends Error {
  statusCode?: number
  code?: string
}

interface MongooseError extends Error {
  code?: number | string
  keyPattern?: Record<string, unknown>
  keyValue?: Record<string, unknown>
}

declare global {
  var mongoose: {
    conn: typeof mongoose | null
    promise: Promise<typeof mongoose> | null
  }
}
