import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/database/connection'
import { Store, Brand } from '@/lib/database/models'
import { PipelineStage } from 'mongoose'

export async function GET(request: NextRequest) {
  try {
    await connectDB()
    
    const { searchParams } = new URL(request.url)
    const storeId = searchParams.get('storeId')
    const brandId = searchParams.get('brandId')
    const email = searchParams.get('email')
    const limit = searchParams.get('limit')
    const skip = searchParams.get('skip')
    
    const query: Record<string, unknown> = { status: 'active' }
    
    if (storeId) {
      query._id = storeId
    } else if (brandId) {
      query.brandId = brandId
    } else if (email) {
      // Find brand by email first
      const brand = await Brand.findOne({ 
        $or: [
          { email: email },
          { 'users.owner.email': email }
        ]
      })
      
      if (!brand) {
        return NextResponse.json({
          success: false,
          error: 'Brand not found for email'
        }, { status: 404 })
      }
      
      query.brandId = brand._id
    }
    
    // Only get stores that have GMB insights
    query['gmbData.insights.0'] = { $exists: true }
    
    // Build aggregation pipeline to extract insights
    const pipeline: PipelineStage[] = [
      { $match: query },
      { $unwind: '$gmbData.insights' },
      {
        $project: {
          storeId: '$_id',
          storeName: '$name',
          storeCode: '$storeCode',
          insight: '$gmbData.insights'
        }
      },
      { $sort: { 'insight.period.startTime': -1 as const } }
    ]
    
    // Add pagination
    if (skip) {
      pipeline.push({ $skip: parseInt(skip) })
    }
    if (limit) {
      pipeline.push({ $limit: parseInt(limit) })
    }
    
    // Execute aggregation
    const insights = await Store.aggregate(pipeline)
    
    // Get total count for pagination
    const totalCountPipeline = [
      { $match: query },
      { $unwind: '$gmbData.insights' },
      { $count: 'total' }
    ]
    
    const totalCountResult = await Store.aggregate(totalCountPipeline)
    const totalCount = totalCountResult.length > 0 ? totalCountResult[0].total : 0
    
    return NextResponse.json({
      success: true,
      data: insights,
      count: insights.length,
      totalCount,
      query: query
    })
  } catch (error: unknown) {
    console.error('Error fetching GMB insights from database:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch insights' 
      },
      { status: 500 }
    )
  }
}