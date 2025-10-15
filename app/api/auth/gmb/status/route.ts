import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { googleOAuthServerClient } from '@/lib/server/google-oauth-server'

export async function GET() {
  try {
    const cookieStore = await cookies()
    const tokens = cookieStore.get('gmb-tokens')
    
    if (!tokens) {
      return NextResponse.json({ 
        isAuthenticated: false,
        tokens: null 
      })
    }

    let tokenData
    try {
      tokenData = JSON.parse(tokens.value)
    } catch (parseError) {
      console.error('Error parsing GMB tokens:', parseError)
      // Clear invalid cookie
      const response = NextResponse.json({ 
        isAuthenticated: false,
        tokens: null 
      })
      response.cookies.delete('gmb-tokens')
      return response
    }
    
    // Verify token is still valid
    const isValid = await googleOAuthServerClient.verifyToken(tokenData.access_token)
    
    if (!isValid) {
      // Token is invalid, remove it
      const response = NextResponse.json({ 
        isAuthenticated: false,
        tokens: null 
      })
      response.cookies.delete('gmb-tokens')
      return response
    }

    return NextResponse.json({
      isAuthenticated: true,
      tokens: tokenData
    })
  } catch (error) {
    console.error('Error checking GMB auth status:', error)
    return NextResponse.json(
      { error: 'Failed to check authentication status' },
      { status: 500 }
    )
  }
}
