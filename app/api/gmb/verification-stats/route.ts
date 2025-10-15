import { NextRequest, NextResponse } from 'next/server'
import { getGmbTokensFromRequest } from '@/lib/utils/auth-helpers'
import connectDB from '@/lib/database/connection'
import { VerificationService } from '@/lib/services/verification-service'
import { Store } from '@/lib/database/models'

export async function GET(request: NextRequest) {
  try {
    await connectDB()
    
    const { searchParams } = new URL(request.url)
    const brandId = searchParams.get('brandId')
    const storeId = searchParams.get('storeId')

    // Get GMB tokens for authentication check
    const tokens = await getGmbTokensFromRequest()
    if (!tokens) {
      return NextResponse.json(
        { success: false, error: 'GMB authentication required' },
        { status: 401 }
      )
    }

    if (storeId) {
      // Get verification history for a specific store
      const verificationHistory = await VerificationService.getVerificationHistory(storeId)
      
      return NextResponse.json({
        success: true,
        data: {
          verificationHistory,
          storeId
        },
        message: 'Verification history retrieved successfully'
      })
    }

    if (brandId) {
      // Get verification statistics for a brand
      const stats = await VerificationService.getVerificationStats(brandId)
      
      return NextResponse.json({
        success: true,
        data: stats,
        message: 'Verification statistics retrieved successfully'
      })
    }

    // Get stores with pending verifications
    const pendingStores = await VerificationService.getStoresWithPendingVerifications()
    
    return NextResponse.json({
      success: true,
      data: {
        pendingStores,
        count: pendingStores.length
      },
      message: 'Pending verification stores retrieved successfully'
    })

  } catch (error) {
    console.error('Error getting verification stats:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get verification statistics'
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB()
    
    const { action, storeId, brandId } = await request.json()
    
    // Get GMB tokens for authentication check
    const tokens = await getGmbTokensFromRequest()
    if (!tokens) {
      return NextResponse.json(
        { success: false, error: 'GMB authentication required' },
        { status: 401 }
      )
    }

    switch (action) {
      case 'cleanup':
        // Clean up old verification attempts
        const cleanedCount = await VerificationService.cleanupOldVerificationAttempts()
        
        return NextResponse.json({
          success: true,
          data: { cleanedCount },
          message: `Cleaned up ${cleanedCount} old verification attempts`
        })

      case 'initialize':
        // Initialize GMB data for a store
        if (!storeId) {
          return NextResponse.json(
            { success: false, error: 'Store ID is required for initialization' },
            { status: 400 }
          )
        }

        const initialized = await VerificationService.initializeGmbData(storeId)
        
        return NextResponse.json({
          success: initialized,
          message: initialized ? 'GMB data initialized successfully' : 'Failed to initialize GMB data'
        })

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action specified' },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('Error processing verification stats request:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to process request'
      },
      { status: 500 }
    )
  }
}

