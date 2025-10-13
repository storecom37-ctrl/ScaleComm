import { NextRequest, NextResponse } from 'next/server'
import { GmbApiServerService } from '@/lib/server/gmb-api-server'
import { getGmbTokensFromRequest } from '@/lib/utils/auth-helpers'
import { Review } from '@/lib/database/separate-models'
import { Store, Brand } from '@/lib/database/models'
import connectDB from '@/lib/database/connection'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB()
    
    const { id: reviewMongoId } = await params
    const body = await request.json()
    const { comment } = body
    
    if (!comment || comment.trim().length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Reply comment is required'
      }, { status: 400 })
    }

    // Get GMB tokens from request
    const tokens = await getGmbTokensFromRequest()
    if (!tokens) {
      return NextResponse.json({
        success: false,
        error: 'GMB authentication required'
      }, { status: 401 })
    }

    // Find the review in database and populate store information
    const review = await Review.findById(reviewMongoId).populate('storeId')
    if (!review) {
      return NextResponse.json({
        success: false,
        error: 'Review not found'
      }, { status: 404 })
    }

    // Get the store to access gmbLocationId and accountId
    const store = await Store.findById(review.storeId)
    if (!store || !store.gmbLocationId) {
      return NextResponse.json({
        success: false,
        error: 'Store or GMB location ID not found'
      }, { status: 404 })
    }

    // Get the brand to access accountId if not available in review
    const brand = await Brand.findById(review.brandId)
    if (!brand) {
      return NextResponse.json({
        success: false,
        error: 'Brand not found'
      }, { status: 404 })
    }

    // Determine the account ID - try multiple sources
    let accountId = review.accountId || store.gmbAccountId || brand.settings?.gmbIntegration?.gmbAccountId
    
    // Validate required fields
    if (!accountId || accountId.trim() === '') {
      return NextResponse.json({
        success: false,
        error: 'GMB Account ID not found'
      }, { status: 400 })
    }
    
    if (!review.gmbReviewId || review.gmbReviewId.trim() === '') {
      return NextResponse.json({
        success: false,
        error: 'Review GMB ID not found'
      }, { status: 400 })
    }
    
    if (!store.gmbLocationId || store.gmbLocationId.trim() === '') {
      return NextResponse.json({
        success: false,
        error: 'Store GMB location ID not found'
      }, { status: 400 })
    }

    // Extract ID parts from full GMB paths
    // gmbReviewId format: accounts/{accountId}/locations/{locationId}/reviews/{reviewId}
    // gmbLocationId format: accounts/{accountId}/locations/{locationId}
    
    let locationId: string
    let reviewId: string
    
    if (store.gmbLocationId.includes('/')) {
      // Extract location ID from full path
      const locationParts = store.gmbLocationId.split('/')
      locationId = locationParts[locationParts.length - 1] // Get last part
    } else {
      locationId = store.gmbLocationId
    }
    
    if (review.gmbReviewId.includes('/')) {
      // Extract review ID from full path
      const reviewParts = review.gmbReviewId.split('/')
      reviewId = reviewParts[reviewParts.length - 1] // Get last part
    } else {
      reviewId = review.gmbReviewId
    }

    // Construct GMB review name from extracted IDs
    // Format: accounts/{accountId}/locations/{locationId}/reviews/{reviewId}
    const reviewName = `accounts/${accountId}/locations/${locationId}/reviews/${reviewId}`

    // Initialize GMB API service with tokens
    const gmbService = new GmbApiServerService(tokens)

    // Reply to the review via GMB API
    const replySuccess = await gmbService.replyToReview(reviewName, comment)
    
    if (!replySuccess) {
      return NextResponse.json({
        success: false,
        error: 'Failed to post reply to GMB'
      }, { status: 500 })
    }

    // Update the review in database to mark as responded
    const updatedReview = await Review.findByIdAndUpdate(reviewMongoId, {
      hasResponse: true,
      response: {
        comment: comment,
        responseTime: new Date(),
        respondedBy: 'gmb-api'
      },
      updatedAt: new Date()
    }, { new: true })


    return NextResponse.json({
      success: true,
      message: 'Reply posted successfully',
      data: {
        reviewId: reviewMongoId,
        comment: comment,
        responseTime: new Date()
      }
    })

  } catch (error) {
    console.error('Error replying to review:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to reply to review',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
