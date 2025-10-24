import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/database/connection'
import { Store, Brand } from '@/lib/database/models'
import { getGmbTokensFromRequest } from '@/lib/utils/auth-helpers'
import { GmbApiServerService } from '@/lib/server/gmb-api-server'

// GET /api/gmb/stores - Get all GMB stores for the authenticated account
export async function GET(request: NextRequest) {
  try {
    await connectDB()

    // Get GMB tokens from request
    const tokens = await getGmbTokensFromRequest()
    if (!tokens) {
      return NextResponse.json(
        { success: false, error: 'GMB authentication required' },
        { status: 401 }
      )
    }

    // Initialize GMB API service
    const gmbService = new GmbApiServerService(tokens)

    // Get account info
    const accountInfo = await gmbService.getAccountInfo()
    

    // Get all accounts
    const accounts = await gmbService.getAccounts()
    

    if (accounts.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        message: 'No GMB accounts found'
      })
    }

    // Get stores from all accounts
    let allStores: any[] = []
    for (const account of accounts) {
      try {
        const locations = await gmbService.getLocations(account.name)
        
        
        // Transform locations to store format
        const accountStores = locations.map((location: any) => ({
          id: location.id,
          name: location.name,
          address: location.address,
          phone: location.phoneNumber || 'N/A',
          website: location.websiteUrl || 'N/A',
          status: location.verified ? 'Live' : 'Draft',
          category: location.categories[0] || 'Business',
          gmbConnected: true,
          accountId: account.name,
          accountName: account.accountName || account.name,
          lastUpdated: new Date().toISOString()
        }))
        
        allStores = [...allStores, ...accountStores]
      } catch (error) {
        console.error(`Error fetching locations for account ${account.name}:`, error)
        // Continue with other accounts
      }
    }

    return NextResponse.json({
      success: true,
      data: allStores,
      message: `Found ${allStores.length} GMB stores across ${accounts.length} accounts`
    })
  } catch (error) {
    console.error('Error fetching GMB stores:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch GMB stores' },
      { status: 500 }
    )
  }
}

// POST /api/gmb/stores - Create a new store in GMB
export async function POST(request: NextRequest) {
  try {
    await connectDB()

    // Get GMB tokens from request
    const tokens = await getGmbTokensFromRequest()
    if (!tokens) {
      return NextResponse.json(
        { success: false, error: 'GMB authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()

    // Validate required fields
    const requiredFields = ['accountName', 'name', 'address']
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { success: false, error: `${field} is required` },
          { status: 400 }
        )
      }
    }

    // Initialize GMB API service
    const gmbService = new GmbApiServerService(tokens)

    // Prepare location data for GMB API
    const locationData = {
      title: body.name,
      languageCode: 'en-US', // Required field for GMB API
      storefrontAddress: {
        addressLines: [body.address.line1, body.address.line2].filter(Boolean),
        locality: body.address.locality || body.address.city,
        administrativeArea: body.address.state,
        postalCode: body.address.postalCode,
        regionCode: body.address.countryCode || 'US'
      },
      phoneNumbers: body.phone ? {
        primaryPhone: body.phone
      } : undefined,
      websiteUri: body.website,
      categories: body.primaryCategory ? {
        primaryCategory: {
          name: body.primaryCategory,
          displayName: body.primaryCategory
        }
      } : undefined
    }

    // Create location in GMB
    const gmbLocation = await gmbService.createLocation(body.accountName, locationData)
    
    if (!gmbLocation) {
      return NextResponse.json(
        { success: false, error: 'Failed to create location in GMB' },
        { status: 500 }
      )
    }

    // Find or create brand
    let brand = await Brand.findOne({ 
      $or: [
        { email: body.brandEmail },
        { 'users.owner.email': body.brandEmail }
      ]
    })

    if (!brand) {
      // Create brand if not found
      brand = new Brand({
        name: body.brandName || 'GMB Business',
        slug: (body.brandName || 'gmb-business').toLowerCase().replace(/[^a-z0-9]/g, '-'),
        email: body.brandEmail || 'gmb@example.com',
        description: 'Business connected via Google My Business',
        address: {
          line1: 'Address not available',
          locality: 'Unknown',
          city: 'Unknown',
          state: 'Unknown',
          postalCode: '00000',
          country: 'US'
        },
        users: {
          owner: {
            name: body.brandName || 'Business Owner',
            email: body.brandEmail || 'gmb@example.com',
            password: 'gmb-auto-generated',
            role: 'owner'
          }
        },
        settings: {
          gmbIntegration: {
            connected: true,
            gmbAccountId: body.accountName,
            lastSyncAt: new Date()
          }
        }
      })
      
      await brand.save()
      
    }

    // Create store in database using atomic upsert to prevent duplicates
    const uniqueStoreCode = `GMB-${body.accountName}-${gmbLocation.id.split('/').pop()}-${Date.now()}`
    const baseSlug = gmbLocation.name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').trim()
    
    const storeData = {
      brandId: brand._id,
      name: gmbLocation.name,
      storeCode: uniqueStoreCode,
      slug: baseSlug,
      email: body.email || brand.email,
      phone: gmbLocation.phoneNumber,
      address: {
        line1: body.address.line1,
        line2: body.address.line2 || '',
        locality: body.address.locality || body.address.city,
        city: body.address.city,
        state: body.address.state,
        postalCode: body.address.postalCode,
        countryCode: body.address.countryCode || 'US'
      },
      primaryCategory: body.primaryCategory || 'Business',
      gmbLocationId: gmbLocation.id,
      gmbAccountId: body.accountName,
      status: 'active'
    }

    const store = await Store.findOneAndUpdate(
      { gmbLocationId: gmbLocation.id },
      storeData,
      { 
        upsert: true, 
        new: true,
        runValidators: true
      }
    )

    await store.populate('brandId', 'name slug logo')

    return NextResponse.json({
      success: true,
      data: {
        store,
        gmbLocation
      },
      message: 'Store created successfully in GMB and database'
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating GMB store:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create GMB store' },
      { status: 500 }
    )
  }
}
