import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/database/connection'
import { Store } from '@/lib/database/models'
import { GmbApiServerService } from '@/lib/server/gmb-api-server'

// Helper function to get GMB tokens
async function getGmbTokensFromRequest(request: NextRequest) {
  try {
    // Try to get tokens from session
    const tokenResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/auth/gmb/tokens`, {
      method: 'GET',
      headers: {
        'Cookie': request.headers.get('cookie') || '',
        'Content-Type': 'application/json'
      }
    })
    
    if (tokenResponse.ok) {
      const tokenData = await tokenResponse.json()
      return tokenData.tokens
    }
  } catch (error) {
    console.error('Error fetching GMB tokens from session:', error)
  }
  
  return null
}

export async function POST(request: NextRequest) {
  try {
    await connectDB()
    
    const { storeId, gmbLocationId, bulk = false } = await request.json()
    
    if (!storeId || !gmbLocationId) {
      return NextResponse.json(
        { success: false, error: 'Store ID and GMB Location ID are required' },
        { status: 400 }
      )
    }

    // Get GMB tokens
    const tokens = await getGmbTokensFromRequest(request)

    if (!tokens) {
      return NextResponse.json(
        { success: false, error: 'GMB authentication required. Please connect your GMB account first.' },
        { status: 401 }
      )
    }

    // Initialize GMB API service
    const gmbService = new GmbApiServerService(tokens)
    
    // Get the specific location details with better error handling
    let location = null
    let verificationError = null
    
    try {
      const accounts = await gmbService.getAccounts()
      
      for (const account of accounts) {
        try {
          const locations = await gmbService.getLocations(account.name)
          const foundLocation = locations.find((loc: any) => loc.id === gmbLocationId)
          if (foundLocation) {
            location = foundLocation
            break
          }
        } catch (error) {
          console.error(`Error fetching locations for account ${account.name}:`, error)
          verificationError = `Failed to fetch locations for account ${account.name}`
        }
      }
    } catch (error) {
      console.error('Error fetching GMB accounts:', error)
      verificationError = 'Failed to fetch GMB accounts'
    }

    if (!location) {
      return NextResponse.json(
        { 
          success: false, 
          error: verificationError || 'GMB location not found. Please ensure the store is properly connected to GMB.',
          code: 'LOCATION_NOT_FOUND'
        },
        { status: 404 }
      )
    }

    // Get current store data for comparison
    const currentStore = await Store.findById(storeId)
    if (!currentStore) {
      return NextResponse.json(
        { success: false, error: 'Store not found in database' },
        { status: 404 }
      )
    }

    const previousVerifiedStatus = (currentStore as any).gmbData?.verified || currentStore.verified || false
    const newVerifiedStatus = location.verified

    // Update store verification status in database with history tracking
    const updateData = {
      $set: { 
        'gmbData.verified': newVerifiedStatus,
        'gmbData.lastSyncAt': new Date(),
        'gmbData.lastVerificationCheck': new Date(),
        verified: newVerifiedStatus
      },
      $push: {
        'gmbData.verificationHistory': {
          verified: newVerifiedStatus,
          checkedAt: new Date(),
          previousStatus: previousVerifiedStatus,
          source: 'manual_verification'
        }
      }
    }

    const updatedStore = await Store.findByIdAndUpdate(
      storeId,
      updateData,
      { new: true }
    )

    if (!updatedStore) {
      return NextResponse.json(
        { success: false, error: 'Failed to update store verification status' },
        { status: 500 }
      )
    }

    // Determine the appropriate message based on status change
    let message = 'Store verification status updated'
    if (previousVerifiedStatus !== newVerifiedStatus) {
      message = newVerifiedStatus 
        ? 'Store is now verified in GMB!' 
        : 'Store verification status changed to unverified'
    } else {
      message = newVerifiedStatus 
        ? 'Store remains verified in GMB' 
        : 'Store remains unverified in GMB'
    }

    return NextResponse.json({
      success: true,
      message,
      data: {
        storeId: updatedStore._id,
        storeName: updatedStore.name,
        verified: newVerifiedStatus,
        previousVerified: previousVerifiedStatus,
        statusChanged: previousVerifiedStatus !== newVerifiedStatus,
        lastSyncAt: new Date(),
        verificationHistory: (updatedStore as any).gmbData?.verificationHistory || []
      }
    })

  } catch (error) {
    console.error('Error verifying store:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    )
  }
}
