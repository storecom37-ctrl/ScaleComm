import { NextRequest, NextResponse } from 'next/server'
import { Post } from '@/lib/database/separate-models'
import { Store, Brand } from '@/lib/database/models'
import { connectToDatabase } from '@/lib/database/connection'

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase()
    
    const { searchParams } = new URL(request.url)
    const storeId = searchParams.get('storeId')
    const brandId = searchParams.get('brandId')
    const accountId = searchParams.get('accountId')
    const topicType = searchParams.get('topicType')
    const state = searchParams.get('state')
    const limit = parseInt(searchParams.get('limit') || '50')
    const skip = parseInt(searchParams.get('skip') || '0')
    const status = searchParams.get('status') || 'active'
    
    // Build query
    const query: Record<string, unknown> = { status }
    
    if (storeId) query.storeId = storeId
    if (brandId) query.brandId = brandId
    if (accountId) query.accountId = accountId
    if (topicType) query.topicType = topicType
    if (state) query.state = state
    
    // Execute query with population
    const posts = await Post.find(query)
      .populate('storeId', 'name address city')
      .populate('brandId', 'name slug')
      .sort({ gmbCreateTime: -1 })
      .limit(limit)
      .skip(skip)
      .lean()
    
    // Get total count
    const totalCount = await Post.countDocuments(query)
    
    // Calculate pagination
    const pagination = {
      page: Math.floor(skip / limit) + 1,
      limit,
      total: totalCount,
      pages: Math.ceil(totalCount / limit)
    }
    
    return NextResponse.json({
      success: true,
      data: posts,
      count: posts.length,
      totalCount,
      pagination
    })
    
  } catch (error) {
    console.error('Error fetching posts:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch posts',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase()
    
    const body = await request.json()
    
    // Validate required fields
    const { gmbPostId, storeId, brandId, accountId, gmbCreateTime } = body
    
    if (!gmbPostId || !storeId || !brandId || !accountId || !gmbCreateTime) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields'
      }, { status: 400 })
    }
    
    // Check if post already exists
    const existingPost = await Post.findOne({ gmbPostId })
    if (existingPost) {
      return NextResponse.json({
        success: false,
        error: 'Post already exists'
      }, { status: 409 })
    }
    
    // Create new post
    const post = new Post(body)
    await post.save()
    
    // Populate references
    await post.populate('storeId', 'name address city')
    await post.populate('brandId', 'name slug')
    
    return NextResponse.json({
      success: true,
      data: post
    }, { status: 201 })
    
  } catch (error) {
    console.error('Error creating post:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to create post',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
