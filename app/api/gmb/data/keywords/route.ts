import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/database/connection'
import { SearchKeyword } from '@/lib/database/models'
import { PipelineStage } from 'mongoose'
import { getGmbTokensFromRequest, getAllBrandAccountIds } from '@/lib/utils/auth-helpers'

export async function GET(request: NextRequest) {
  try {
    await connectDB()
    
    const { searchParams } = new URL(request.url)
    const locationId = searchParams.get('locationId')
    const year = searchParams.get('year')
    const month = searchParams.get('month')
    const limit = searchParams.get('limit')
    const skip = searchParams.get('skip')
    const sortBy = searchParams.get('sortBy') || 'impressions' // Default sort by impressions
    const sortOrder = searchParams.get('sortOrder') || 'desc' // Default descending
    // Derive accessible accounts from current user (via tokens)
    const tokens = await getGmbTokensFromRequest()
    let accessibleAccountIds: string[] = []
    if (tokens) {
      accessibleAccountIds = await getAllBrandAccountIds()
    }

    // If not authenticated or no accessible accounts, return empty
    if (!tokens || accessibleAccountIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        count: 0,
        totalCount: 0,
        summary: {
          totalUniqueKeywords: 0,
          totalImpressions: 0,
          totalClicks: 0,
          avgPosition: 0,
          avgCtr: 0
        },
        pagination: {
          skip: parseInt(skip || '0'),
          limit: parseInt(limit || '0'),
          hasMore: false
        },
        message: 'No GMB authentication or no accessible accounts for this user'
      })
    }

    // Build query, support legacy locationId param but model uses storeId
    const query: Record<string, unknown> = {
      accountId: { $in: accessibleAccountIds }
    }
    if (locationId) query.storeId = locationId
    if (year) query['period.year'] = parseInt(year)
    if (month) query['period.month'] = parseInt(month)
    
    // Build aggregation pipeline for better performance and analytics
    const pipeline: PipelineStage[] = [
      { $match: query }
    ]
    
    // Add aggregation for keyword analytics if no specific period is requested
    if (!year && !month) {
      // Group by keyword to get totals across all periods
      pipeline.push({
        $group: {
          _id: '$keyword',
          totalImpressions: { $sum: '$impressions' },
          totalClicks: { $sum: '$clicks' },
          avgPosition: { $avg: '$position' },
          months: { $push: { year: '$period.year', month: '$period.month', impressions: '$impressions' } },
          locationId: { $first: '$locationId' }
        }
      })
      
      // Reshape the output and calculate CTR from clicks and impressions
      pipeline.push({
        $project: {
          keyword: '$_id',
          locationId: '$locationId',
          totalImpressions: 1,
          totalClicks: 1,
          avgPosition: { $round: ['$avgPosition', 2] },
          avgCtr: { 
            $round: [
              {
                $cond: [
                  { $gt: ['$totalImpressions', 0] },
                  { $divide: ['$totalClicks', '$totalImpressions'] },
                  0
                ]
              },
              4
            ]
          },
          monthlyData: '$months',
          _id: 0
        }
      })
    }
    
    // Sort
    const sortField = sortBy === 'keyword' ? 'keyword' : 
                     sortBy === 'clicks' ? 'totalClicks' : 
                     sortBy === 'position' ? 'avgPosition' : 
                     sortBy === 'ctr' ? 'avgCtr' : 'totalImpressions'
    
    pipeline.push({ 
      $sort: { 
        [sortField]: sortOrder === 'asc' ? 1 : -1 
      } 
    })
    
    if (skip) {
      pipeline.push({ $skip: parseInt(skip) })
    }
    
    if (limit) {
      pipeline.push({ $limit: parseInt(limit) })
    }
    
    // Execute aggregation
    const keywords = await SearchKeyword.aggregate(pipeline)
    
    // Get total count for pagination
    const countPipeline = [
      { $match: query }
    ]
    if (!year && !month) {
      countPipeline.push({
        $group: {
          _id: '$keyword'
        }
      } as any)
    }
    
    const totalCountResult = await SearchKeyword.aggregate([
      ...countPipeline,
      { $count: 'total' }
    ])
    
    const totalCount = totalCountResult.length > 0 ? totalCountResult[0].total : 0
    
    // Get summary statistics - calculate CTR from total clicks and impressions
    const summaryStats = await SearchKeyword.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalKeywords: { $addToSet: '$keyword' },
          totalImpressions: { $sum: '$impressions' },
          totalClicks: { $sum: '$clicks' },
          avgPosition: { $avg: '$position' }
        }
      },
      {
        $project: {
          totalUniqueKeywords: { $size: '$totalKeywords' },
          totalImpressions: 1,
          totalClicks: 1,
          avgPosition: { $round: ['$avgPosition', 2] },
          avgCtr: { 
            $round: [
              {
                $cond: [
                  { $gt: ['$totalImpressions', 0] },
                  { $divide: ['$totalClicks', '$totalImpressions'] },
                  0
                ]
              },
              4
            ]
          },
          _id: 0
        }
      }
    ])
    
    const summary = summaryStats.length > 0 ? summaryStats[0] : {
      totalUniqueKeywords: 0,
      totalImpressions: 0,
      totalClicks: 0,
      avgPosition: 0,
      avgCtr: 0
    }
    
    return NextResponse.json({
      success: true,
      data: keywords,
      count: keywords.length,
      totalCount,
      summary,
      pagination: {
        skip: parseInt(skip || '0'),
        limit: parseInt(limit || '0'),
        hasMore: totalCount > parseInt(skip || '0') + keywords.length
      }
    })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error fetching search keywords from database:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage || 'Failed to fetch search keywords' 
      },
      { status: 500 }
    )
  }
}
