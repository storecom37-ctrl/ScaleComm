import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/database/connection'
import { Store } from '@/lib/database/models'
import { deleteFromS3 } from '@/lib/services/aws-s3'
import { GmbApiServerService } from '@/lib/server/gmb-api-server'
import { getGmbTokensFromRequest } from '@/lib/utils/auth-helpers'

// GET /api/stores/[id] - Get single store
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB()
    const { id } = await params

    const store = await Store.findById(id)
      .populate('brandId', 'name slug logo')
      .lean()

    if (!store) {
      return NextResponse.json(
        { success: false, error: 'Store not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: store
    })
  } catch (error) {
    console.error('Error fetching store:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch store' },
      { status: 500 }
    )
  }
}

// PUT /api/stores/[id] - Update store
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB()
    const { id } = await params

    const body = await request.json()

    console.log('Store Update API - Received data:', {
      storeId: id,
      microsite: body.microsite,
      mapsUrl: body.microsite?.mapsUrl
    })

    // Find existing store
    const existingStore = await Store.findById(id)
    if (!existingStore) {
      return NextResponse.json(
        { success: false, error: 'Store not found' },
        { status: 404 }
      )
    }

    // Check if store code is being changed and if it's already taken
    if (body.storeCode && body.storeCode !== existingStore.storeCode) {
      const codeExists = await Store.findOne({ storeCode: body.storeCode, _id: { $ne: id } })
      if (codeExists) {
        return NextResponse.json(
          { success: false, error: 'Store code already exists' },
          { status: 400 }
        )
      }
    }

    // Check if slug is being changed and if it's already taken
    if (body.slug && body.slug !== existingStore.slug) {
      const slugExists = await Store.findOne({ slug: body.slug, _id: { $ne: id } })
      if (slugExists) {
        return NextResponse.json(
          { success: false, error: 'Store slug already exists' },
          { status: 400 }
        )
      }
    }

    // If store is connected to GMB, update GMB first, then fetch and save
    if (existingStore.gmbLocationId) {
      try {
        // Get GMB tokens
        const tokens = await getGmbTokensFromRequest()
        
        if (tokens) {
          console.log('Updating GMB location first:', existingStore.gmbLocationId)
          
          // Initialize GMB API service
          const gmbService = new GmbApiServerService(tokens)

          // Prepare location data for GMB API with validation
          const locationData: any = {}
          
          // Only include fields that are being updated
          if (body.name) {
            locationData.title = body.name
          }
          
          // SKIP PHONE NUMBER UPDATES TO AVOID GMB THROTTLING
          // Phone numbers will be saved to database only, not sent to GMB
          if (body.phone) {
            console.log('Phone number update skipped for GMB (to avoid throttling):', body.phone)
            console.log('Phone number will be saved to database only')
          }
          
          // Validate and format address
          if (body.address && body.address.line1) {
            // Only update address if we have required fields and they're not placeholder values
            const hasValidLocality = body.address.locality && 
                                   body.address.locality !== 'Unknown' && 
                                   body.address.locality.trim() !== ''
            const hasValidState = body.address.state && 
                                body.address.state !== 'Unknown' && 
                                body.address.state.trim() !== ''
            const hasValidPostalCode = body.address.postalCode && 
                                     body.address.postalCode !== '00000' && 
                                     body.address.postalCode.trim() !== ''
            
            if (hasValidLocality && hasValidState && hasValidPostalCode) {
              // Don't change country code to avoid ADDRESS_EDIT_CHANGES_COUNTRY error
              const regionCode = existingStore.address.countryCode || 'US'
              
              locationData.storefrontAddress = {
                addressLines: [body.address.line1, body.address.line2].filter(Boolean),
                locality: body.address.locality || body.address.city,
                administrativeArea: body.address.state,
                postalCode: body.address.postalCode,
                regionCode: regionCode
              }
              
              console.log('Address validation passed, will update address')
            } else {
              console.log('Address validation failed - skipping address update:', {
                locality: body.address.locality,
                state: body.address.state,
                postalCode: body.address.postalCode
              })
            }
          }
          
          // Validate and format website
          if (body.website) {
            // Ensure website has proper protocol
            let website = body.website
            if (!website.startsWith('http://') && !website.startsWith('https://')) {
              website = `https://${website}`
            }
            locationData.websiteUri = website
          }
          
          // Update business category
          // GMB API requires category 'name' (ID like gcid:apartment_building), not displayName
          if (body.gmbCategoryId) {
            locationData.categories = {
              primaryCategory: {
                name: body.gmbCategoryId
              }
            }
          }
          
          // Note: Latitude/longitude cannot be updated via GMB API
          // Coordinates are set automatically by Google based on address or through verification
          // We'll save coordinates to our database only, not send to GMB
          console.log('Coordinates will be saved to database only (GMB API limitation)')

          // Step 1: Update location in GMB (if there's data to update)
          console.log('Sending update to GMB...')             
          console.log('Location data being sent:', JSON.stringify(locationData, null, 2))
          
          let gmbLocation = null
          
          // Skip GMB update if no valid data to update
          if (Object.keys(locationData).length === 0) {
            console.log('No valid data to update in GMB, fetching current GMB data instead')
            // Just fetch current GMB data
            gmbLocation = await gmbService.getLocation(existingStore.gmbLocationId)
          } else {
            // Add delay to prevent rate limiting
            await new Promise(resolve => setTimeout(resolve, 3000))
            
            // Update GMB first
            const gmbUpdateResponse = await gmbService.updateLocation(
              existingStore.gmbLocationId, 
              locationData
            )
            
            if (!gmbUpdateResponse) {
              throw new Error('Failed to update GMB location')
            }

            console.log('GMB location updated, now fetching latest data...')

            // Add delay before fetching to prevent rate limiting
            await new Promise(resolve => setTimeout(resolve, 2000))

            // Step 2: Fetch updated location from GMB
            try {
              gmbLocation = await gmbService.getLocation(existingStore.gmbLocationId)
            } catch (fetchError) {
              console.error('Failed to fetch updated GMB location, using update response data:', fetchError)
              // Use the update response data as fallback
              gmbLocation = gmbUpdateResponse
            }
          }
          
          if (!gmbLocation) {
            throw new Error('Failed to fetch GMB location')
          }

          console.log('Fetched GMB location:', gmbLocation.title)

          // Step 3: Prepare database update from GMB data
          const updateData: any = {
            name: gmbLocation.title,
            // Use user-provided phone number instead of GMB phone to avoid throttling
            phone: body.phone || gmbLocation.phoneNumbers?.primaryPhone || existingStore.phone,
            address: {
              line1: gmbLocation.storefrontAddress?.addressLines?.[0] || existingStore.address.line1,
              line2: gmbLocation.storefrontAddress?.addressLines?.[1] || existingStore.address.line2 || '',
              locality: gmbLocation.storefrontAddress?.locality || existingStore.address.locality,
              city: gmbLocation.storefrontAddress?.locality || existingStore.address.city,
              state: gmbLocation.storefrontAddress?.administrativeArea || existingStore.address.state,
              postalCode: gmbLocation.storefrontAddress?.postalCode || existingStore.address.postalCode,
              countryCode: gmbLocation.storefrontAddress?.regionCode || existingStore.address.countryCode,
              // Include latitude/longitude from GMB response or keep existing
              latitude: gmbLocation.latlng?.latitude || existingStore.address?.latitude,
              longitude: gmbLocation.latlng?.longitude || existingStore.address?.longitude
            },
            primaryCategory: gmbLocation.primaryCategory || gmbLocation.categories?.[0] || existingStore.primaryCategory,
            lastSyncAt: new Date(),
            updatedAt: new Date()
          }
          
          // Handle coordinates separately - save user-provided coordinates to database
          if (body.address && 
              typeof body.address.latitude === 'number' && 
              typeof body.address.longitude === 'number') {
            updateData.address.latitude = body.address.latitude
            updateData.address.longitude = body.address.longitude
            console.log('Saved user-provided coordinates to database:', {
              latitude: body.address.latitude,
              longitude: body.address.longitude
            })
          }

          // Add website if it exists in GMB
          if (gmbLocation.websiteUri) {
            updateData.website = gmbLocation.websiteUri
            updateData.socialMedia = {
              ...existingStore.socialMedia,
              website: gmbLocation.websiteUri
            }
          }

          // Add any non-GMB fields from body that won't be overwritten
          if (body.storeCode) updateData.storeCode = body.storeCode
          if (body.slug) updateData.slug = body.slug
          if (body.status) updateData.status = body.status

          // Handle microsite.mapsUrl updates - ensure both microsite.mapsUrl and gmbData.metadata.mapsUri are updated
          if (body.microsite?.mapsUrl) {
            updateData['microsite.mapsUrl'] = body.microsite.mapsUrl
            updateData['gmbData.metadata.mapsUri'] = body.microsite.mapsUrl
            console.log('Updating mapsUrl in GMB flow:', {
              micrositeMapsUrl: body.microsite.mapsUrl,
              gmbDataMapsUri: body.microsite.mapsUrl
            })
          }

          // Step 4: Update database with GMB data
          const updatedStore = await Store.findByIdAndUpdate(
            id,
            { $set: updateData },
            { new: true, runValidators: false }
          ).populate('brandId', 'name slug logo')

          console.log('Database updated with GMB data')

          return NextResponse.json({
            success: true,
            data: updatedStore,
            message: 'Store updated in GMB and synced to database'
          })
        } else {
          console.log('No GMB tokens available, updating database only')
        }
      } catch (gmbError) {
        console.error('Error updating GMB location:', gmbError)
        
        // Parse GMB API errors for better user feedback
        let errorMessage = 'Failed to update GMB'
        if (gmbError instanceof Error) {
          if (gmbError.message.includes('THROTTLED')) {
            errorMessage = 'Google My Business API rate limit exceeded. Please wait a few minutes and try again.'
          } else if (gmbError.message.includes('INVALID_CATEGORY')) {
            errorMessage = 'Invalid business category. Please select a valid category from the list.'
          } else if (gmbError.message.includes('INVALID_PHONE_NUMBER')) {
            errorMessage = 'Invalid phone number format. Please enter a valid phone number.'
          } else if (gmbError.message.includes('PIN_DROP_REQUIRED')) {
            errorMessage = 'Address update requires location verification. Please contact support.'
          } else if (gmbError.message.includes('INVALID_ADDRESS')) {
            errorMessage = 'Invalid address format. Please check your address details.'
          } else if (gmbError.message.includes('ADDRESS_EDIT_CHANGES_COUNTRY')) {
            errorMessage = 'Cannot change country in address. Please contact support for country changes.'
          } else {
            errorMessage = gmbError.message
          }
        }
        
        return NextResponse.json(
          { 
            success: false, 
            error: errorMessage
          },
          { status: 400 }
        )
      }
    }

    // If not GMB connected or GMB update was skipped, update database directly
    const updateData: any = { ...body, updatedAt: new Date() }
    
    // Handle address updates including coordinates
    if (body.address) {
      updateData.address = {
        ...existingStore.address,
        ...body.address,
        // Ensure coordinates are properly saved
        latitude: body.address.latitude || existingStore.address?.latitude,
        longitude: body.address.longitude || existingStore.address?.longitude
      }
    }

    // Handle microsite.mapsUrl updates - ensure both microsite.mapsUrl and gmbData.metadata.mapsUri are updated
    if (body.microsite?.mapsUrl) {
      updateData['microsite.mapsUrl'] = body.microsite.mapsUrl
      updateData['gmbData.metadata.mapsUri'] = body.microsite.mapsUrl
      console.log('Updating mapsUrl:', {
        micrositeMapsUrl: body.microsite.mapsUrl,
        gmbDataMapsUri: body.microsite.mapsUrl
      })
    }

    const updatedStore = await Store.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: false }
    ).populate('brandId', 'name slug logo')

    return NextResponse.json({
      success: true,
      data: updatedStore,
      message: 'Store updated successfully'
    })
  } catch (error) {
    console.error('Error updating store:', error)
    
    if (error && typeof error === 'object' && 'code' in error && error.code === 11000) {
      const field = 'keyPattern' in error && error.keyPattern ? Object.keys(error.keyPattern as Record<string, any>)[0] : 'field'
      return NextResponse.json(
        { success: false, error: `${field} already exists` },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Failed to update store' },
      { status: 500 }
    )
  }
}

// DELETE /api/stores/[id] - Delete store
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB()
    const { id } = await params

    const store = await Store.findById(id)
    if (!store) {
      return NextResponse.json(
        { success: false, error: 'Store not found' },
        { status: 404 }
      )
    }

    // Delete associated images from S3
    const imagesToDelete = []
    
    // Hero image
    if (store.microsite?.heroImage?.key) {
      imagesToDelete.push(store.microsite.heroImage.key)
    }

    // Existing images
    if (store.microsite?.existingImages) {
      store.microsite.existingImages.forEach((image: any) => {
        if (image.key) {
          imagesToDelete.push(image.key)
        }
      })
    }

    // Delete images from S3
    const deletePromises = imagesToDelete.map(key => deleteFromS3(key))
    await Promise.allSettled(deletePromises) // Use allSettled to continue even if some deletions fail

    // Delete store from database
    await Store.findByIdAndDelete(id)

    return NextResponse.json({
      success: true,
      message: 'Store deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting store:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete store' },
      { status: 500 }
    )
  }
}


