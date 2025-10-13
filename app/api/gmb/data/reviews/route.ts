import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/database/connection'
import { Review } from '@/lib/database/separate-models'
import { Store } from '@/lib/database/models'
import { getGmbTokensFromRequest, getCurrentUserEmail, getAllBrandAccountIds } from '@/lib/utils/auth-helpers'
import { PipelineStage } from 'mongoose'

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    await connectDB()
    
    const { searchParams } = new URL(request.url)
    const requestedAccountId = searchParams.get('accountId')
    const locationId = searchParams.get('locationId')
    const storeId = searchParams.get('storeId')
    const brandId = searchParams.get('brandId')
    const viewType = searchParams.get('viewType') // 'brand' or 'store' or 'all'
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined // No default limit
    const skip = parseInt(searchParams.get('skip') || '0')
    const status = searchParams.get('status') || 'active'
    const rating = searchParams.get('rating')
    const search = searchParams.get('search')
    
    // Get tokens from request to filter by accessible GMB accounts
    const tokens = await getGmbTokensFromRequest()
    let accessibleAccountIds: string[] = []
    let currentUserEmail: string | null = null
    
    if (tokens) {
      // Get current user's email for logging
      currentUserEmail = await getCurrentUserEmail(tokens)
      console.log('🔍 GMB Reviews API - Current user email:', currentUserEmail)
      
      // Get all account IDs that the current user has access to
      accessibleAccountIds = await getAllBrandAccountIds()
      console.log('🔍 GMB Reviews API - Accessible GMB Account IDs for current user:', accessibleAccountIds)
    }
    
    // Determine which account to filter by
    let accountIdToUse = requestedAccountId
    
    // If no specific account requested, use accessible accounts
    if (!accountIdToUse) {
      if (accessibleAccountIds.length > 0) {
        // Use the first accessible account (or could be modified to show all)
        accountIdToUse = accessibleAccountIds[0]
        console.log('🔍 GMB Reviews API - Using first accessible account ID:', accountIdToUse)
      } else {
        console.log('🔍 GMB Reviews API - No accessible accounts found')
        // Return empty result if no accessible accounts
        return NextResponse.json({
          success: true,
          data: [],
          count: 0,
          totalCount: 0,
          pagination: { skip, limit: limit || 0, hasMore: false },
          loading: false,
          processingTime: Date.now() - startTime,
          debug: { message: 'No accessible GMB accounts found for current user' }
        })
      }
    }
    
    console.log('Reviews API - Using account ID:', accountIdToUse)
    
    // Build query for reviews with account-based filtering
    const query: Record<string, unknown> = { status }
    
    // Only filter by account if we have a specific account ID
    if (accountIdToUse) {
      query.accountId = accountIdToUse
    }
    
    // Debug: Show available stores for this account (simplified)
    if (accountIdToUse) {
      const availableStores = await Store.find({ 
        $or: [
          { gmbAccountId: accountIdToUse },
          { gmbLocationId: { $regex: `accounts/${accountIdToUse}/`, $options: 'i' } }
        ]
      }).select('_id name gmbLocationId').limit(5).lean()
      console.log('Reviews API - Available stores for account:', availableStores.length)
    }

    // Handle different view types for brand vs store filtering
    if (viewType === 'brand' && brandId) {
      // Show all reviews for stores under this brand
      // We need to find all stores that belong to this brand
      const brandStores = await Store.find({ 
        brandId: brandId,
        status: 'active',
        gmbLocationId: { $exists: true, $ne: null }
      }).select('_id').lean()
      
      if (brandStores.length > 0) {
        query.storeId = { $in: brandStores.map(store => store._id) }
      } else {
        // No stores found for this brand, return empty result
        return NextResponse.json({
          success: true,
          data: [],
          count: 0,
          totalCount: 0,
          pagination: null,
          accountId: accountIdToUse,
          processingTime: Date.now() - startTime
        })
      }
    } else if (viewType === 'store' && storeId) {
      // Show reviews for specific store only
      query.storeId = storeId
    } else {
      // Legacy support - apply individual filters
      if (brandId) {
        // Handle brand filtering without viewType
        const brandStores = await Store.find({ 
          brandId: brandId,
          status: 'active',
          gmbLocationId: { $exists: true, $ne: null }
        }).select('_id').lean()
        
        if (brandStores.length > 0) {
          query.storeId = { $in: brandStores.map(store => store._id) }
        }
      }
    }

    // Store filtering (legacy support)
    if (storeId && !viewType) {
      console.log('Reviews API - Store filtering debug:', {
        storeId,
        accountIdToUse,
        isGmbLocationId: storeId.includes('accounts/') || storeId.includes('locations/') || storeId.length > 24
      })
      
      // Check if storeId is a GMB location ID or MongoDB ObjectId
      if (storeId.includes('accounts/') || storeId.includes('locations/') || storeId.length > 24) {
        // It's a GMB location ID, find the corresponding store
        // Try multiple lookup strategies
        let store = await Store.findOne({ 
          gmbLocationId: storeId,
          gmbAccountId: accountIdToUse
        })
        
        // If not found, try without account filter (for stores without gmbAccountId field)
        if (!store) {
          const storeWithoutAccountFilter = await Store.findOne({ 
            gmbLocationId: storeId
          })
          
          // Check if this store belongs to current account by checking the location ID pattern
          if (storeWithoutAccountFilter && accountIdToUse && storeWithoutAccountFilter.gmbLocationId?.includes(`accounts/${accountIdToUse}/`)) {
            store = storeWithoutAccountFilter
          }
        }
        
        // If not found, try without the full path format
        if (!store && storeId.includes('/')) {
          const locationIdOnly = storeId.split('/').pop()
          console.log('Trying location ID only lookup:', locationIdOnly)
          
          // Try exact match with just the location ID
          store = await Store.findOne({ 
            gmbLocationId: locationIdOnly,
            gmbAccountId: accountIdToUse
          })
          
          // If still not found, try regex match
          if (!store) {
            store = await Store.findOne({ 
              gmbLocationId: { $regex: locationIdOnly, $options: 'i' },
              gmbAccountId: accountIdToUse
            })
          }
        }
        
        // If still not found, try exact match on different field formats
        if (!store) {
          store = await Store.findOne({ 
            $or: [
              { gmbLocationId: storeId },
              { 'gmbData.locationId': storeId },
              { placeId: storeId }
            ],
            gmbAccountId: accountIdToUse
          })
        }
        
        // Final debug: Check if store exists without account restriction
        if (!store) {
          const anyStore = await Store.findOne({ 
            $or: [
              { gmbLocationId: storeId },
              { gmbLocationId: storeId.split('/').pop() },
              { 'gmbData.locationId': storeId }
            ]
          }).select('_id name gmbLocationId gmbAccountId').lean()
          
          console.log('Reviews API - Store exists without account filter:', {
            found: !!anyStore,
            store: anyStore ? {
              id: (anyStore as any)._id,
              name: (anyStore as any).name,
              gmbLocationId: (anyStore as any).gmbLocationId,
              gmbAccountId: (anyStore as any).gmbAccountId,
              accountMatch: (anyStore as any).gmbAccountId === accountIdToUse
            } : null
          })
        }
        
        console.log('Reviews API - Store lookup result:', {
          storeFound: !!store,
          storeId: store?._id,
          storeName: store?.name,
          storeGmbLocationId: store?.gmbLocationId,
          lookupStrategies: {
            original: storeId,
            locationIdOnly: storeId.includes('/') ? storeId.split('/').pop() : null
          }
        })
        
        if (store) {
          query.storeId = store._id
        } else {
          console.log('Reviews API - No store found for GMB location ID:', storeId)
          // No store found for this GMB location ID
          return NextResponse.json({
            success: true,
            data: [],
            count: 0,
            totalCount: 0,
            pagination: { skip, limit: limit || 0, hasMore: false },
            loading: false,
            processingTime: Date.now() - startTime,
            debug: { message: 'No store found for location ID', storeId, accountIdToUse }
          })
        }
      } else {
        // It's already a MongoDB ObjectId
        query.storeId = storeId
      }
    } else if (locationId) {
      // Find store by GMB location ID first
      // Try with gmbAccountId filter first, then without if no stores have this field
      let store = await Store.findOne({ 
        gmbLocationId: locationId,
        gmbAccountId: accountIdToUse
      })
      
      // If not found and stores don't have gmbAccountId field, try without account filter
      if (!store) {
        const storeWithoutAccountFilter = await Store.findOne({ 
          gmbLocationId: locationId
        })
        
        // Check if this store belongs to current account by checking the location ID pattern
        if (storeWithoutAccountFilter && accountIdToUse && storeWithoutAccountFilter.gmbLocationId?.includes(`accounts/${accountIdToUse}/`)) {
          store = storeWithoutAccountFilter
        }
      }
      if (store) {
        query.storeId = store._id
      } else {
        // No store found for this location ID or user doesn't have access
        return NextResponse.json({
          success: true,
          data: [],
          count: 0,
          totalCount: 0,
          pagination: { skip, limit: limit || 0, hasMore: false },
          loading: false,
          processingTime: Date.now() - startTime
        })
      }
    }

    // Rating filtering
    if (rating && rating !== 'all') {
      query.starRating = parseInt(rating)
    }

    // Search filtering
    if (search && search.trim()) {
      query.$or = [
        { 'reviewer.displayName': { $regex: search, $options: 'i' } },
        { comment: { $regex: search, $options: 'i' } }
      ]
    }
    
    // Build aggregation pipeline for better performance
    const pipeline: PipelineStage[] = [
      { $match: query },
      {
        $lookup: {
          from: 'stores',
          localField: 'storeId',
          foreignField: '_id',
          as: 'storeInfo',
          pipeline: [
            {
              $project: {
                name: 1,
                address: 1,
                city: 1,
                gmbLocationId: 1,
                gmbAccountId: 1
              }
            }
          ]
        }
      },
      {
        $lookup: {
          from: 'brands',
          localField: 'brandId',
          foreignField: '_id',
          as: 'brandInfo',
          pipeline: [
            {
              $project: {
                name: 1,
                slug: 1
              }
            }
          ]
        }
      },
      { $sort: { gmbCreateTime: -1 } }
    ]

    // Add pagination if limit is specified
    if (skip > 0) {
      pipeline.push({ $skip: skip })
    }
    if (limit) {
      pipeline.push({ $limit: limit })
    }

    // Execute aggregation
    const [reviews, totalCountResult] = await Promise.all([
      Review.aggregate(pipeline),
      Review.countDocuments(query)
    ])
    
    // Transform reviews to include location information
    const transformedReviews = reviews.map((review: any) => {
      const storeInfo = review.storeInfo?.[0]
      const brandInfo = review.brandInfo?.[0]
      
      return {
          ...review,
        locationId: storeInfo?.gmbLocationId || '',
        locationName: storeInfo?.name || 'Unknown Location',
        locationAddress: storeInfo?.address || '',
        locationCity: storeInfo?.city || '',
        brandName: brandInfo?.name || '',
        brandSlug: brandInfo?.slug || '',
        // Keep original fields for backward compatibility
        createTime: review.gmbCreateTime,
        updateTime: review.gmbUpdateTime,
        storeId: storeInfo, // Replace ObjectId with populated data
        brandId: brandInfo
      }
    })
    
    // Calculate pagination
    const pagination = {
      skip,
      limit: limit || totalCountResult,
      hasMore: limit ? totalCountResult > skip + reviews.length : false,
      page: limit ? Math.floor(skip / limit) + 1 : 1,
      total: totalCountResult,
      pages: limit ? Math.ceil(totalCountResult / limit) : 1
    }
    
    // Add metadata about the query
    const metadata = {
      viewType: viewType || 'all',
      brandId,
      storeId,
      accountId: accountIdToUse,
      appliedFilters: {
        byBrand: !!brandId && (viewType === 'brand' || !viewType),
        byStore: !!storeId && (viewType === 'store' || !viewType),
        byAccount: !!accountIdToUse
      }
    }

    return NextResponse.json({
      success: true,
      data: transformedReviews,
      count: reviews.length,
      totalCount: totalCountResult,
      pagination,
      loading: false,
      processingTime: Date.now() - startTime,
      accountId: accountIdToUse,
      metadata
    })
    
  } catch (error: unknown) {
    console.error('Error fetching reviews from database:', error)
    
    // Handle SSL/TLS errors specifically
    let errorMessage = 'Failed to fetch reviews'
    let statusCode = 500
    
    if (error instanceof Error) {
      if (error.message.includes('SSL') || error.message.includes('TLS') || error.message.includes('ssl3_read_bytes')) {
        errorMessage = 'SSL connection failed. This may be due to network configuration or Google API access issues. Please try again later.'
        statusCode = 503 // Service Unavailable
      } else {
        errorMessage = error.message
      }
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage,
        details: error instanceof Error ? error.message : 'Unknown error',
        loading: false,
        processingTime: Date.now() - startTime
      },
      { status: statusCode }
    )
  }
}
