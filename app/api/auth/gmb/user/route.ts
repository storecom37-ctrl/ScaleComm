import { NextResponse } from 'next/server'
import { getGmbTokensFromRequest, getCurrentUserProfile } from '@/lib/utils/auth-helpers'

export async function GET() {
  try {
    const tokens = await getGmbTokensFromRequest()
    
    if (!tokens) {
      return NextResponse.json({ 
        success: false,
        error: 'No authentication tokens found' 
      }, { status: 401 })
    }

    // Get current user's full profile from tokens
    const profile = await getCurrentUserProfile(tokens)
    
    if (!profile || !profile.email) {
      return NextResponse.json({ 
        success: false,
        error: 'Could not retrieve user profile from tokens' 
      }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      data: {
        email: profile.email,
        name: profile.name,
        given_name: profile.given_name,
        family_name: profile.family_name,
        picture: profile.picture,
        verified_email: profile.verified_email,
        authenticated: true
      }
    })
  } catch (error) {
    console.error('Error getting current user:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to get current user information' 
      },
      { status: 500 }
    )
  }
}
