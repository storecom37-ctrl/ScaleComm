import { NextResponse } from 'next/server'
import { clearSession } from '@/lib/utils/session'

export async function POST() {
  try {
    await clearSession()
    
    return NextResponse.json({
      success: true,
      message: 'Logged out successfully'
    })
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json(
      { success: false, error: 'An error occurred during logout' },
      { status: 500 }
    )
  }
}





