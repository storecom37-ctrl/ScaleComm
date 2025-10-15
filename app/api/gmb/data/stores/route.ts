import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/database/connection'
import { Store, Brand } from '@/lib/database/models'
import { PipelineStage } from 'mongoose'

export async function GET(request: NextRequest) {
  try {
    await connectDB()
    
    const { searchParams } = new URL(request.url)
    const brandId = searchParams.get('brandId')
    const email = searchParams.get('email')
    const includeGmbData = searchParams.get('includeGmbData') === 'true'
    const limit = searchParams.get('limit')
    const skip = searchParams.get('skip')
    
    const query: Record<string, unknown> = { status: 'active' }
    
    if (brandId) {
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
    
    // Build projection to include/exclude GMB data
    const projection: Record<string, unknown> = {}
    if (!includeGmbData) {
      projection['gmbData'] = 0 // Exclude GMB data
    }
    
    // Build aggregation pipeline
    const pipeline: PipelineStage[] = [
      { $match: query }
    ]
    
    // Add projection if specified
    if (Object.keys(projection).length > 0) {
      pipeline.push({ $project: projection })
    }
    
    // Add sorting
    pipeline.push({ $sort: { createdAt: -1 as const } })
    
    // Add pagination
    if (skip) {
      pipeline.push({ $skip: parseInt(skip) })
    }
    if (limit) {
      pipeline.push({ $limit: parseInt(limit) })
    }
    
    // Execute aggregation
    const stores = await Store.aggregate(pipeline)
    
    // Get total count for pagination
    const totalCount = await Store.countDocuments(query)
    
    return NextResponse.json({
      success: true,
      data: stores,
      count: stores.length,
      totalCount,
      query: query
    })
  } catch (error: unknown) {
    console.error('Error fetching stores from database:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch stores' 
      },
      { status: 500 }
    )
  }
}

