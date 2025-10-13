import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/database/connection'
import { Store, Brand } from '@/lib/database/models'
import { getGmbTokensFromRequest } from '@/lib/utils/auth-helpers'
import { GmbApiServerService } from '@/lib/server/gmb-api-server'

// GET /api/stores/gmb - Get stores with GMB integration
export async function GET(request: NextRequest) {
  try {
    await connectDB()

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''
    const brandId = searchParams.get('brandId') || ''
    const includeGmbData = searchParams.get('includeGmbData') === 'true'

    const skip = (page - 1) * limit

    // Build query for stores with GMB integration
    const query: Record<string, unknown> = {
      gmbLocationId: { $exists: true, $ne: null }
    }
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { storeCode: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { 'address.city': { $regex: search, $options: 'i' } },
        { 'address.state': { $regex: search, $options: 'i' } }
      ]
    }

    if (status) {
      query.status = status
    }

    if (brandId) {
      query.brandId = brandId
    }

    // Get stores with pagination and populate brand info
    const [stores, total] = await Promise.all([
      Store.find(query)
        .populate('brandId', 'name slug logo')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Store.countDocuments(query)
    ])

    // If requested, fetch latest GMB data for each store
    let storesWithGmbData = stores
    if (includeGmbData) {
      try {
        // Get GMB tokens from request
        const tokens = await getGmbTokensFromRequest()
        if (tokens) {
          // Initialize GMB API service
          const gmbService = new GmbApiServerService(tokens)

          // Get all accounts
          const accounts = await gmbService.getAccounts()
          
          // Create a map of account names to locations
          const accountLocationsMap = new Map<string, any[]>()
          
          for (const account of accounts) {
            try {
              const locations = await gmbService.getLocations(account.name)
              accountLocationsMap.set(account.name, locations)
            } catch (error) {
              console.error(`Error fetching locations for account ${account.name}:`, error)
            }
          }

          // Update stores with latest GMB data
          storesWithGmbData = stores.map(store => {
            const gmbAccountId = (store as any).gmbAccountId
            const gmbLocationId = (store as any).gmbLocationId
            
            if (gmbAccountId && gmbLocationId) {
              const accountLocations = accountLocationsMap.get(gmbAccountId) || []
              const gmbLocation = accountLocations.find((loc: any) => loc.id === gmbLocationId)
              
              if (gmbLocation) {
                return {
                  ...store,
                  gmbData: {
                    name: gmbLocation.name,
                    address: gmbLocation.address,
                    phone: gmbLocation.phoneNumber,
                    website: gmbLocation.websiteUrl,
                    categories: gmbLocation.categories,
                    verified: gmbLocation.verified,
                    lastSyncAt: new Date()
                  }
                }
              }
            }
            
            return store
          })
        }
      } catch (error) {
        console.error('Error fetching GMB data:', error)
        // Return stores without GMB data if there's an error
      }
    }

    const totalPages = Math.ceil(total / limit)
    const hasNextPage = page < totalPages
    const hasPrevPage = page > 1

    return NextResponse.json({
      success: true,
      data: storesWithGmbData,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage,
        hasPrevPage
      }
    })
  } catch (error) {
    console.error('Error fetching GMB stores:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch GMB stores' },
      { status: 500 }
    )
  }
}
