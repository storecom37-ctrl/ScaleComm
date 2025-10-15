import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET() {
  try {
    const cookieStore = await cookies()
    const tokens = cookieStore.get('gmb-tokens')
    
    if (!tokens) {
      return NextResponse.json({ tokens: null })
    }

    const tokenData = JSON.parse(tokens.value)
    
    // Normalize expiry field for consistency
    if (tokenData.expiry_date && !tokenData.expires_at) {
      tokenData.expires_at = tokenData.expiry_date
    } else if (tokenData.expires_at && !tokenData.expiry_date) {
      tokenData.expiry_date = tokenData.expires_at
    }
    
    return NextResponse.json({
      tokens: tokenData
    })
  } catch (error: unknown) {
    console.error('Error getting GMB tokens:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to get tokens'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate required token fields
    const requiredFields = ['access_token', 'token_type']
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        )
      }
    }

    // Format token data to match expected structure
    // Normalize both expiry field names for compatibility
    const expiryTime = body.expiry_date || body.expires_at
    const tokenData = {
      access_token: body.access_token,
      refresh_token: body.refresh_token,
      token_type: body.token_type,
      scope: body.scope,
      expires_at: expiryTime,
      expiry_date: expiryTime,
      id_token: body.id_token,
      refresh_token_expires_in: body.refresh_token_expires_in
    }

    // Store tokens in HTTP-only cookie
    const response = NextResponse.json({
      success: true,
      message: 'GMB tokens stored successfully'
    })
    
    response.cookies.set('gmb-tokens', JSON.stringify(tokenData), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/'
    })

    return response
  } catch (error: unknown) {
    console.error('Error storing GMB tokens:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to store tokens'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
