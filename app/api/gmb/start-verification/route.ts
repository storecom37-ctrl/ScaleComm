import { NextRequest, NextResponse } from 'next/server'
import { GmbApiServerService } from '@/lib/server/gmb-api-server'
import { getGmbTokensFromRequest } from '@/lib/utils/auth-helpers'
import connectDB from '@/lib/database/connection'
import { Store } from '@/lib/database/models'
import { VerificationService } from '@/lib/services/verification-service'

export async function POST(request: NextRequest) {
  try {
    await connectDB()
    
    const { locationName, verificationOptions, storeId } = await request.json()
    
    if (!locationName || !verificationOptions) {
      return NextResponse.json(
        { success: false, error: 'Location name and verification options are required' },
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
    
    // Start verification process
    const verificationResult = await gmbService.startVerification(locationName, verificationOptions)

    // Update store with verification attempt in database if storeId is provided
    if (storeId) {
      try {
        // Initialize GMB data if it doesn't exist
        await VerificationService.initializeGmbData(storeId)

        // Determine verification method from the request
        const method = verificationOptions.method || 'MANUAL'

        // Add verification attempt to history
        await VerificationService.addVerificationAttempt(storeId, {
          verificationId: verificationResult.name,
          method,
          status: 'PENDING',
          startedAt: new Date(),
          source: 'api_start_verification',
          details: {
            phoneNumber: verificationOptions.phoneNumber,
            emailAddress: verificationOptions.emailAddress
          }
        })

        
      } catch (dbError) {
        console.error('Error updating store verification history:', dbError)
        // Don't fail the entire request if database update fails
      }
    }

    return NextResponse.json({
      success: true,
      data: verificationResult,
      message: 'Verification process started successfully'
    })

  } catch (error) {
    console.error('Error starting verification:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to start verification process'
      },
      { status: 500 }
    )
  }
}
