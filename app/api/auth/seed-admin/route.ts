import { NextResponse } from 'next/server'
import { seedSuperAdmin } from '@/lib/utils/seed-super-admin'

/**
 * API endpoint to seed super admin user
 * For development purposes only - should be disabled in production
 */
export async function POST() {
  try {
    // Only allow in development
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { success: false, error: 'This endpoint is disabled in production' },
        { status: 403 }
      )
    }

    const result = await seedSuperAdmin()

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message,
        data: result.user
      })
    } else {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Seed admin error:', error)
    return NextResponse.json(
      { success: false, error: 'An error occurred while seeding admin' },
      { status: 500 }
    )
  }
}





