import { NextRequest, NextResponse } from 'next/server'
import { sentimentAnalyzer } from '@/lib/services/sentiment-analyzer'
import { Review } from '@/lib/database/separate-models'
import connectToDatabase from '@/lib/database/connection'
import mongoose from 'mongoose'

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase()
    
    const { reviewIds, batchSize = 10 } = await request.json()
    
    if (!reviewIds || !Array.isArray(reviewIds)) {
      return NextResponse.json({
        success: false,
        error: 'Review IDs array is required'
      }, { status: 400 })
    }

    // Get reviews from database
    const reviews = await Review.find({
      _id: { $in: reviewIds.map(id => new mongoose.Types.ObjectId(id)) }
    }).select('_id comment starRating')

    if (reviews.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No reviews found'
      }, { status: 404 })
    }

    // Extract comments for analysis
    const comments = reviews.map(review => review.comment || '')
    
    // Perform sentiment analysis
    const sentimentResults = await sentimentAnalyzer.analyzeBatch(comments)
    
    // Get statistics
    const stats = sentimentAnalyzer.getSentimentStats(sentimentResults)
    
    // Update reviews with sentiment analysis results
    const updatePromises = reviews.map(async (review, index) => {
      const sentimentResult = sentimentResults[index]
      
      return Review.findByIdAndUpdate(
        review._id,
        {
          $set: {
            sentimentAnalysis: {
              sentiment: sentimentResult.sentiment,
              confidence: sentimentResult.confidence,
              score: sentimentResult.score,
              method: sentimentResult.method,
              reasoning: sentimentResult.reasoning,
              analyzedAt: new Date()
            }
          }
        },
        { new: true }
      )
    })

    const updatedReviews = await Promise.all(updatePromises)
    
    return NextResponse.json({
      success: true,
      data: {
        reviews: updatedReviews,
        statistics: stats,
        analyzedCount: sentimentResults.length
      }
    })

  } catch (error: any) {
    console.error('Sentiment analysis error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to analyze sentiment',
      details: error.message
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase()
    
    const { searchParams } = new URL(request.url)
    const reviewId = searchParams.get('reviewId')
    
    if (!reviewId) {
      return NextResponse.json({
        success: false,
        error: 'Review ID is required'
      }, { status: 400 })
    }

    // Get single review
    const review = await Review.findById(reviewId).select('_id comment starRating sentimentAnalysis')
    
    if (!review) {
      return NextResponse.json({
        success: false,
        error: 'Review not found'
      }, { status: 404 })
    }

    // If sentiment analysis already exists and is recent (within 24 hours), return it
    if (review.sentimentAnalysis && 
        review.sentimentAnalysis.analyzedAt && 
        (Date.now() - new Date(review.sentimentAnalysis.analyzedAt).getTime()) < 24 * 60 * 60 * 1000) {
      return NextResponse.json({
        success: true,
        data: {
          review,
          sentiment: review.sentimentAnalysis
        }
      })
    }

    // Perform new sentiment analysis
    const sentimentResult = await sentimentAnalyzer.analyzeSentiment(review.comment || '')
    
    // Update review with sentiment analysis
    const updatedReview = await Review.findByIdAndUpdate(
      reviewId,
      {
        $set: {
          sentimentAnalysis: {
            sentiment: sentimentResult.sentiment,
            confidence: sentimentResult.confidence,
            score: sentimentResult.score,
            method: sentimentResult.method,
            reasoning: sentimentResult.reasoning,
            analyzedAt: new Date()
          }
        }
      },
      { new: true }
    )

    return NextResponse.json({
      success: true,
      data: {
        review: updatedReview,
        sentiment: sentimentResult
      }
    })

  } catch (error: any) {
    console.error('Sentiment analysis error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to analyze sentiment',
      details: error.message
    }, { status: 500 })
  }
}
