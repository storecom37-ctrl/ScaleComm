import { NextResponse } from 'next/server'
import { googleOAuthServerClient } from '@/lib/server/google-oauth-server'

export async function GET() {
  try {
    const authUrl = googleOAuthServerClient.generateAuthUrl()
    
    return NextResponse.json({
      authUrl
    })
  } catch (error: unknown) {
    console.error('Error generating auth URL:', error)
    return NextResponse.json(
      { error: 'Failed to generate authentication URL' },
      { status: 500 }
    )
  }
}


