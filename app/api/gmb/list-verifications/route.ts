import { NextRequest, NextResponse } from 'next/server'
import { GmbApiServerService } from '@/lib/server/gmb-api-server'
import { getGmbTokensFromRequest } from '@/lib/utils/auth-helpers'

export async function POST(request: NextRequest) {
  try {
    const { locationName } = await request.json()
    
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
    
    // List verifications for the location
    const verifications = await gmbService.listVerifications(locationName)

    return NextResponse.json({
      success: true,
      data: verifications,
      message: 'Verifications listed successfully'
    })

  } catch (error) {
    console.error('Error listing verifications:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to list verifications'
      },
      { status: 500 }
    )
  }
}

