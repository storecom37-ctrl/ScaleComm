import { NextRequest, NextResponse } from 'next/server'
import connectToDatabase from '@/lib/database/connection'
import { Store } from '@/lib/database/models'
import { Review } from '@/lib/database/separate-models'
import { getSession } from '@/lib/utils/session'
import mongoose from 'mongoose'

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase()
    
    const session = await getSession()
    if (!session) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const brandId = searchParams.get('brandId')
    const days = parseInt(searchParams.get('days') || '30')
    
    if (!brandId) {
      return NextResponse.json({
        success: false,
        error: 'Brand ID is required'
      }, { status: 400 })
    }

    // Get stores for the brand
    const stores = await Store.find({ brandId: new mongoose.Types.ObjectId(brandId) })
      .select('_id name address city state')
      .sort({ name: 1 })

    // Get sentiment analysis summary for each store
    const endDate = new Date()
    const startDate = new Date(endDate.getTime() - (days * 24 * 60 * 60 * 1000))

    const storeSummaries = await Promise.all(
      stores.map(async (store) => {
        // Get total reviews for this store
        const totalReviews = await Review.countDocuments({
          storeId: store._id,
          status: 'active',
          comment: { $exists: true, $nin: [null, ''] },
          gmbCreateTime: { $gte: startDate, $lte: endDate }
        })

        // Get analyzed reviews count
        const analyzedReviews = await Review.countDocuments({
          storeId: store._id,
          status: 'active',
          comment: { $exists: true, $nin: [null, ''] },
          gmbCreateTime: { $gte: startDate, $lte: endDate },
          'sentimentAnalysis.sentiment': { $exists: true }
        })

        // Get sentiment distribution
        const sentimentDistribution = await Review.aggregate([
          {
            $match: {
              storeId: store._id,
              status: 'active',
              comment: { $exists: true, $nin: [null, ''] },
              gmbCreateTime: { $gte: startDate, $lte: endDate },
              'sentimentAnalysis.sentiment': { $exists: true }
            }
          },
          {
            $group: {
              _id: '$sentimentAnalysis.sentiment',
              count: { $sum: 1 }
            }
          }
        ])

        const sentiment = sentimentDistribution.reduce((acc, item) => {
          acc[item._id] = item.count
          return acc
        }, { positive: 0, negative: 0, neutral: 0 })

        return {
          storeId: store._id,
          name: store.name,
          address: store.address,
          city: store.city,
          state: store.state,
          totalReviews,
          analyzedReviews,
          remainingReviews: totalReviews - analyzedReviews,
          analysisProgress: totalReviews > 0 ? Math.round((analyzedReviews / totalReviews) * 100) : 0,
          sentiment,
          lastAnalyzed: analyzedReviews > 0 ? new Date() : null // TODO: Get actual last analyzed date
        }
      })
    )

    return NextResponse.json({
      success: true,
      data: {
        stores: storeSummaries,
        summary: {
          totalStores: stores.length,
          totalReviews: storeSummaries.reduce((sum, store) => sum + store.totalReviews, 0),
          analyzedReviews: storeSummaries.reduce((sum, store) => sum + store.analyzedReviews, 0),
          averageProgress: storeSummaries.length > 0 
            ? Math.round(storeSummaries.reduce((sum, store) => sum + store.analysisProgress, 0) / storeSummaries.length)
            : 0
        }
      }
    })

  } catch (error: any) {
    console.error('Store sentiment analysis error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to get store sentiment analysis',
      details: error.message
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase()
    
    const session = await getSession()
    if (!session) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 })
    }

    const { storeIds, brandId, days = 30, force = false } = await request.json()
    
    if (!storeIds || !Array.isArray(storeIds) || storeIds.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Store IDs array is required'
      }, { status: 400 })
    }

    // Start analysis for each store
    const results = []
    
    for (const storeId of storeIds) {
      try {
        const { sentimentWorkflow } = await import('@/lib/services/sentiment-workflow')
        
        const needsAnalysis = force || await sentimentWorkflow.needsAnalysis(storeId, 'store')
        
        if (needsAnalysis) {
          const analytics = await sentimentWorkflow.analyzeAndSave(storeId, 'store', days)
          results.push({
            storeId,
            success: true,
            analytics
          })
        } else {
          const analytics = await sentimentWorkflow.getAnalytics(storeId, 'store')
          results.push({
            storeId,
            success: true,
            analytics,
            cached: true
          })
        }
      } catch (error: any) {
        console.error(`Error analyzing store ${storeId}:`, error)
        results.push({
          storeId,
          success: false,
          error: error.message
        })
      }
    }
    
    return NextResponse.json({
      success: true,
      data: results
    })

  } catch (error: any) {
    console.error('Store sentiment analysis batch error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to analyze store sentiment',
      details: error.message
    }, { status: 500 })
  }
}
