import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST() {
  try {
    const cookieStore = await cookies()
    const tokens = cookieStore.get('gmb-tokens')
    
    if (tokens) {
      const tokenData = JSON.parse(tokens.value)
      
      // Revoke the token with Google
      if (tokenData.access_token) {
        try {
          await fetch(`https://oauth2.googleapis.com/revoke?token=${tokenData.access_token}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded'
            }
          })
        } catch (error) {
          console.warn('Failed to revoke token with Google:', error)
          // Continue with local cleanup even if revocation fails
        }
      }
    }

    // Clear the cookie
    const response = NextResponse.json({ success: true })
    response.cookies.delete('gmb-tokens')
    
    return response
  } catch (error: unknown) {
    console.error('Error disconnecting GMB:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to disconnect'
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    )
  }
}
