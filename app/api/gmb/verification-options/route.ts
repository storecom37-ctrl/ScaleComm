import { NextRequest, NextResponse } from 'next/server'
import { GmbApiServerService } from '@/lib/server/gmb-api-server'
import { getGmbTokensFromRequest } from '@/lib/utils/auth-helpers'

export async function POST(request: NextRequest) {
  try {
    const { locationName, languageCode = 'en-US' } = await request.json()
    
    if (!locationName) {
      return NextResponse.json(
        { success: false, error: 'Location name is required' },
        { status: 400 }
      )
    }

    // Get GMB tokens
    const tokens = await getGmbTokensFromRequest()
    if (!tokens) {
      return NextResponse.json(
        { success: false, error: 'GMB authentication required. Please connect your GMB account first.' },
        { status: 401 }
      )
    }

    // Initialize GMB API service
    const gmbService = new GmbApiServerService(tokens)
    
    // Fetch verification options
    const verificationOptions = await gmbService.fetchVerificationOptions(locationName, languageCode)

    return NextResponse.json({
      success: true,
      data: verificationOptions,
      message: 'Verification options fetched successfully'
    })

  } catch (error) {
    console.error('Error fetching verification options:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch verification options'
      },
      { status: 500 }
    )
  }
}

