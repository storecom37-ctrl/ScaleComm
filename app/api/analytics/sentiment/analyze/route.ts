import { NextRequest, NextResponse } from 'next/server'
import { sentimentWorkflow } from '@/lib/services/sentiment-workflow'
import connectToDatabase from '@/lib/database/connection'
import { Review } from '@/lib/database/separate-models'
import mongoose from 'mongoose'

// In-memory progress tracking
const analysisProgress = new Map<string, {
  status: 'pending' | 'running' | 'completed' | 'error'
  progress: number
  total: number
  processed: number
  remaining: number
  message: string
  startTime: number
  endTime?: number
}>()

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase()
    
    const { brandId, storeId, days = 30, force = false } = await request.json()
    
    if (!brandId && !storeId) {
      return NextResponse.json({
        success: false,
        error: 'Either brandId or storeId is required'
      }, { status: 400 })
    }

    const entityId = brandId || storeId
    const entityType = brandId ? 'brand' : 'store'
    const progressKey = `${entityType}:${entityId}:${days}d`
    
    // Initialize progress tracking
    analysisProgress.set(progressKey, {
      status: 'pending',
      progress: 0,
      total: 0,
      processed: 0,
      remaining: 0,
      message: 'Initializing analysis...',
      startTime: Date.now()
    })

    // Start analysis in background
    analyzeInBackground(entityId, entityType, days, force, progressKey)
    
    return NextResponse.json({
      success: true,
      message: 'Analysis started',
      progressKey,
      data: {
        entityId,
        entityType,
        days,
        force
      }
    })

  } catch (error: any) {
    console.error('Sentiment analysis start error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to start sentiment analysis',
      details: error.message
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const progressKey = searchParams.get('progressKey')
    
    if (!progressKey) {
      return NextResponse.json({
        success: false,
        error: 'Progress key is required'
      }, { status: 400 })
    }

    const progress = analysisProgress.get(progressKey)
    
    if (!progress) {
      return NextResponse.json({
        success: false,
        error: 'Progress not found'
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: progress
    })

  } catch (error: any) {
    console.error('Progress tracking error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to get progress',
      details: error.message
    }, { status: 500 })
  }
}

async function analyzeInBackground(
  entityId: string, 
  entityType: 'brand' | 'store', 
  days: number, 
  force: boolean,
  progressKey: string
) {
  try {
    // Update progress
    analysisProgress.set(progressKey, {
      status: 'running',
      progress: 10,
      total: 0,
      processed: 0,
      remaining: 0,
      message: 'Fetching reviews...',
      startTime: Date.now()
    })

    // Get total reviews count
    const endDate = new Date()
    const startDate = new Date(endDate.getTime() - (days * 24 * 60 * 60 * 1000))
    
    const totalReviews = await Review.countDocuments({
      [entityType === 'brand' ? 'brandId' : 'storeId']: new mongoose.Types.ObjectId(entityId),
      status: 'active',
      comment: { $exists: true, $nin: [null, ''] },
      gmbCreateTime: { $gte: startDate, $lte: endDate }
    })

    const reviewsNeedingAnalysis = await Review.countDocuments({
      [entityType === 'brand' ? 'brandId' : 'storeId']: new mongoose.Types.ObjectId(entityId),
      status: 'active',
      comment: { $exists: true, $nin: [null, ''] },
      gmbCreateTime: { $gte: startDate, $lte: endDate },
      'sentimentAnalysis.sentiment': { $exists: false }
    })

    // Update progress with counts
    analysisProgress.set(progressKey, {
      status: 'running',
      progress: 20,
      total: reviewsNeedingAnalysis,
      processed: 0,
      remaining: reviewsNeedingAnalysis,
      message: `Found ${totalReviews} total reviews, ${reviewsNeedingAnalysis} need analysis`,
      startTime: Date.now()
    })

    if (reviewsNeedingAnalysis === 0) {
      analysisProgress.set(progressKey, {
        status: 'completed',
        progress: 100,
        total: totalReviews,
        processed: totalReviews,
        remaining: 0,
        message: 'All reviews already analyzed',
        startTime: Date.now(),
        endTime: Date.now()
      })
      return
    }

    // Start analysis
    const analytics = await sentimentWorkflow.analyzeAndSave(entityId, entityType, days)
    
    // Update final progress
    analysisProgress.set(progressKey, {
      status: 'completed',
      progress: 100,
      total: totalReviews,
      processed: reviewsNeedingAnalysis,
      remaining: 0,
      message: `Analysis completed. Processed ${reviewsNeedingAnalysis} reviews.`,
      startTime: Date.now(),
      endTime: Date.now()
    })

    // Clean up progress after 1 hour
    setTimeout(() => {
      analysisProgress.delete(progressKey)
    }, 60 * 60 * 1000)

  } catch (error: any) {
    console.error('Background analysis error:', error)
    analysisProgress.set(progressKey, {
      status: 'error',
      progress: 0,
      total: 0,
      processed: 0,
      remaining: 0,
      message: `Analysis failed: ${error.message}`,
      startTime: Date.now(),
      endTime: Date.now()
    })
  }
}
