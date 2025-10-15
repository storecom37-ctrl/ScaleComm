import { NextRequest, NextResponse } from 'next/server'
import { Review } from '@/lib/database/separate-models'
import { Store, Brand } from '@/lib/database/models'
import connectToDatabase from '@/lib/database/connection'
import { getGmbTokensFromRequest, getAllBrandAccountIds } from '@/lib/utils/auth-helpers'
import mongoose from 'mongoose'

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase()
    
    const { searchParams } = new URL(request.url)
    const storeId = searchParams.get('storeId')
    const brandId = searchParams.get('brandId')
    const accountId = searchParams.get('accountId')
    const limit = parseInt(searchParams.get('limit') || '50')
    const skip = parseInt(searchParams.get('skip') || '0')
    const status = searchParams.get('status') || 'active'
    const hasResponse = searchParams.get('hasResponse') // Filter by replied/unresponded
    const rating = searchParams.get('rating') // Filter by star rating
    const search = searchParams.get('search') // Search in comments and reviewer names
    
    // Get tokens from request to filter by accessible GMB accounts
    const tokens = await getGmbTokensFromRequest()
    let accessibleAccountIds: string[] = []
    
    if (tokens) {
      // Get all account IDs that the current user has access to
      accessibleAccountIds = await getAllBrandAccountIds()
      console.log('🔍 Reviews API - Accessible GMB Account IDs for current user:', accessibleAccountIds)
    }
    
    // Build query
    const query: Record<string, unknown> = { status }
    
    // Convert storeId to ObjectId if provided (storeId is a reference field)
    if (storeId) {
      try {
        query.storeId = new mongoose.Types.ObjectId(storeId)
        console.log('🔍 Reviews API - Filtering by store ID:', storeId)
      } catch (error) {
        console.error('Invalid store ID format:', storeId)
        return NextResponse.json({
          success: false,
          error: 'Invalid store ID format'
        }, { status: 400 })
      }
    }
    
    // Convert brandId to ObjectId if provided (brandId is a reference field)
    if (brandId) {
      try {
        query.brandId = new mongoose.Types.ObjectId(brandId)
        console.log('🔍 Reviews API - Filtering by brand ID:', brandId)
      } catch (error) {
        console.error('Invalid brand ID format:', brandId)
        return NextResponse.json({
          success: false,
          error: 'Invalid brand ID format'
        }, { status: 400 })
      }
    }
    
    // Filter by response status (replied/unresponded)
    if (hasResponse === 'true') {
      query.hasResponse = true
      console.log('🔍 Reviews API - Filtering by replied reviews')
    } else if (hasResponse === 'false') {
      query.hasResponse = false
      console.log('🔍 Reviews API - Filtering by unresponded reviews')
    }
    
    // Filter by star rating
    if (rating) {
      const ratingNum = parseInt(rating)
      if (ratingNum >= 1 && ratingNum <= 5) {
        query.starRating = ratingNum
        console.log('🔍 Reviews API - Filtering by rating:', ratingNum)
      }
    }
    
    // Search in comments and reviewer names
    if (search && search.trim()) {
      query.$or = [
        { comment: { $regex: search, $options: 'i' } },
        { 'reviewer.displayName': { $regex: search, $options: 'i' } }
      ]
      console.log('🔍 Reviews API - Searching for:', search)
    }
    
    // Show all reviews from accessible GMB accounts (remove account-specific filtering)
    if (accessibleAccountIds.length > 0) {
      // Show all reviews from all accessible GMB accounts
      query.accountId = { $in: accessibleAccountIds }
      console.log('🔍 Reviews API - Showing all reviews from accessible account IDs:', accessibleAccountIds)
    } else {
      // If no GMB authentication, show no reviews (user needs to connect GMB first)
      query.accountId = 'no-access'
      console.log('🔍 Reviews API - No GMB authentication - showing no reviews')
    }
    
    // Execute query with population
    const reviews = await Review.find(query)
      .populate('storeId', 'name address city')
      .populate('brandId', 'name slug')
      .sort({ gmbCreateTime: -1 })
      .limit(limit)
      .skip(skip)
      .lean()
    
    // Get total count
    const totalCount = await Review.countDocuments(query)
    
    // Calculate pagination
    const pagination = {
      page: Math.floor(skip / limit) + 1,
      limit,
      total: totalCount,
      pages: Math.ceil(totalCount / limit)
    }
    
    // Calculate statistics from all reviews matching the query (not just current page)
    const statsQuery = { ...query }
    const allMatchingReviews = await Review.find(statsQuery)
      .select('starRating gmbCreateTime')
      .lean()
    
    // Calculate average rating
    const totalRating = allMatchingReviews.reduce((sum, review) => sum + (review.starRating || 0), 0)
    const averageRating = allMatchingReviews.length > 0 
      ? totalRating / allMatchingReviews.length 
      : 0
    
    // Calculate this month's reviews
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()
    const thisMonthReviews = allMatchingReviews.filter(review => {
      const reviewDate = new Date(review.gmbCreateTime)
      return reviewDate.getMonth() === currentMonth && reviewDate.getFullYear() === currentYear
    }).length
    
    // Calculate last month's reviews for comparison
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear
    const lastMonthReviews = allMatchingReviews.filter(review => {
      const reviewDate = new Date(review.gmbCreateTime)
      return reviewDate.getMonth() === lastMonth && reviewDate.getFullYear() === lastMonthYear
    }).length
    
    // Calculate rating distribution
    const ratingDistribution = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0
    }
    allMatchingReviews.forEach(review => {
      const rating = review.starRating
      if (rating >= 1 && rating <= 5) {
        ratingDistribution[rating as keyof typeof ratingDistribution]++
      }
    })
    
    const metadata = {
      statistics: {
        averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal place
        thisMonthReviews,
        lastMonthReviews,
        totalReviews: allMatchingReviews.length,
        ratingDistribution
      }
    }
    
    return NextResponse.json({
      success: true,
      data: reviews,
      count: reviews.length,
      totalCount,
      pagination,
      metadata
    })
    
  } catch (error) {
    console.error('Error fetching reviews:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch reviews',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase()
    
    const body = await request.json()
    
    // Validate required fields
    const { gmbReviewId, storeId, brandId, accountId, reviewer, starRating, gmbCreateTime } = body
    
    if (!gmbReviewId || !storeId || !brandId || !accountId || !reviewer?.displayName || !starRating || !gmbCreateTime) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields'
      }, { status: 400 })
    }
    
    // Check if review already exists
    const existingReview = await Review.findOne({ gmbReviewId })
    if (existingReview) {
      return NextResponse.json({
        success: false,
        error: 'Review already exists'
      }, { status: 409 })
    }
    
    // Create new review
    const review = new Review(body)
    await review.save()
    
    // Populate references
    await review.populate('storeId', 'name address city')
    await review.populate('brandId', 'name slug')
    
    return NextResponse.json({
      success: true,
      data: review
    }, { status: 201 })
    
  } catch (error) {
    console.error('Error creating review:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to create review',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
