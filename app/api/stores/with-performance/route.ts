import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/database/connection'
import { Performance } from '@/lib/database/models'
import { getGmbTokensFromRequest, getAllBrandAccountIds } from '@/lib/utils/auth-helpers'
import { getSession } from '@/lib/utils/session'

// GET /api/stores/with-performance - Get stores that have performance data
export async function GET(request: NextRequest) {
  try {
    await connectDB()

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '1000')

    // Get session and accessible account IDs
    const session = await getSession()
    const tokens = await getGmbTokensFromRequest()
    let accessibleAccountIds: string[] = []
    
    if (tokens) {
      accessibleAccountIds = await getAllBrandAccountIds()
    }

    // Build match query
    const matchQuery: Record<string, unknown> = {
      status: 'active'
    }

    // Filter by accessible accounts if available
    if (accessibleAccountIds.length > 0) {
      matchQuery.accountId = { $in: accessibleAccountIds }
    } else if (session && session.email) {
      // If no accessible accounts but we have a session, try to find user's brand
      // This prevents showing other users' data
      const { Brand } = await import('@/lib/database/models')
      const userBrand = await Brand.findOne({
        $or: [
          { email: session.email },
          { 'users.owner.email': session.email },
          { 'users.manager.email': session.email }
        ]
      }).lean()
      
      if (userBrand && userBrand.settings?.gmbIntegration?.gmbAccountId) {
        matchQuery.accountId = userBrand.settings.gmbIntegration.gmbAccountId
      } else {
        // If no brand found for user, return empty results to prevent data leakage
        matchQuery.accountId = { $exists: false }
      }
    } else {
      // If no session and no accessible accounts, return empty results
      matchQuery.accountId = { $exists: false }
    }

    // Get unique stores that have performance data
    const storesWithPerformance = await Performance.aggregate([
      {
        $match: matchQuery
      },
      {
        $lookup: {
          from: 'stores',
          localField: 'storeId',
          foreignField: '_id',
          as: 'storeInfo'
        }
      },
      {
        $unwind: {
          path: '$storeInfo',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $group: {
          _id: '$storeId',
          storeName: { $first: '$storeInfo.name' },
          totalViews: { $sum: '$views' },
          totalActions: { $sum: '$actions' },
          lastUpdated: { $max: '$createdAt' },
          accountId: { $first: '$accountId' }
        }
      },
      {
        $project: {
          _id: 1,
          name: '$storeName',
          totalViews: 1,
          totalActions: 1,
          lastUpdated: 1,
          accountId: 1
        }
      },
      {
        $sort: { totalViews: -1 }
      },
      {
        $limit: limit
      }
    ])

    return NextResponse.json({
      success: true,
      data: storesWithPerformance,
      count: storesWithPerformance.length
    })

  } catch (error) {
    console.error('Error fetching stores with performance data:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch stores with performance data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
