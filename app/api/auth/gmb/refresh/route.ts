import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { refreshAndPersistTokens } from '@/lib/utils/token-refresh'

export async function POST() {
  try {
    const cookieStore = await cookies()
    const tokens = cookieStore.get('gmb-tokens')
    
    if (!tokens) {
      return NextResponse.json(
        { success: false, error: 'No tokens found' },
        { status: 401 }
      )
    }

    const tokenData = JSON.parse(tokens.value)
    
    if (!tokenData.refresh_token) {
      return NextResponse.json(
        { success: false, error: 'No refresh token available' },
        { status: 401 }
      )
    }

    // Use centralized token refresh utility
    const result = await refreshAndPersistTokens(tokenData)
    
    if (!result.success) {
      // If refresh fails, clear the cookie
      const response = NextResponse.json(
        { success: false, error: result.error || 'Failed to refresh token' },
        { status: 401 }
      )
      
      response.cookies.delete('gmb-tokens')
      return response
    }

    // Return the refreshed tokens
    return NextResponse.json({
      success: true,
      tokens: result.tokens
    })
  } catch (error: unknown) {
    console.error('Error refreshing GMB token:', error)
    
    // If refresh fails, clear the cookie
    const errorMessage = error instanceof Error ? error.message : 'Failed to refresh token'
    const response = NextResponse.json(
      { success: false, error: errorMessage },
      { status: 401 }
    )
    
    response.cookies.delete('gmb-tokens')
    return response
  }
}
