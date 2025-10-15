import { NextRequest, NextResponse } from 'next/server'
import { googleOAuthServerClient } from '@/lib/server/google-oauth-server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const error = searchParams.get('error')

    if (error) {
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/dashboard/overview?error=${encodeURIComponent(error)}`
      )
    }

    if (!code) {
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/dashboard/overview?error=no_code`
      )
    }

    // Exchange code for tokens
    const tokens = await googleOAuthServerClient.getTokensFromCode(code)
    
    // Store tokens in HTTP-only cookie
    const response = NextResponse.redirect(`${process.env.NEXTAUTH_URL}/dashboard/overview?connected=true`)
    
    response.cookies.set('gmb-tokens', JSON.stringify(tokens), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/'
    })

    return response
  } catch (error: unknown) {
    console.error('GMB OAuth callback error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Authentication failed'
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/dashboard/overview?error=${encodeURIComponent(errorMessage)}`
    )
  }
}
