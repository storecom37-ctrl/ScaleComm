import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/database/connection'
import { Store, Brand } from '@/lib/database/models'
import { getGmbTokensFromRequest } from '@/lib/utils/auth-helpers'
import { GmbApiServerService } from '@/lib/server/gmb-api-server'

// GET /api/gmb/stores/[id] - Get a specific GMB store
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id: storeId } = await params

    // Find store in database
    const store = await Store.findById(storeId).populate('brandId', 'name slug logo')
    if (!store) {
      return NextResponse.json(
        { success: false, error: 'Store not found' },
        { status: 404 }
      )
    }

    if (!store.gmbLocationId) {
      return NextResponse.json(
        { success: false, error: 'Store is not connected to GMB' },
        { status: 400 }
      )
    }

    // Initialize GMB API service
    const gmbService = new GmbApiServerService(tokens)

    // Get latest data from GMB
    try {
      const locations = await gmbService.getLocations(store.gmbAccountId || '')
      const gmbLocation = locations.find((loc: any) => loc.id === store.gmbLocationId)
      
      if (gmbLocation) {
        // Update store with latest GMB data
        await Store.findByIdAndUpdate(storeId, {
          name: gmbLocation.name,
          phone: gmbLocation.phoneNumber,
          address: {
            line1: gmbLocation.address.split(',')[0] || '',
            line2: '',
            locality: gmbLocation.address.split(',')[gmbLocation.address.split(',').length - 2]?.trim() || '',
            city: gmbLocation.address.split(',')[gmbLocation.address.split(',').length - 2]?.trim() || '',
            state: gmbLocation.address.split(',')[gmbLocation.address.split(',').length - 2]?.trim() || '',
            postalCode: gmbLocation.address.split(',').pop()?.trim() || '',
            countryCode: 'US'
          },
          primaryCategory: gmbLocation.categories[0] || store.primaryCategory,
          lastSyncAt: new Date()
        })

        // Refetch updated store
        const updatedStore = await Store.findById(storeId).populate('brandId', 'name slug logo')
        
        return NextResponse.json({
          success: true,
          data: {
            store: updatedStore,
            gmbLocation
          },
          message: 'Store data synced from GMB'
        })
      } else {
        return NextResponse.json({
          success: true,
          data: {
            store,
            gmbLocation: null
          },
          message: 'Store found but GMB location not found'
        })
      }
    } catch (gmbError) {
      console.error('Error fetching GMB data:', gmbError)
      return NextResponse.json({
        success: true,
        data: {
          store,
          gmbLocation: null
        },
        message: 'Store found but GMB data unavailable'
      })
    }
  } catch (error) {
    console.error('Error fetching GMB store:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch GMB store' },
      { status: 500 }
    )
  }
}

// PUT /api/gmb/stores/[id] - Update a store in GMB
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id: storeId } = await params
    const body = await request.json()

    // Find store in database
    const store = await Store.findById(storeId)
    if (!store) {
      return NextResponse.json(
        { success: false, error: 'Store not found' },
        { status: 404 }
      )
    }

    if (!store.gmbLocationId) {
      return NextResponse.json(
        { success: false, error: 'Store is not connected to GMB' },
        { status: 400 }
      )
    }

    // Initialize GMB API service
    const gmbService = new GmbApiServerService(tokens)

    // Prepare location data for GMB API
    const locationData = {
      title: body.name || store.name,
      storefrontAddress: {
        addressLines: [body.address?.line1 || store.address.line1, body.address?.line2 || store.address.line2].filter(Boolean),
        locality: body.address?.locality || body.address?.city || store.address.locality,
        administrativeArea: body.address?.state || store.address.state,
        postalCode: body.address?.postalCode || store.address.postalCode,
        regionCode: body.address?.countryCode || store.address.countryCode || 'US'
      },
      phoneNumbers: (body.phone || store.phone) ? {
        primaryPhone: body.phone || store.phone
      } : undefined,
      websiteUri: body.website || store.socialMedia?.website,
      // Skip category updates for now since gmbCategoryId is not in the store schema
      // categories: undefined
    }

    // Update location in GMB
    const gmbLocation = await gmbService.updateLocation(store.gmbLocationId, locationData)
    
    if (!gmbLocation) {
      return NextResponse.json(
        { success: false, error: 'Failed to update location in GMB' },
        { status: 500 }
      )
    }

    // Update store in database
    const updateData: any = {
      name: gmbLocation.name,
      phone: gmbLocation.phoneNumber,
      address: {
        line1: body.address?.line1 || store.address.line1,
        line2: body.address?.line2 || store.address.line2,
        locality: body.address?.locality || body.address?.city || store.address.locality,
        city: body.address?.city || store.address.city,
        state: body.address?.state || store.address.state,
        postalCode: body.address?.postalCode || store.address.postalCode,
        countryCode: body.address?.countryCode || store.address.countryCode
      },
      primaryCategory: body.primaryCategory || store.primaryCategory,
      lastSyncAt: new Date()
    }

    // Update social media if provided
    if (body.website) {
      updateData.socialMedia = {
        ...store.socialMedia,
        website: body.website
      }
    }

    const updatedStore = await Store.findByIdAndUpdate(
      storeId,
      updateData,
      { new: true }
    ).populate('brandId', 'name slug logo')

    return NextResponse.json({
      success: true,
      data: {
        store: updatedStore,
        gmbLocation
      },
      message: 'Store updated successfully in GMB and database'
    })
  } catch (error) {
    console.error('Error updating GMB store:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update GMB store' },
      { status: 500 }
    )
  }
}

// DELETE /api/gmb/stores/[id] - Delete a store from GMB
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id: storeId } = await params

    // Find store in database
    const store = await Store.findById(storeId)
    if (!store) {
      return NextResponse.json(
        { success: false, error: 'Store not found' },
        { status: 404 }
      )
    }

    if (!store.gmbLocationId) {
      return NextResponse.json(
        { success: false, error: 'Store is not connected to GMB' },
        { status: 400 }
      )
    }

    // Initialize GMB API service
    const gmbService = new GmbApiServerService(tokens)

    // Delete location from GMB
    const deleted = await gmbService.deleteLocation(store.gmbLocationId)
    
    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Failed to delete location from GMB' },
        { status: 500 }
      )
    }

    // Delete store from database
    await Store.findByIdAndDelete(storeId)

    return NextResponse.json({
      success: true,
      message: 'Store deleted successfully from GMB and database'
    })
  } catch (error) {
    console.error('Error deleting GMB store:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete GMB store' },
      { status: 500 }
    )
  }
}
