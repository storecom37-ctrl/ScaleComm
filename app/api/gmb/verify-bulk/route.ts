import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/database/connection'
import { Store } from '@/lib/database/models'
import { GmbApiServerService } from '@/lib/server/gmb-api-server'

// Helper function to get GMB tokens
async function getGmbTokensFromRequest(request: NextRequest) {
  try {
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
    
    const { storeIds, gmbLocationIds } = await request.json()
    
    if (!storeIds || !Array.isArray(storeIds) || storeIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Store IDs array is required' },
        { status: 400 }
      )
    }

    if (!gmbLocationIds || !Array.isArray(gmbLocationIds) || gmbLocationIds.length !== storeIds.length) {
      return NextResponse.json(
        { success: false, error: 'GMB Location IDs array is required and must match store IDs length' },
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
    
    // Get all GMB locations at once for efficiency
    let allLocations: any[] = []
    try {
      const accounts = await gmbService.getAccounts()
      
      for (const account of accounts) {
        try {
          const locations = await gmbService.getLocations(account.name)
          allLocations = allLocations.concat(locations)
        } catch (error) {
          console.error(`Error fetching locations for account ${account.name}:`, error)
        }
      }
    } catch (error) {
      console.error('Error fetching GMB accounts:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch GMB data' },
        { status: 500 }
      )
    }

    // Process each store
    const results = []
    const errors = []
    
    for (let i = 0; i < storeIds.length; i++) {
      const storeId = storeIds[i]
      const gmbLocationId = gmbLocationIds[i]
      
      try {
        // Find the location in our fetched data
        const location = allLocations.find((loc: any) => loc.id === gmbLocationId)
        
        if (!location) {
          errors.push({
            storeId,
            gmbLocationId,
            error: 'GMB location not found'
          })
          continue
        }

        // Get current store data
        const currentStore = await Store.findById(storeId)
        if (!currentStore) {
          errors.push({
            storeId,
            gmbLocationId,
            error: 'Store not found in database'
          })
          continue
        }

        const previousVerifiedStatus = currentStore.gmbData?.verified || currentStore.verified || false
        const newVerifiedStatus = location.verified

        // Update store verification status
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
              source: 'bulk_verification'
            }
          }
        }

        const updatedStore = await Store.findByIdAndUpdate(
          storeId,
          updateData,
          { new: true }
        )

        if (updatedStore) {
          results.push({
            storeId: updatedStore._id,
            storeName: updatedStore.name,
            verified: newVerifiedStatus,
            previousVerified: previousVerifiedStatus,
            statusChanged: previousVerifiedStatus !== newVerifiedStatus
          })
        } else {
          errors.push({
            storeId,
            gmbLocationId,
            error: 'Failed to update store'
          })
        }
      } catch (error) {
        console.error(`Error processing store ${storeId}:`, error)
        errors.push({
          storeId,
          gmbLocationId,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    const successCount = results.length
    const errorCount = errors.length
    const totalCount = storeIds.length

    return NextResponse.json({
      success: true,
      message: `Bulk verification completed: ${successCount} successful, ${errorCount} errors out of ${totalCount} stores`,
      data: {
        results,
        errors,
        summary: {
          total: totalCount,
          successful: successCount,
          failed: errorCount,
          successRate: totalCount > 0 ? (successCount / totalCount) * 100 : 0
        }
      }
    })

  } catch (error) {
    console.error('Error in bulk verification:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    )
  }
}

