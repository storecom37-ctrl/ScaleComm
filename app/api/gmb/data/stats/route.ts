import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/database/connection'
import { Brand, Store } from '@/lib/database/models'

export async function GET(request: NextRequest) {
  try {
    await connectDB()
    
    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get('accountId')
    const locationId = searchParams.get('locationId')
    
    // Build queries for GMB-connected data
    const brandQuery = { 'settings.gmbIntegration.connected': true }
    const storeQuery: Record<string, any> = { gmbLocationId: { $exists: true, $ne: null } }
    
    // Add location-specific filtering if provided
    if (locationId) {
      storeQuery.gmbLocationId = locationId
    }
    
    // Get basic counts
    const [
      brandCount,
      storeCount
    ] = await Promise.all([
      Brand.countDocuments(brandQuery),
      Store.countDocuments(storeQuery)
    ])
    
    // Get all reviews from stores with GMB integration
    const storesWithReviews = await Store.find({
      ...storeQuery,
      reviews: { $exists: true, $ne: [] }
    }).select('reviews')
    
    // Aggregate review data
    let totalReviews = 0
    let totalRating = 0
    let reviewCount = 0
    let recentReviews = 0
    const reviewDistribution: Record<string, number> = { '1Star': 0, '2Star': 0, '3Star': 0, '4Star': 0, '5Star': 0 }
    
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    
    storesWithReviews.forEach(store => {
      const storeData = store as any
      if (storeData.reviews && Array.isArray(storeData.reviews)) {
        storeData.reviews.forEach((review: any) => {
          totalReviews++
          totalRating += review.starRating || 0
          reviewCount++
          
          // Count by rating
          const rating = review.starRating || 0
          if (rating >= 1 && rating <= 5) {
            reviewDistribution[`${rating}Star`]++
          }
          
          // Count recent reviews
          const reviewDate = new Date(review.createTime || review.updateTime)
          if (reviewDate >= sevenDaysAgo) {
            recentReviews++
          }
        })
      }
    })
    
    // Get all posts from stores with GMB integration
    const storesWithPosts = await Store.find({
      ...storeQuery,
      posts: { $exists: true, $ne: [] }
    }).select('posts')
    
    let totalPosts = 0
    let recentPosts = 0
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    
    storesWithPosts.forEach(store => {
      const storeData = store as any
      if (storeData.posts && Array.isArray(storeData.posts)) {
        storeData.posts.forEach((post: any) => {
          totalPosts++
          
          // Count recent posts
          const postDate = new Date(post.createTime || post.updateTime)
          if (postDate >= thirtyDaysAgo) {
            recentPosts++
          }
        })
      }
    })
    
    const averageRating = reviewCount > 0 ? Math.round((totalRating / reviewCount) * 100) / 100 : 0
    
    return NextResponse.json({
      success: true,
      data: {
        overview: {
          totalAccounts: brandCount, // Using brands as accounts
          totalLocations: storeCount, // Using stores as locations
          totalReviews: totalReviews,
          totalPosts: totalPosts,
          averageRating: averageRating,
          recentReviews: recentReviews,
          recentPosts: recentPosts
        },
        reviewDistribution: reviewDistribution,
        monthlyTrends: [] // TODO: Implement monthly trends if needed
      }
    })
  } catch (error: unknown) {
    console.error('Error fetching stats from database:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch statistics' 
      },
      { status: 500 }
    )
  }
}
