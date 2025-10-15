import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/database/connection'
import { Post } from '@/lib/database/separate-models'
import { Store } from '@/lib/database/models'
import { getGmbTokensFromRequest, getCurrentAccountId } from '@/lib/utils/auth-helpers'
import { PipelineStage } from 'mongoose'

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    // Get authentication tokens
    const tokens = await getGmbTokensFromRequest()
    if (!tokens) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required',
        loading: false
      }, { status: 401 })
    }

    // Get current user's account ID
    const currentAccountId = await getCurrentAccountId(tokens)
    if (!currentAccountId) {
      return NextResponse.json({
        success: false,
        error: 'Unable to determine account access',
        loading: false
      }, { status: 403 })
    }

    await connectDB()
    
    const { searchParams } = new URL(request.url)
    const locationId = searchParams.get('locationId')
    const storeId = searchParams.get('storeId')
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined // No default limit
    const skip = parseInt(searchParams.get('skip') || '0')
    const topicType = searchParams.get('topicType')
    const status = searchParams.get('status') || 'active'
    const state = searchParams.get('state')
    const search = searchParams.get('search')
    
    // Build query for posts with account-based filtering
    const query: Record<string, unknown> = { 
      status,
      accountId: currentAccountId // Only show posts for current user's account
    }
    
    // Store filtering
    if (storeId) {
      // Check if storeId is a GMB location ID or MongoDB ObjectId
      if (storeId.includes('accounts/') || storeId.includes('locations/') || storeId.length > 24) {
        // It's a GMB location ID, find the corresponding store
        let store = await Store.findOne({ 
          gmbLocationId: storeId,
          gmbAccountId: currentAccountId
        })
        
        // If not found, try without account filter (for stores without gmbAccountId field)
        if (!store) {
          const storeWithoutAccountFilter = await Store.findOne({ 
            gmbLocationId: storeId
          })
          
          // Check if this store belongs to current account by checking the location ID pattern
          if (storeWithoutAccountFilter && storeWithoutAccountFilter.gmbLocationId?.includes(`accounts/${currentAccountId}/`)) {
            store = storeWithoutAccountFilter
          }
        }
        if (store) {
          query.storeId = store._id
        } else {
          // No store found for this GMB location ID
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
      } else {
        // It's already a MongoDB ObjectId
        query.storeId = storeId
      }
    } else if (locationId) {
      // Find store by GMB location ID first
      let store = await Store.findOne({ 
        gmbLocationId: locationId,
        gmbAccountId: currentAccountId
      })
      
      // If not found, try without account filter (for stores without gmbAccountId field)
      if (!store) {
        const storeWithoutAccountFilter = await Store.findOne({ 
          gmbLocationId: locationId
        })
        
        // Check if this store belongs to current account by checking the location ID pattern
        if (storeWithoutAccountFilter && storeWithoutAccountFilter.gmbLocationId?.includes(`accounts/${currentAccountId}/`)) {
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
    
    // Topic type filtering
    if (topicType && topicType !== 'all') {
      query.topicType = topicType.toUpperCase()
    }

    // State filtering (LIVE, DRAFT, EXPIRED)
    if (state && state !== 'all') {
      query.state = state.toUpperCase()
    }

    // Search filtering
    if (search && search.trim()) {
      query.$or = [
        { summary: { $regex: search, $options: 'i' } },
        { 'event.title': { $regex: search, $options: 'i' } }
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
    const [posts, totalCountResult] = await Promise.all([
      Post.aggregate(pipeline),
      Post.countDocuments(query)
    ])
    
    // Transform posts to include location information
    const transformedPosts = posts.map((post: any) => {
      const storeInfo = post.storeInfo?.[0]
      const brandInfo = post.brandInfo?.[0]
      
      return {
        ...post,
        // GMB post ID for API operations
        gmbPostId: post.gmbPostId || post.id,
        // Location information
        locationId: storeInfo?.gmbLocationId || '',
        locationName: storeInfo?.name || 'Unknown Location',
        locationAddress: storeInfo?.address || '',
        locationCity: storeInfo?.city || '',
        // Brand information
        brandName: brandInfo?.name || '',
        brandSlug: brandInfo?.slug || '',
        // Keep original fields for backward compatibility
        createTime: post.gmbCreateTime,
        updateTime: post.gmbUpdateTime,
        storeId: storeInfo, // Replace ObjectId with populated data
        brandId: brandInfo
      }
    })
    
    // Calculate pagination
    const pagination = {
      skip,
      limit: limit || totalCountResult,
      hasMore: limit ? totalCountResult > skip + posts.length : false,
      page: limit ? Math.floor(skip / limit) + 1 : 1,
      total: totalCountResult,
      pages: limit ? Math.ceil(totalCountResult / limit) : 1
    }
    
    // Get account context for the response
    const accountContext = {
      accountId: currentAccountId,
      name: 'GMB Account', // This could be enhanced to get actual account name
      email: 'account@example.com', // This could be enhanced to get actual email
      lastSyncAt: new Date().toISOString()
    }

    return NextResponse.json({
      success: true,
      data: transformedPosts,
      count: posts.length,
      totalCount: totalCountResult,
      pagination,
      loading: false,
      processingTime: Date.now() - startTime,
      accountId: currentAccountId,
      accountContext
    })
    
  } catch (error: unknown) {
    console.error('Error fetching posts from database:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch posts',
        loading: false,
        processingTime: Date.now() - startTime
      },
      { status: 500 }
    )
  }
}
