import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/database/connection'
import { User } from '@/lib/database/user-model'

/**
 * Dev-only endpoint to delete a user by email
 */
export async function POST(req: NextRequest) {
  try {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { success: false, error: 'This endpoint is disabled in production' },
        { status: 403 }
      )
    }

    const { email } = await req.json().catch(() => ({})) as { email?: string }
    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      )
    }

    await connectDB()

    const result = await User.deleteOne({ email })
    if (result.deletedCount === 0) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, message: `Deleted user ${email}` })
  } catch (error) {
    console.error('Delete user error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete user' },
      { status: 500 }
    )
  }
}


