import { NextRequest, NextResponse } from 'next/server'
import { Performance } from '@/lib/database/separate-models'
import { connectToDatabase } from '@/lib/database/connection'
import { getGmbTokensFromRequest, getAllBrandAccountIds } from '@/lib/utils/auth-helpers'

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase()
    
    const { searchParams } = new URL(request.url)
    const brandId = searchParams.get('brandId')
    const accountId = searchParams.get('accountId')
    const periodType = searchParams.get('periodType')
    const days = searchParams.get('days')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const dateRange = searchParams.get('dateRange') // New parameter for specific date ranges (7, 30, 60, 90)
    const status = searchParams.get('status') || 'active'
    const limit = parseInt(searchParams.get('limit') || '1000') // Higher default for comprehensive data
    
    // Get tokens from request to filter by accessible GMB accounts
    const tokens = await getGmbTokensFromRequest()
    let accessibleAccountIds: string[] = []
    
    if (tokens) {
      // Get all account IDs that the current user has access to
      accessibleAccountIds = await getAllBrandAccountIds()
    }
    
    // Build query
    const query: Record<string, unknown> = { status }
    
    if (brandId && brandId !== 'all') query.brandId = brandId
    if (accountId) {
      query.accountId = accountId
    } else if (accessibleAccountIds.length > 0) {
      // Only show performance data for stores linked to accessible GMB accounts
      query.accountId = { $in: accessibleAccountIds }
    } else {
      // If no GMB authentication, return empty data
      return NextResponse.json({
        success: true,
        data: [],
        storeWiseData: {},
        aggregated: {
          totalViews: 0,
          totalActions: 0,
          totalCallClicks: 0,
          totalWebsiteClicks: 0,
          totalDirectionRequests: 0,
          averageConversionRate: 0,
          averageClickThroughRate: 0,
          totalStores: 0,
          totalDataPoints: 0
        }
      })
    }
    
    console.log('🔍 Store-wise Performance API - Query filters:', query)
    
    // Debug: Check what performance data exists in database
    const allPerformanceData = await Performance.find({ status: 'active' }).limit(5)
    console.log('🔍 Store-wise Performance API - Sample performance data:', allPerformanceData.map(p => ({
      id: p._id,
      storeId: p.storeId,
      period: {
        startTime: p.period?.startTime,
        endTime: p.period?.endTime,
        dateRange: p.period?.dateRange
      },
      views: p.views,
      actions: p.actions
    })))
    
    // Debug: Check what dateRange.days values exist
    const daysDistribution = await Performance.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: '$period.dateRange.days', count: { $sum: 1 } } },
      { $sort: { _id: 1 as const } }
    ])
    console.log('🔍 Store-wise Performance API - Days distribution:', daysDistribution)
    
    if (periodType) query['period.periodType'] = periodType
    
    // Date range filtering - try exact days match first, fallback to date range
    if (days) {
      // First try to filter by the exact days value saved in the database
      query['period.dateRange.days'] = parseInt(days)
      
      // Check if we have any data with this exact days value
      const exactMatchCount = await Performance.countDocuments({ 
        status: 'active', 
        'period.dateRange.days': parseInt(days) 
      })
      
      console.log(`🔍 Store-wise Performance API - Exact match for ${days} days: ${exactMatchCount} records`)
      
      // If no exact match, fallback to date range filtering
      if (exactMatchCount === 0) {
        console.log(`🔍 Store-wise Performance API - No exact match for ${days} days, falling back to date range filtering`)
        delete query['period.dateRange.days']
        
        const endTime = new Date()
        const startTime = new Date()
        startTime.setDate(startTime.getDate() - parseInt(days))
        
        query['period.startTime'] = { $lte: endTime }
        query['period.endTime'] = { $gte: startTime }
      }
    } else if (startDate && endDate) {
      const start = new Date(startDate)
      const end = new Date(endDate)
      query['period.startTime'] = { $lte: end }
      query['period.endTime'] = { $gte: start }
    } else if (dateRange) {
      // Filter by specific date range (7, 30, 60, 90 days)
      const rangeDays = parseInt(dateRange)
      if (!isNaN(rangeDays)) {
        query['period.dateRange.days'] = rangeDays
      }
    }
    
    // Debug: Log the final query
    console.log('🔍 Store-wise Performance API - Final query for aggregation:', JSON.stringify(query, null, 2))
    
    // Execute aggregation pipeline for store-wise analytics
    const storeWiseAggregation = await Performance.aggregate([
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
          dataPointsCount: { $sum: 1 },
          latestDataPoint: { $max: '$period.startTime' },
          oldestDataPoint: { $min: '$period.startTime' }
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
          },
          callConversionRate: {
            $cond: {
              if: { $gt: ['$totalViews', 0] },
              then: { $multiply: [{ $divide: ['$totalCallClicks', '$totalViews'] }, 100] },
              else: 0
            }
          },
          websiteConversionRate: {
            $cond: {
              if: { $gt: ['$totalViews', 0] },
              then: { $multiply: [{ $divide: ['$totalWebsiteClicks', '$totalViews'] }, 100] },
              else: 0
            }
          },
          directionConversionRate: {
            $cond: {
              if: { $gt: ['$totalViews', 0] },
              then: { $multiply: [{ $divide: ['$totalDirectionRequests', '$totalViews'] }, 100] },
              else: 0
            }
          },
        }
      },
      { $sort: { totalViews: -1 as const } },
      { $limit: limit }
    ])
    
    // Calculate overall aggregated metrics with data sanitization
    const overallAggregation = await Performance.aggregate([
      { $match: query },
      {
        $addFields: {
          // Sanitize numeric fields to prevent astronomical values
          sanitizedViews: {
            $cond: {
              if: { $and: [{ $gte: ['$views', 0] }, { $lte: ['$views', 1000000] }] },
              then: '$views',
              else: 0
            }
          },
          sanitizedActions: {
            $cond: {
              if: { $and: [{ $gte: ['$actions', 0] }, { $lte: ['$actions', 1000000] }] },
              then: '$actions',
              else: 0
            }
          },
          sanitizedCallClicks: {
            $cond: {
              if: { $and: [{ $gte: ['$callClicks', 0] }, { $lte: ['$callClicks', 1000000] }] },
              then: '$callClicks',
              else: 0
            }
          },
          sanitizedWebsiteClicks: {
            $cond: {
              if: { $and: [{ $gte: ['$websiteClicks', 0] }, { $lte: ['$websiteClicks', 1000000] }] },
              then: '$websiteClicks',
              else: 0
            }
          },
          sanitizedDirectionRequests: {
            $cond: {
              if: { $and: [{ $gte: ['$directionRequests', 0] }, { $lte: ['$directionRequests', 1000000] }] },
              then: '$directionRequests',
              else: 0
            }
          },
          sanitizedPhotoViews: {
            $cond: {
              if: { $and: [{ $gte: ['$photoViews', 0] }, { $lte: ['$photoViews', 1000000] }] },
              then: '$photoViews',
              else: 0
            }
          },
          sanitizedQueries: {
            $cond: {
              if: { $and: [{ $gte: ['$queries', 0] }, { $lte: ['$queries', 1000000] }] },
              then: '$queries',
              else: 0
            }
          },
          sanitizedMessages: {
            $cond: {
              if: { $and: [{ $gte: ['$businessMessages', 0] }, { $lte: ['$businessMessages', 1000000] }] },
              then: '$businessMessages',
              else: 0
            }
          },
          sanitizedBookings: {
            $cond: {
              if: { $and: [{ $gte: ['$businessBookings', 0] }, { $lte: ['$businessBookings', 1000000] }] },
              then: '$businessBookings',
              else: 0
            }
          },
          sanitizedFoodOrders: {
            $cond: {
              if: { $and: [{ $gte: ['$businessFoodOrders', 0] }, { $lte: ['$businessFoodOrders', 1000000] }] },
              then: '$businessFoodOrders',
              else: 0
            }
          }
        }
      },
      {
        $group: {
          _id: null,
          totalViews: { $sum: '$sanitizedViews' },
          totalActions: { $sum: '$sanitizedActions' },
          totalCallClicks: { $sum: '$sanitizedCallClicks' },
          totalWebsiteClicks: { $sum: '$sanitizedWebsiteClicks' },
          totalDirectionRequests: { $sum: '$sanitizedDirectionRequests' },
          totalPhotoViews: { $sum: '$sanitizedPhotoViews' },
          totalQueries: { $sum: '$sanitizedQueries' },
          totalMessages: { $sum: '$sanitizedMessages' },
          totalBookings: { $sum: '$sanitizedBookings' },
          totalFoodOrders: { $sum: '$sanitizedFoodOrders' },
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
      totalPhotoViews: 0,
      totalQueries: 0,
      totalMessages: 0,
      totalBookings: 0,
      totalFoodOrders: 0,
      averageConversionRate: 0,
      averageClickThroughRate: 0,
      uniqueStores: [],
      totalDataPoints: 0
    }
    
    // Add calculated metrics to aggregated data
    const enhancedAggregated = {
      ...aggregated,
      totalStores: aggregated.uniqueStores?.length || 0,
      overallEngagementRate: aggregated.totalViews > 0 
        ? ((aggregated.totalCallClicks + aggregated.totalWebsiteClicks) / aggregated.totalViews) * 100 
        : 0,
      overallCallConversionRate: aggregated.totalViews > 0 
        ? (aggregated.totalCallClicks / aggregated.totalViews) * 100 
        : 0,
      overallWebsiteConversionRate: aggregated.totalViews > 0 
        ? (aggregated.totalWebsiteClicks / aggregated.totalViews) * 100 
        : 0,
      overallDirectionConversionRate: aggregated.totalViews > 0 
        ? (aggregated.totalDirectionRequests / aggregated.totalViews) * 100 
        : 0
    }
    
    // Remove the uniqueStores array from response to keep it clean
    delete enhancedAggregated.uniqueStores
    
    // Transform store-wise data into a more usable format
    const storeWiseData = storeWiseAggregation.reduce((acc, store) => {
      acc[store._id] = {
        storeId: store._id,
        store: {
          _id: store.store._id,
          name: store.store.name,
          address: store.store.address,
          city: store.store.city || store.store.address?.city,
          state: store.store.state || store.store.address?.state,
          phone: store.store.phone,
          email: store.store.email,
          gmbPlaceId: store.store.gmbPlaceId,
          status: store.store.status
        },
        brand: {
          _id: store.brand._id,
          name: store.brand.name,
          slug: store.brand.slug
        },
        accountId: store.accountId,
        metrics: {
          totalViews: store.totalViews,
          totalActions: store.totalActions,
          totalCallClicks: store.totalCallClicks,
          totalWebsiteClicks: store.totalWebsiteClicks,
          totalDirectionRequests: store.totalDirectionRequests,
          totalPhotoViews: store.totalPhotoViews,
          totalQueries: store.totalQueries,
          totalMessages: store.totalMessages,
          totalBookings: store.totalBookings,
          totalFoodOrders: store.totalFoodOrders,
          averageConversionRate: store.averageConversionRate,
          averageClickThroughRate: store.averageClickThroughRate,
          engagementRate: store.engagementRate,
          callConversionRate: store.callConversionRate,
          websiteConversionRate: store.websiteConversionRate,
          directionConversionRate: store.directionConversionRate
        },
        analytics: {
          dataPointsCount: store.dataPointsCount,
          latestDataPoint: store.latestDataPoint,
          oldestDataPoint: store.oldestDataPoint,
          dataRange: {
            days: Math.ceil((new Date(store.latestDataPoint).getTime() - new Date(store.oldestDataPoint).getTime()) / (1000 * 60 * 60 * 24))
          }
        }
      }
      return acc
    }, {} as Record<string, any>)
    
    return NextResponse.json({
      success: true,
      data: storeWiseAggregation, // Raw aggregated data
      storeWiseData, // Formatted store-wise data
      aggregated: enhancedAggregated,
        query: {
          filters: {
            brandId: brandId || 'all',
            accountId: accountId || 'all accounts',
            periodType: periodType || 'all periods',
            dateRange: dateRange ? `${dateRange} days` : startDate && endDate ? { startDate, endDate } : days ? `Last ${days} days` : 'All time',
            status
          },
          totalStoresWithData: Object.keys(storeWiseData).length
        }
    })
    
  } catch (error) {
    console.error('Error fetching store-wise performance data:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch store-wise performance data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

