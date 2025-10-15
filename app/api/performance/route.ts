import { NextRequest, NextResponse } from 'next/server'
import { Performance } from '@/lib/database/separate-models'
import { connectToDatabase } from '@/lib/database/connection'
import { getGmbTokensFromRequest, getAllBrandAccountIds } from '@/lib/utils/auth-helpers'

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase()
    
    const { searchParams } = new URL(request.url)
    const storeId = searchParams.get('storeId')
    const brandId = searchParams.get('brandId')
    const accountId = searchParams.get('accountId')
    const periodType = searchParams.get('periodType')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const limit = parseInt(searchParams.get('limit') || '100')
    const skip = parseInt(searchParams.get('skip') || '0')
    const status = searchParams.get('status') || 'active'
    const groupBy = searchParams.get('groupBy') // New parameter for grouping
    
    // Get tokens from request to filter by accessible GMB accounts
    const tokens = await getGmbTokensFromRequest()
    let accessibleAccountIds: string[] = []
    
    if (tokens) {
      // Get all account IDs that the current user has access to
      accessibleAccountIds = await getAllBrandAccountIds()
      console.log('🔍 Performance API - Accessible GMB Account IDs:', accessibleAccountIds)
    }
    
    // Build query
    const query: Record<string, unknown> = { status }
    
    if (storeId && storeId !== 'all') query.storeId = storeId
    if (brandId && brandId !== 'all') query.brandId = brandId
    if (accountId) {
      query.accountId = accountId
    } else if (accessibleAccountIds.length > 0) {
      // Only show performance data for stores linked to accessible GMB accounts
      query.accountId = { $in: accessibleAccountIds }
      console.log('🔍 Performance API - Filtering by accessible account IDs:', accessibleAccountIds)
    } else {
      // If no GMB authentication, return empty data
      return NextResponse.json({
        success: true,
        data: [],
        count: 0,
        totalCount: 0,
        pagination: {
          page: 1,
          limit: 100,
          total: 0,
          pages: 0
        },
        aggregated: {
          totalViews: 0,
          totalActions: 0,
          totalCallClicks: 0,
          totalWebsiteClicks: 0,
          averageConversionRate: 0,
          averageClickThroughRate: 0
        },
        message: 'No GMB authentication - connect your Google My Business account to view performance data'
      })
    }
    
    console.log('🔍 Performance API - Query filters:', query)
    
    if (periodType) query['period.periodType'] = periodType
    
    // Date range filtering using period overlap logic
    // Select records where (period.startTime <= endDate) AND (period.endTime >= startDate)
    if (startDate && endDate) {
      const start = new Date(startDate)
      const end = new Date(endDate)
      query['period.startTime'] = { $lte: end }
      query['period.endTime'] = { $gte: start }
    } else if (startDate) {
      const start = new Date(startDate)
      query['period.endTime'] = { $gte: start }
    } else if (endDate) {
      const end = new Date(endDate)
      query['period.startTime'] = { $lte: end }
    }
    
    // Execute query with population
    const performanceData = await Performance.find(query)
      .populate('storeId', 'name address city')
      .populate('brandId', 'name slug')
      .sort({ 'period.startTime': -1 })
      .limit(limit)
      .skip(skip)
      .lean()
    
    // Get total count
    const totalCount = await Performance.countDocuments(query)
    
    // Calculate pagination
    const pagination = {
      page: Math.floor(skip / limit) + 1,
      limit,
      total: totalCount,
      pages: Math.ceil(totalCount / limit)
    }
    
    // Handle store-wise grouping if requested
    if (groupBy === 'store') {
      // Execute aggregation pipeline for store-wise analytics
      const storeWiseData = await Performance.aggregate([
        { $match: query },
        {
          $lookup: {
            from: 'stores',
            localField: 'storeId',
            foreignField: '_id',
            as: 'store'
          }
        },
        {
          $lookup: {
            from: 'brands',
            localField: 'brandId',
            foreignField: '_id',
            as: 'brand'
          }
        },
        { $unwind: '$store' },
        { $unwind: '$brand' },
        {
          $group: {
            _id: '$storeId',
            store: { $first: '$store' },
            brand: { $first: '$brand' },
            accountId: { $first: '$accountId' },
            totalViews: { $sum: '$views' },
            totalActions: { $sum: '$actions' },
            totalCallClicks: { $sum: '$callClicks' },
            totalWebsiteClicks: { $sum: '$websiteClicks' },
            totalDirectionRequests: { $sum: '$directionRequests' },
            totalPhotoViews: { $sum: '$photoViews' },
            totalQueries: { $sum: '$queries' },
            totalMessages: { $sum: '$businessMessages' },
            totalBookings: { $sum: '$businessBookings' },
            totalFoodOrders: { $sum: '$businessFoodOrders' },
            averageConversionRate: { $avg: '$conversionRate' },
            averageClickThroughRate: { $avg: '$clickThroughRate' },
            dataPointsCount: { $sum: 1 }
          }
        },
        {
          $addFields: {
            engagementRate: {
              $cond: {
                if: { $gt: ['$totalViews', 0] },
                then: {
                  $multiply: [
                    {
                      $divide: [
                        { $add: ['$totalCallClicks', '$totalWebsiteClicks'] },
                        '$totalViews'
                      ]
                    },
                    100
                  ]
                },
                else: 0
              }
            }
          }
        },
        { $sort: { totalViews: -1 } },
        { $skip: skip },
        { $limit: limit }
      ])

      // Calculate overall aggregated metrics for store grouping
      const overallAggregation = await Performance.aggregate([
        { $match: query },
        {
          $group: {
            _id: null,
            totalViews: { $sum: '$views' },
            totalActions: { $sum: '$actions' },
            totalCallClicks: { $sum: '$callClicks' },
            totalWebsiteClicks: { $sum: '$websiteClicks' },
            totalDirectionRequests: { $sum: '$directionRequests' },
            averageConversionRate: { $avg: '$conversionRate' },
            averageClickThroughRate: { $avg: '$clickThroughRate' },
            uniqueStores: { $addToSet: '$storeId' },
            totalDataPoints: { $sum: 1 }
          }
        }
      ])

      const aggregated = overallAggregation[0] || {
        totalViews: 0,
        totalActions: 0,
        totalCallClicks: 0,
        totalWebsiteClicks: 0,
        totalDirectionRequests: 0,
        averageConversionRate: 0,
        averageClickThroughRate: 0,
        uniqueStores: [],
        totalDataPoints: 0
      }

      return NextResponse.json({
        success: true,
        data: storeWiseData,
        count: storeWiseData.length,
        totalCount: aggregated.uniqueStores?.length || 0,
        pagination: {
          page: Math.floor(skip / limit) + 1,
          limit,
          total: aggregated.uniqueStores?.length || 0,
          pages: Math.ceil((aggregated.uniqueStores?.length || 0) / limit)
        },
        aggregated: {
          totalViews: aggregated.totalViews,
          totalActions: aggregated.totalActions,
          totalCallClicks: aggregated.totalCallClicks,
          totalWebsiteClicks: aggregated.totalWebsiteClicks,
          averageConversionRate: aggregated.averageConversionRate,
          averageClickThroughRate: aggregated.averageClickThroughRate,
          totalStores: aggregated.uniqueStores?.length || 0,
          totalDataPoints: aggregated.totalDataPoints
        },
        groupedBy: 'store'
      })
    }

    // Default behavior - return individual performance records
    // Calculate aggregated metrics
    const aggregatedMetrics = await Performance.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalViews: { $sum: '$views' },
          totalActions: { $sum: '$actions' },
          totalCallClicks: { $sum: '$callClicks' },
          totalWebsiteClicks: { $sum: '$websiteClicks' },
          averageConversionRate: { $avg: '$conversionRate' },
          averageClickThroughRate: { $avg: '$clickThroughRate' }
        }
      }
    ])
    
    return NextResponse.json({
      success: true,
      data: performanceData,
      count: performanceData.length,
      totalCount,
      pagination,
      aggregated: aggregatedMetrics[0] || {
        totalViews: 0,
        totalActions: 0,
        totalCallClicks: 0,
        totalWebsiteClicks: 0,
        averageConversionRate: 0,
        averageClickThroughRate: 0
      }
    })
    
  } catch (error) {
    console.error('Error fetching performance data:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch performance data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase()
    
    const body = await request.json()
    
    // Validate required fields
    const { storeId, brandId, accountId, period } = body
    
    if (!storeId || !brandId || !accountId || !period?.startTime || !period?.endTime) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields'
      }, { status: 400 })
    }
    
    // Check if performance data already exists for this period
    const existingPerformance = await Performance.findOne({
      storeId,
      'period.startTime': new Date(period.startTime),
      'period.endTime': new Date(period.endTime)
    })
    
    if (existingPerformance) {
      // Update existing record
      const updatedPerformance = await Performance.findByIdAndUpdate(
        existingPerformance._id,
        body,
        { new: true, runValidators: true }
      )
        .populate('storeId', 'name address city')
        .populate('brandId', 'name slug')
      
      return NextResponse.json({
        success: true,
        data: updatedPerformance,
        message: 'Performance data updated'
      })
    }
    
    // Create new performance record
    const performance = new Performance(body)
    await performance.save()
    
    // Populate references
    await performance.populate('storeId', 'name address city')
    await performance.populate('brandId', 'name slug')
    
    return NextResponse.json({
      success: true,
      data: performance
    }, { status: 201 })
    
  } catch (error) {
    console.error('Error creating performance data:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to create performance data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
