import { NextRequest, NextResponse } from 'next/server'
import { GmbApiServerService } from '@/lib/server/gmb-api-server'
import { getGmbTokensFromRequest } from '@/lib/utils/auth-helpers'
import connectDB from '@/lib/database/connection'
import { Store } from '@/lib/database/models'
import { VerificationService } from '@/lib/services/verification-service'

export async function POST(request: NextRequest) {
  try {
    await connectDB()
    
    const { verificationName, completionDetails, storeId } = await request.json()
    
    if (!verificationName || !completionDetails) {
      return NextResponse.json(
        { success: false, error: 'Verification name and completion details are required' },
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
    
    // Complete verification process
    const completionResult = await gmbService.completeVerification(verificationName, completionDetails)

    // Update store with verification completion in database if storeId is provided
    if (storeId) {
      try {
        // Extract verification ID from the verification name
        const verificationId = verificationName.split('/').pop()

        // Complete the verification attempt
        const success = await VerificationService.completeVerificationAttempt(
          storeId,
          verificationId || verificationName,
          true, // Assuming successful completion means verified
          {
            verificationCode: completionDetails.pin || completionDetails.code,
            notes: 'Verification completed successfully via API'
          }
        )

      
      } catch (dbError) {
        console.error('Error updating store verification completion:', dbError)
        // Don't fail the entire request if database update fails
      }
    }

    return NextResponse.json({
      success: true,
      data: completionResult,
      message: 'Verification completed successfully'
    })

  } catch (error) {
    console.error('Error completing verification:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to complete verification process'
      },
      { status: 500 }
    )
  }
}
