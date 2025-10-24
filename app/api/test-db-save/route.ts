import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/database/connection'
import { Review, Post, Performance, SearchKeyword } from '@/lib/database/models'

export async function POST(request: NextRequest) {
  try {
    await connectDB()
    
    const testData = await request.json()
    const { dataType, data, locationId, brandId, accountId } = testData
    
    
    
    let result
    const timestamp = new Date()
    
    switch (dataType) {
      case 'reviews':
        const reviewOperations = data.map((review: any) => ({
          updateOne: {
            filter: { gmbReviewId: review.id },
            update: {
              $set: {
                storeId: 'test-store-id',
                brandId: brandId,
                accountId: accountId,
                reviewer: review.reviewer,
                starRating: review.starRating,
                comment: review.comment,
                gmbCreateTime: new Date(review.createTime),
                gmbUpdateTime: new Date(review.updateTime),
                source: 'gmb',
                status: 'active'
              }
            },
            upsert: true
          }
        }))
        result = await Review.bulkWrite(reviewOperations)
        break
        
      case 'posts':
        const postOperations = data.map((post: any) => ({
          updateOne: {
            filter: { gmbPostId: post.id },
            update: {
              $set: {
                storeId: 'test-store-id',
                brandId: brandId,
                accountId: accountId,
                summary: post.summary,
                callToAction: post.callToAction,
                media: post.media,
                gmbCreateTime: new Date(post.createTime),
                gmbUpdateTime: new Date(post.updateTime),
                languageCode: post.languageCode,
                state: post.state,
                topicType: post.topicType,
                event: post.event,
                searchUrl: post.searchUrl,
                source: 'gmb',
                status: 'active'
              }
            },
            upsert: true
          }
        }))
        result = await Post.bulkWrite(postOperations)
        break
        
      case 'insights':
        const insightOperations = data.map((insight: any) => ({
          updateOne: {
            filter: {
              storeId: 'test-store-id',
              'period.startTime': new Date(insight.period.startTime),
              'period.endTime': new Date(insight.period.endTime)
            },
            update: {
              $set: {
                brandId: brandId,
                accountId: accountId,
                period: insight.period,
                queries: insight.queries,
                views: insight.views,
                actions: insight.actions,
                photoViews: insight.photoViews,
                callClicks: insight.callClicks,
                websiteClicks: insight.websiteClicks,
                directionRequests: insight.directionRequests || 0,
                businessBookings: insight.businessBookings,
                businessFoodOrders: insight.businessFoodOrders,
                businessMessages: insight.businessMessages,
                desktopSearchImpressions: insight.desktopSearchImpressions,
                mobileMapsImpressions: insight.mobileMapsImpressions,
                dailyMetrics: insight.dailyMetrics,
                websiteClicksSeries: insight.websiteClicksSeries,
                callClicksSeries: insight.callClicksSeries,
                source: 'gmb',
                status: 'active'
              }
            },
            upsert: true
          }
        }))
        result = await Performance.bulkWrite(insightOperations)
        break
        
      case 'searchKeywords':
        const keywordOperations = data.map((keyword: any) => ({
          updateOne: {
            filter: {
              storeId: 'test-store-id',
              keyword: keyword.keyword,
              'period.year': keyword.period.year,
              'period.month': keyword.period.month
            },
            update: {
              $set: {
                brandId: brandId,
                accountId: accountId,
                impressions: keyword.impressions,
                clicks: keyword.clicks,
                ctr: keyword.ctr,
                position: keyword.position,
                source: 'gmb',
                status: 'active'
              }
            },
            upsert: true
          }
        }))
        result = await SearchKeyword.bulkWrite(keywordOperations)
        break
        
      default:
        throw new Error(`Unknown data type: ${dataType}`)
    }
    
   
    
    return NextResponse.json({
      success: true,
      dataType,
      result: {
        inserted: result.insertedCount,
        modified: result.modifiedCount,
        upserted: result.upsertedCount,
        matched: result.matchedCount
      },
      timestamp
    })
    
  } catch (error) {
    console.error('Database save test failed:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      },
      { status: 500 }
    )
  }
}




