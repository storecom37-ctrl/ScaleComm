import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/database/connection'
import { Brand, Store } from '@/lib/database/models'
import { getGmbTokensFromRequest, getCurrentAccountId, getAllBrandAccountIds, getCurrentUserEmail } from '@/lib/utils/auth-helpers'
import { GmbApiServerService } from '@/lib/server/gmb-api-server'

export async function GET(request: NextRequest) {
  try {
    
    
    const { searchParams } = new URL(request.url)
    const requestedAccountId = searchParams.get('accountId')
    const email = searchParams.get('email')
    
    // Try to get authentication tokens
    const tokens = await getGmbTokensFromRequest()
    
    
    if (!tokens) {
      return NextResponse.json({
        success: false,
        error: 'GMB authentication required. Please connect your Google My Business account.'
      }, { status: 401 })
    }
    
    let currentAccountId: string | null = null
    
    // Get current user's account ID from tokens
    
    currentAccountId = await getCurrentAccountId(tokens)
    

    await connectDB()
    
    // Get current user's email from tokens to filter by user
    let currentUserEmail: string | null = null
    currentUserEmail = await getCurrentUserEmail(tokens)
    
    
    // Get the connected brand for the current user
    let brand
    if (currentUserEmail) {
      brand = await Brand.findOne({ 
        email: currentUserEmail,
        'settings.gmbIntegration.connected': true
      }).lean()
      
    } else {
      // Fallback to the first connected brand
      brand = await Brand.findOne({ 
        'settings.gmbIntegration.connected': true
      }).lean()
      
    }
    
    if (!brand) {
      return NextResponse.json({
        success: false,
        error: 'No connected brand found with GMB integration'
      }, { status: 404 })
    }
    
    // Get all account IDs for the connected brand
    const connectedAccountIds = await getAllBrandAccountIds()
    
    
    // Initialize GMB API service to fetch fresh location data
    const gmbService = new GmbApiServerService(tokens)
    
    // Fetch accounts from GMB
    const accounts = await gmbService.getAccounts()
    
    
    // Fetch locations from ALL accounts
    let allLocations: any[] = []
    for (const account of accounts) {
      try {
        const locations = await gmbService.getLocations(account.name)
        
        allLocations = [...allLocations, ...locations]
      } catch (error) {
        console.error(`Error fetching locations for account ${account.name}:`, error)
      }
    }
    
    
    
    // If a specific account is requested, filter by that account
    let accountIdToFilter = requestedAccountId
    if (!accountIdToFilter && currentAccountId && connectedAccountIds.includes(currentAccountId)) {
      accountIdToFilter = currentAccountId
    }
    
    // Filter locations by account if requested
    const filteredLocations = accountIdToFilter
      ? allLocations.filter(loc => loc.id.includes(`accounts/${accountIdToFilter}/`))
      : allLocations
    
    
    
    // Get existing stores from database to merge data
    const storeQuery: Record<string, unknown> = {
      brandId: (brand as { _id: unknown })._id,
      $or: [
        { gmbLocationId: { $exists: true } },
        { 'gmbData.locationId': { $exists: true } }
      ]
    }
    
    const stores = await Store.find(storeQuery).lean()
    
    
    // Create a map of stores by gmbLocationId for quick lookup
    const storeMap = new Map()
    stores.forEach((store: any) => {
      if (store.gmbLocationId) {
        storeMap.set(store.gmbLocationId, store)
      }
    })
    
    // Transform GMB locations to match expected format, enriched with database data
    const locations = filteredLocations.map((location: any) => {
      // Extract account ID from location ID
      const storeAccountId = location.id?.match(/accounts\/(\d+)\//)?.[1] || 'unknown'
      
      // Determine account name
      let accountName = 'Unknown Account'
      if (storeAccountId === '102362177139815885148') {
        accountName = 'Storecom & Flamboyant'
      } else if (storeAccountId === '112022557985287772374') {
        accountName = 'Storecom & Flamboyant'
      } else if (storeAccountId === '108373201951951441069') {
        accountName = 'Colive Properties'
      }
      
      // Get database store for additional data
      const dbStore = storeMap.get(location.id)
      const storeGmbData = dbStore?.gmbData || {}
      
      return {
        id: location.id,
        name: location.name || 'Unnamed Location', // Use fresh GMB name
        address: location.address || 'Address not available', // Use fresh GMB address
        phoneNumber: location.phoneNumber,
        websiteUrl: location.websiteUrl,
        categories: location.categories || [],
        verified: location.verified || false,
        accountId: storeAccountId,
        accountName: accountName,
        lastSyncAt: dbStore?.lastSyncAt || dbStore?.updatedAt,
        createdAt: dbStore?.createdAt,
        updatedAt: dbStore?.updatedAt,
        _id: dbStore?._id, // Include database ID if exists
        // Include GMB data from database
        gmbData: {
          reviews: storeGmbData.reviews || [],
          posts: storeGmbData.posts || [],
          insights: storeGmbData.insights || [],
          searchKeywords: storeGmbData.searchKeywords || []
        }
      }
    })
    
    return NextResponse.json({
      success: true,
      data: locations,
      count: locations.length,
      accountId: accountIdToFilter || 'all',
      debug: {
        authenticatedAccountId: currentAccountId,
        requestedAccountId,
        accountIdUsed: accountIdToFilter || 'all',
        brandFound: !!brand,
        gmbLocationsFound: allLocations.length,
        filteredLocationsFound: filteredLocations.length,
        storesInDatabase: stores.length,
        tokensAvailable: !!tokens,
        connectedAccountIds
      }
    })
  } catch (error: unknown) {
    console.error('Error fetching locations from GMB:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch locations'
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage 
      },
      { status: 500 }
    )
  }
}
