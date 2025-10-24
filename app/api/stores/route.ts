import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/database/connection'
import { Store, Brand } from '@/lib/database/models'
import { getGmbTokensFromRequest, getAllBrandAccountIds } from '@/lib/utils/auth-helpers'
import { getSession } from '@/lib/utils/session'
import { GmbApiServerService, GmbLocation } from '@/lib/server/gmb-api-server'

// GET /api/stores - Get all stores with pagination and search
export async function GET(request: NextRequest) {
  try {
    await connectDB()

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10000') // Increased to support large store lists
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''
    const brandId = searchParams.get('brandId') || ''
    const accountId = searchParams.get('accountId')
    const gmbLocationId = searchParams.get('gmbLocationId')

    const skip = (page - 1) * limit

    // Get session from new auth system
    const session = await getSession()
    let userRole: string | null = null
    let userBrandId: string | null = null
    
    if (session) {
      userRole = session.role
      userBrandId = session.brandId || null
      
    }
    
    // Get tokens from request to filter by accessible GMB accounts (legacy fallback)
    const tokens = await getGmbTokensFromRequest()
    let accessibleAccountIds: string[] = []
    
    if (tokens) {
      // Get all account IDs that the current user has access to
      accessibleAccountIds = await getAllBrandAccountIds()
      
    }

    // Build query
    const query: Record<string, unknown> = {}
    
    // Filter stores based on role
    if (userRole === 'super_admin') {
      // Super admin sees all stores (no additional filtering)

    } else if (userRole === 'owner' || userRole === 'manager') {
      // Owner/Manager only see stores for their brand
      if (userBrandId) {
        query.brandId = userBrandId
        
      } else {
        // If no brandId, show no stores
        query._id = { $exists: false }
        
      }
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

    // Filter by GMB location ID if provided
    if (gmbLocationId) {
      // Try multiple matching strategies for GMB location ID
      const gmbLocationIdFormats = [
        gmbLocationId, // Exact match
        `accounts/102362177139815885148/locations/${gmbLocationId}`, // Full format
        gmbLocationId.split('/').pop(), // Just the location ID part
        { $regex: gmbLocationId, $options: 'i' } // Partial match
      ]
      
      query.$or = [
        { gmbLocationId: gmbLocationId },
        { gmbLocationId: `accounts/102362177139815885148/locations/${gmbLocationId}` },
        { gmbLocationId: gmbLocationId.split('/').pop() },
        { gmbLocationId: { $regex: gmbLocationId, $options: 'i' } }
      ]
      
      
    } else {
      // Filter by GMB account if provided, or by accessible accounts
      if (accountId) {
        query.gmbAccountId = accountId
        
      } else if (accessibleAccountIds.length > 0) {
        // Only show stores that are linked to accessible GMB accounts
        query.gmbAccountId = { $in: accessibleAccountIds }
        
      } else {
        // If no GMB authentication, show no stores (user needs to connect GMB first)
        query.gmbAccountId = 'no-access'
        
      }
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

    const totalPages = Math.ceil(total / limit)
    const hasNextPage = page < totalPages
    const hasPrevPage = page > 1

    return NextResponse.json({
      success: true,
      data: stores,
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
    console.error('Error fetching stores:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch stores' },
      { status: 500 }
    )
  }
}

// POST /api/stores - Create new store
export async function POST(request: NextRequest) {
  try {
    await connectDB()

    const body = await request.json()


    

    // Validate required fields with user-friendly messages
    const requiredFields = [
      { field: 'brandId', message: 'Please select a brand for this store' },
      { field: 'name', message: 'Store name is required' },
      { field: 'storeCode', message: 'Store code is required' },
      { field: 'email', message: 'Email address is required' },
      { field: 'address', message: 'Store address is required' }
    ]
    
    for (const { field, message } of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { success: false, error: message },
          { status: 400 }
        )
      }
    }

    // Check if brand exists
    const brand = await Brand.findById(body.brandId)
    if (!brand) {
      return NextResponse.json(
        { success: false, error: 'The selected brand could not be found. Please refresh the page and try again.' },
        { status: 400 }
      )
    }

    // Generate slug if not provided
    if (!body.slug) {
      body.slug = body.name
        .toLowerCase()
        .replace(/[^a-z0-9 -]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim()
    }

    // Check for existing store by storeCode or slug
    const existingStore = await Store.findOne({ 
      $or: [
        { storeCode: body.storeCode },
        { slug: body.slug }
      ]
    })

    
    if (existingStore) {
      if (existingStore.storeCode === body.storeCode) {
        return NextResponse.json(
          { success: false, error: 'A store with this code already exists. Please choose a different store code.' },
          { status: 400 }
        )
      }
      if (existingStore.slug === body.slug) {
        // Append store code to make slug unique
        body.slug = `${body.slug}-${body.storeCode.toLowerCase()}`
      }
    }

    // Create GMB location first if brand has GMB integration enabled
    let gmbLocation: GmbLocation | null = null
    
    if (brand.settings?.gmbIntegration?.connected && brand.settings.gmbIntegration.gmbAccountId) {
      try {
        
        
        // Get GMB tokens from request
        const gmbTokens = await getGmbTokensFromRequest()
        if (!gmbTokens) {
          return NextResponse.json(
            { success: false, error: 'GMB tokens not available' },
            { status: 400 }
          )
        }

        const gmbService = new GmbApiServerService(gmbTokens)
        
        // Use exact GMB category value if provided, otherwise find match
        let validGmbCategory: string | null = null
        let categoryDisplayName = body.primaryCategory || 'Business'
        
        // Check if user provided a direct GMB category ID (starts with 'gcid:')
        if (body.gmbCategoryId && body.gmbCategoryId.startsWith('gcid:')) {
          
          validGmbCategory = body.gmbCategoryId
          categoryDisplayName = body.primaryCategory || body.gmbCategoryDisplayName || 'Business'
        } else if (body.primaryCategory) {
          
          validGmbCategory = await gmbService.findBestCategoryMatch(
            body.primaryCategory,
            body.address.countryCode || 'US',
            'en-US'
          )
          
          if (!validGmbCategory) {
            
            // Use a generic business category as fallback
            validGmbCategory = 'gcid:business_service'
          }
        } else {
          // No category provided, use generic business category
          
          validGmbCategory = 'gcid:business_service'
        }
        
        // Prepare location data for GMB API
        const locationData = {
          title: body.name,
          languageCode: 'en-US', // Required field for GMB API
          storefrontAddress: {
            addressLines: [body.address.line1, body.address.line2].filter((line): line is string => Boolean(line)),
            locality: body.address.locality || body.address.city,
            administrativeArea: body.address.state,
            postalCode: body.address.postalCode,
            regionCode: body.address.countryCode || 'US'
          },
          phoneNumbers: body.phone ? {
            primaryPhone: body.phone
          } : undefined,
          websiteUri: body.socialMedia?.website,
          categories: {
            primaryCategory: {
              name: validGmbCategory,
              displayName: categoryDisplayName
            }
          }
        }

        // Create location in GMB first
        gmbLocation = await gmbService.createLocation(brand.settings.gmbIntegration.gmbAccountId, locationData)
        
        if (!gmbLocation) {
          return NextResponse.json(
            { success: false, error: 'Failed to create GMB location' },
            { status: 500 }
          )
        }

        
      } catch (gmbError: any) {
        console.error('❌ Error creating GMB location:', gmbError)
        
        // Log specific error types for debugging
        if (gmbError && typeof gmbError === 'object' && 'message' in gmbError) {
          if (gmbError.message.includes('Invalid GMB account ID')) {
            console.error('❌ GMB account ID validation failed:', brand.settings.gmbIntegration.gmbAccountId)
          } else if (gmbError.message.includes('parent ID')) {
            console.error('❌ GMB parent ID invalid - check account permissions and format')
          }
        }
        
        // Return error - don't save store to database if GMB fails
        return NextResponse.json(
          { success: false, error: `GMB location creation failed: ${gmbError.message || gmbError}` },
          { status: 400 }
        )
      }
    }

    // Create store with better error handling - only after GMB succeeds
    try {
      const store = new Store(body)
      
      await store.save()
      
      // Update store with GMB location ID if created
      if (gmbLocation && brand.settings?.gmbIntegration?.gmbAccountId) {
        await Store.findByIdAndUpdate(store._id, {
          gmbLocationId: gmbLocation.id,
          gmbAccountId: brand.settings.gmbIntegration.gmbAccountId,
          lastSyncAt: new Date()
        })

        // Update brand GMB integration metadata
        await Brand.findByIdAndUpdate(brand._id, {
          'settings.gmbIntegration.lastSyncAt': new Date(),
          $inc: { 'settings.gmbIntegration.gmbMetadata.totalLocations': 1 }
        })
      }
      
      // Populate brand info before returning
      await store.populate('brandId', 'name slug logo')
      
      // Add GMB location info to response
      const responseData: any = {
        success: true,
        data: store,
        message: 'Store created successfully'
      }
      
      if (gmbLocation) {
        responseData.gmbLocation = {
          id: gmbLocation.id,
          name: gmbLocation.name,
          status: 'created'
        }
        responseData.message += ' and GMB location created'
      }
      
      return NextResponse.json(responseData, { status: 201 })
    } catch (createError: any) {
      console.error('Store creation error:', createError)
      console.error('Error name:', createError.name)
      console.error('Error code:', createError.code)
      console.error('Error keyPattern:', createError.keyPattern)
      
      // Handle duplicate key errors more gracefully
      if (createError && typeof createError === 'object' && (createError.code === 11000 || createError.codeName === 'DuplicateKey')) {
        const duplicateField = createError.keyPattern ? Object.keys(createError.keyPattern)[0] : 'field'
        let errorMessage = 'Store already exists'
        
        if (duplicateField === 'storeCode') {
          errorMessage = 'Store code already exists'
        } else if (duplicateField === 'slug') {
          errorMessage = 'Store slug already exists'
        } else if (duplicateField === 'email') {
          errorMessage = 'Store email already exists'
        }
        
        return NextResponse.json(
          { success: false, error: errorMessage },
          { status: 400 }
        )
      }
      
      // Handle validation errors
      if (createError.name === 'ValidationError') {
        const validationErrors = Object.values(createError.errors).map((err: any) => err.message)
        return NextResponse.json(
          { success: false, error: 'Validation failed', details: validationErrors },
          { status: 400 }
        )
      }
      
      // Handle cast errors (invalid ObjectId, etc.)
      if (createError.name === 'CastError') {
        return NextResponse.json(
          { success: false, error: `Invalid ${createError.path}: ${createError.value}` },
          { status: 400 }
        )
      }
      
      // Re-throw for general error handler
      throw createError
    }
  } catch (error: any) {
    console.error('Error creating store:', error)
    console.error('General error name:', error.name)
    console.error('General error code:', error.code)
    console.error('General error codeName:', error.codeName)
    console.error('General error keyPattern:', error.keyPattern)
    
    // Provide more specific error messages based on error type
    let errorMessage = 'Failed to create store'
    let statusCode = 500
    
    if ((error.name === 'MongoError' && error.code === 11000) || error.codeName === 'DuplicateKey') {
      // Try to get more specific information about which field is duplicated
      const duplicateField = error.keyPattern ? Object.keys(error.keyPattern)[0] : null
      if (duplicateField === 'storeCode') {
        errorMessage = 'Store code already exists'
      } else if (duplicateField === 'slug') {
        errorMessage = 'Store slug already exists'
      } else if (duplicateField === 'email') {
        errorMessage = 'Store email already exists'
      } else {
        errorMessage = 'Store already exists with this information'
      }
      statusCode = 400
    } else if (error.name === 'ValidationError') {
      errorMessage = 'Invalid store data provided'
      statusCode = 400
    } else if (error.name === 'CastError') {
      errorMessage = 'Invalid data format'
      statusCode = 400
    } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      errorMessage = 'Database connection failed'
      statusCode = 503
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage,
        ...(process.env.NODE_ENV === 'development' && { details: error.message })
      },
      { status: statusCode }
    )
  }
}


