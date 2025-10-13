import { NextRequest, NextResponse } from 'next/server'
import { sentimentWorkflow } from '@/lib/services/sentiment-workflow'
import connectToDatabase from '@/lib/database/connection'

// Simple in-memory cache for API responses
const responseCache = new Map<string, { data: any; timestamp: number }>()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase()
    
    const { searchParams } = new URL(request.url)
    const storeId = searchParams.get('storeId')
    const brandId = searchParams.get('brandId')
    const type = searchParams.get('type') || 'brand' // 'store' or 'brand'
    const force = searchParams.get('force') === 'true' // Force re-analysis
    const days = parseInt(searchParams.get('days') || '30') // Analysis period in days (default 30)
    const showProgress = searchParams.get('showProgress') === 'true' // Show analysis progress
    
    // Add timeout for the entire operation (2 minutes)
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Analysis timeout - operation took too long')), 120000) // 2 minutes
    })
    
    const analysisPromise = (async (): Promise<NextResponse> => {
      if (!storeId && !brandId) {
        return NextResponse.json({
          success: false,
          error: 'Either storeId or brandId is required'
        }, { status: 400 })
      }

      const entityId = storeId || brandId
      const entityType = type as 'store' | 'brand'
      const cacheKey = `${entityType}:${entityId}:${days}d`
      
      // Add account-specific cache key to prevent cross-contamination
      const accountSpecificCacheKey = `${cacheKey}:${Date.now().toString().slice(0, 8)}`

      // Check cache first (unless force refresh)
      if (!force) {
        const cached = responseCache.get(cacheKey)
        if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
          console.log(`📊 Using cached API response for ${entityType}: ${entityId}`)
          return NextResponse.json({
            success: true,
            data: cached.data,
            cached: true
          })
        }
      }

      // Check if analysis is needed
      const needsAnalysis = force || await sentimentWorkflow.needsAnalysis(entityId!, entityType)
      
      let analytics
      
        if (needsAnalysis) {
          console.log(`🔄 Analyzing sentiment for ${entityType}: ${entityId} (${days} days)`)
          analytics = await sentimentWorkflow.analyzeAndSave(entityId!, entityType, days)
        } else {
          console.log(`📊 Using cached sentiment analytics for ${entityType}: ${entityId}`)
          analytics = await sentimentWorkflow.getAnalytics(entityId!, entityType)
          
          if (!analytics) {
            // Fallback to analysis if no cached data found
            analytics = await sentimentWorkflow.analyzeAndSave(entityId!, entityType, days)
          }
        }
      
      // Cache the response
      responseCache.set(cacheKey, {
        data: analytics,
        timestamp: Date.now()
      })
      
      // Clean old cache entries
      if (responseCache.size > 100) {
        const now = Date.now()
        for (const [key, value] of responseCache.entries()) {
          if (now - value.timestamp > CACHE_DURATION) {
            responseCache.delete(key)
          }
        }
      }
      
      return NextResponse.json({
        success: true,
        data: analytics,
        cached: false,
        analysisInfo: {
          entityId,
          entityType,
          days,
          processed: analytics.processingStats?.processedInThisRun || 0,
          remaining: analytics.processingStats?.remainingToProcess || 0,
          total: (analytics.processingStats?.processedInThisRun || 0) + (analytics.processingStats?.remainingToProcess || 0)
        }
      })
    })()
    
    // Race between analysis and timeout
    try {
      return await Promise.race([analysisPromise, timeoutPromise])
    } catch (error) {
      // Handle timeout or other errors
      return NextResponse.json({
        success: false,
        error: 'Analysis timed out or failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 })
    }

  } catch (error: any) {
    console.error('Sentiment analytics error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to analyze sentiment',
      details: error.message
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase()
    
    const { storeIds, brandIds, force = false } = await request.json()
    
    if (!storeIds && !brandIds) {
      return NextResponse.json({
        success: false,
        error: 'Either storeIds or brandIds array is required'
      }, { status: 400 })
    }

    const results = []
    
    if (storeIds && storeIds.length > 0) {
      for (const storeId of storeIds) {
        try {
          const needsAnalysis = force || await sentimentWorkflow.needsAnalysis(storeId, 'store')
          
          if (needsAnalysis) {
            const analytics = await sentimentWorkflow.analyzeAndSave(storeId, 'store')
            results.push(analytics)
          } else {
            const analytics = await sentimentWorkflow.getAnalytics(storeId, 'store')
            if (analytics) results.push(analytics)
          }
        } catch (error) {
          console.error(`Error analyzing store ${storeId}:`, error)
        }
      }
    } else if (brandIds && brandIds.length > 0) {
      for (const brandId of brandIds) {
        try {
          const needsAnalysis = force || await sentimentWorkflow.needsAnalysis(brandId, 'brand')
          
          if (needsAnalysis) {
            const analytics = await sentimentWorkflow.analyzeAndSave(brandId, 'brand')
            results.push(analytics)
          } else {
            const analytics = await sentimentWorkflow.getAnalytics(brandId, 'brand')
            if (analytics) results.push(analytics)
          }
        } catch (error) {
          console.error(`Error analyzing brand ${brandId}:`, error)
        }
      }
    }
    
    return NextResponse.json({
      success: true,
      data: results
    })

  } catch (error: any) {
    console.error('Batch sentiment analytics error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to analyze sentiment batch',
      details: error.message
    }, { status: 500 })
  }
}
