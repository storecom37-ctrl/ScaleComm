import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/database/connection'
import { Brand, Store, Review, Post, Performance, SearchKeyword } from '@/lib/database/models'
import { PerformanceDataProcessor } from '@/lib/utils/performance-utils'

// Helper function to convert GMB star rating to numeric value
function convertStarRating(gmbStarRating: string | number): number {
  if (typeof gmbStarRating === 'number') {
    return gmbStarRating
  }
  
  const ratingMap: Record<string, number> = {
    'ONE': 1,
    'TWO': 2,
    'THREE': 3,
    'FOUR': 4,
    'FIVE': 5
  }
  
  return ratingMap[gmbStarRating] || 0
}

export async function POST(request: NextRequest) {
  try {
    // Connect to database with retry mechanism
    let dbConnected = false
    let dbRetries = 0
    const maxDbRetries = 3
    
    while (!dbConnected && dbRetries < maxDbRetries) {
      try {
        await connectDB()
        dbConnected = true
        console.log('✅ Database connected successfully')
      } catch (dbError: unknown) {
        dbRetries++
        const errorMessage = dbError instanceof Error ? dbError.message : 'Unknown error'
        console.error(`❌ Database connection attempt ${dbRetries}/${maxDbRetries} failed:`, errorMessage)
        if (dbRetries >= maxDbRetries) {
          throw new Error(`Failed to connect to database after ${maxDbRetries} attempts: ${errorMessage}`)
        }
        // Wait before retry with exponential backoff
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, dbRetries - 1)))
      }
    }
    
    const data = await request.json()

    if (!data.account || !data.account.email) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Account email is required' 
        },
        { status: 400 }
      )
    }

    // Find or create brand for this account
    let brand = await Brand.findOne({ 
      $or: [
        { email: data.account.email },
        { 'users.owner.email': data.account.email }
      ]
    })

    if (!brand) {
      // Create brand automatically if not found (for progressive sync)
      brand = new Brand({
        name: data.account.name || 'GMB Business',
        slug: (data.account.name || 'gmb-business').toLowerCase().replace(/[^a-z0-9]/g, '-'),
        email: data.account.email,
        description: 'Business connected via Google My Business',
        address: {
          line1: 'Address not available',
          locality: 'Unknown',
          city: 'Unknown',
          state: 'Unknown',
          postalCode: '00000',
          country: 'US'
        },
        users: {
          owner: {
            name: data.account.name || 'Business Owner',
            email: data.account.email,
            password: 'gmb-auto-generated', // Will be changed on first login
            role: 'owner'
          }
        },
        settings: {
          gmbIntegration: {
            connected: true,
            gmbAccountId: data.account.id,
            gmbAccountName: data.account.name,
            lastSyncAt: new Date()
          }
        }
      })
      
      await brand.save()
      console.log('✅ Auto-created brand for progressive sync:', brand.name)
    }

    // Update brand with GMB account data
    const gmbAccountData = {
      'settings.gmbIntegration.connected': true,
      'settings.gmbIntegration.gmbAccountId': data.account.id,
      'settings.gmbIntegration.gmbAccountName': data.account.name,
      'settings.gmbIntegration.lastSyncAt': new Date(),
      'settings.gmbIntegration.gmbMetadata': {
        totalLocations: data.locations?.length || 0,
        totalReviews: data.reviews?.length || 0,
        totalPosts: data.posts?.length || 0,
        totalInsights: data.insights?.length || 0,
        totalSearchKeywords: data.searchKeywords?.length || 0
      }
    }

    await Brand.findByIdAndUpdate(brand._id, gmbAccountData)
    console.log('✅ Brand GMB integration updated:', brand.name)

    // Process data based on what's available (progressive sync)
    let storesUpdated = 0
    let reviewsCount = 0
    let postsCount = 0
    let insightsCount = 0
    let searchKeywordsCount = 0

    // Handle locations if provided
    if (data.locations && Array.isArray(data.locations)) {
      for (const location of data.locations) {
        // Extract location ID from GMB location ID
        const gmbLocationId = location.id
        const locationName = location.name

        // Find existing store by GMB location ID or create new one
        let store = await Store.findOne({ 
          $or: [
            { gmbLocationId: gmbLocationId },
            { 'gmbData.locationId': gmbLocationId }
          ]
        })

        // Use atomic upsert to prevent duplicates
        const baseSlug = locationName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').trim()
        const uniqueStoreCode = `GMB-${data.account.id}-${gmbLocationId.split('/').pop()}-${Date.now()}`
        
        const storeData = {
          brandId: brand._id,
          name: locationName,
          storeCode: uniqueStoreCode,
          slug: baseSlug,
          email: data.account.email,
          phone: location.phoneNumber,
          address: {
            line1: location.address || 'Address not available',
            locality: 'Unknown',
            city: 'Unknown',
            state: 'Unknown',
            postalCode: '00000',
            countryCode: 'US'
          },
          primaryCategory: location.categories?.[0] || 'Business',
          additionalCategories: location.categories || [],
          gmbLocationId: gmbLocationId,
          status: 'active',
          // Save GMB websiteUri as microsite.gmbUrl
          microsite: {
            gmbUrl: location.websiteUrl || location.micrositeUrl || null
          }
        }

        // Use findOneAndUpdate with upsert to atomically create or update
        store = await Store.findOneAndUpdate(
          { gmbLocationId: gmbLocationId },
          storeData,
          { 
            upsert: true, 
            new: true,
            runValidators: true
          }
        )

        if (store?.isNew) {
          console.log('✅ New store created:', store.name, 'with slug:', store.slug)
        } else {
          console.log('✅ Updated existing store:', store?.name)
        }

        // Update store with GMB data
        const storeUpdateData: any = {
          name: locationName,
          phone: location.phoneNumber,
          website: location.websiteUrl,
          primaryCategory: location.categories?.[0] || store?.primaryCategory,
          additionalCategories: location.categories || store?.additionalCategories,
          gmbLocationId: gmbLocationId, // Also update the top-level field
          'gmbData.locationId': gmbLocationId,
          'gmbData.accountId': data.account.id,
          'gmbData.verified': location.verified || false,
          'gmbData.lastSyncAt': new Date(),
          // Save GMB websiteUri as microsite.gmbUrl and mapsUrl
          'microsite.gmbUrl': (location as any).websiteUri || location.websiteUrl || location.micrositeUrl || null,
          'microsite.mapsUrl': (location as any).metadata?.mapsUri || location.mapsUri, // Save Google Maps URL
          // Save mapsUri in gmbData.metadata as well
          'gmbData.metadata.mapsUri': (location as any).metadata?.mapsUri || location.mapsUri
        }

        // Add reviews
        if (data.reviews && Array.isArray(data.reviews)) {
          const locationReviews = data.reviews.filter((review: any) => review.locationId === gmbLocationId)
          if (locationReviews.length > 0) {
            storeUpdateData['gmbData.reviews'] = locationReviews.map((review: any) => ({
              id: review.id,
              reviewer: review.reviewer,
              starRating: review.starRating,
              comment: review.comment,
              createTime: new Date(review.createTime),
              updateTime: new Date(review.updateTime)
            }))
            reviewsCount += locationReviews.length
          }
        }

        // Add posts
        if (data.posts && Array.isArray(data.posts)) {
          const locationPosts = data.posts.filter((post: any) => 
            post.locationId === gmbLocationId || post.locationId.includes(gmbLocationId)
          )
          if (locationPosts.length > 0) {
            storeUpdateData['gmbData.posts'] = locationPosts.map((post: any) => ({
              id: post.id,
              summary: post.summary,
              callToAction: post.callToAction,
              media: post.media,
              createTime: new Date(post.createTime),
              updateTime: new Date(post.updateTime),
              languageCode: post.languageCode,
              state: post.state,
              topicType: post.topicType,
              event: post.event,
              searchUrl: post.searchUrl
            }))
            postsCount += locationPosts.length
          }
        }

        // Add insights
        if (data.insights && Array.isArray(data.insights)) {
          const locationInsights = data.insights.filter((insight: any) => 
            insight.locationId === gmbLocationId || insight.locationId.includes(gmbLocationId)
          )
          // Save insights even if they have zero values
          if (locationInsights.length > 0) {
            storeUpdateData['gmbData.insights'] = locationInsights.map((insight: any) => ({
              period: {
                startTime: new Date(insight.period.startTime),
                endTime: new Date(insight.period.endTime)
              },
              queries: insight.queries || 0,
              views: insight.views || 0,
              actions: insight.actions || 0,
              photoViews: insight.photoViews || 0,
              callClicks: insight.callClicks || 0,
              websiteClicks: insight.websiteClicks || 0,
              dailyMetrics: insight.dailyMetrics || [],
              websiteClicksSeries: insight.websiteClicksSeries || null,
              callClicksSeries: insight.callClicksSeries || null
            }))
            insightsCount += locationInsights.length
          }
        }

        // Add search keywords
        if (data.searchKeywords && Array.isArray(data.searchKeywords)) {
          const locationKeywords = data.searchKeywords.filter((keyword: any) => 
            keyword.locationId === gmbLocationId || keyword.locationId.includes(gmbLocationId)
          )
          if (locationKeywords.length > 0) {
            storeUpdateData['gmbData.searchKeywords'] = locationKeywords.map((keyword: any) => ({
              keyword: keyword.keyword,
              impressions: keyword.impressions,
              period: keyword.period,
              clicks: keyword.clicks || 0,
              ctr: keyword.ctr || 0,
              position: keyword.position || 0
            }))
            searchKeywordsCount += locationKeywords.length
          }
        }

        if (store) {
          try {
            await Store.findByIdAndUpdate(store._id, storeUpdateData)
            storesUpdated++
            console.log(`✅ Updated store: ${store.name}`)
          } catch (storeUpdateError: any) {
            console.error(`❌ Failed to update store ${store.name}:`, storeUpdateError.message)
            // Try to save critical fields only
            try {
              await Store.findByIdAndUpdate(store._id, {
                'gmbData.locationId': gmbLocationId,
                'gmbData.lastSyncAt': new Date()
              })
              console.log(`⚠️ Saved minimal store data for ${store.name}`)
              storesUpdated++
            } catch (minimalUpdateError: any) {
              console.error(`❌ Failed to save even minimal store data for ${store.name}:`, minimalUpdateError.message)
            }
          }
        }
      }
    }
    
    // Handle standalone data updates (for progressive sync)
    if (data.reviews && Array.isArray(data.reviews) && (!data.locations || data.locations.length === 0)) {
      // Update stores with reviews only
      for (const review of data.reviews) {
        const store = await Store.findOne({ 'gmbData.locationId': review.locationId })
        if (store) {
          const existingReviews = (store as any).gmbData?.reviews || []
          const reviewExists = existingReviews.some((r: any) => r.id === review.id)
          
          if (!reviewExists) {
            await Store.findByIdAndUpdate(store._id, {
              $push: {
                'gmbData.reviews': {
                  id: review.id,
                  reviewer: review.reviewer,
                  starRating: review.starRating,
                  comment: review.comment,
                  createTime: new Date(review.createTime),
                  updateTime: new Date(review.updateTime)
                }
              }
            })
            reviewsCount++
          }
        }
      }
    }
    
    if (data.posts && Array.isArray(data.posts) && (!data.locations || data.locations.length === 0)) {
      // Update stores with posts only
      for (const post of data.posts) {
        const store = await Store.findOne({ 'gmbData.locationId': post.locationId })
        if (store) {
          const existingPosts = (store as any).gmbData?.posts || []
          const postExists = existingPosts.some((p: any) => p.id === post.id)
          
          if (!postExists) {
            await Store.findByIdAndUpdate(store._id, {
              $push: {
                'gmbData.posts': {
                  id: post.id,
                  summary: post.summary,
                  callToAction: post.callToAction,
                  media: post.media,
                  createTime: new Date(post.createTime),
                  updateTime: new Date(post.updateTime),
                  languageCode: post.languageCode,
                  state: post.state,
                  topicType: post.topicType,
                  event: post.event,
                  searchUrl: post.searchUrl
                }
              }
            })
            postsCount++
          }
        }
      }
    }
    
    if (data.insights && Array.isArray(data.insights) && (!data.locations || data.locations.length === 0)) {
      // Update stores with insights only
      for (const insight of data.insights) {
        const store = await Store.findOne({ 'gmbData.locationId': insight.locationId })
        if (store) {
          await Store.findByIdAndUpdate(store._id, {
            $set: {
              'gmbData.insights': {
                period: {
                  startTime: new Date(insight.period.startTime),
                  endTime: new Date(insight.period.endTime)
                },
                queries: insight.queries || 0,
                views: insight.views || 0,
                actions: insight.actions || 0,
                photoViews: insight.photoViews || 0,
                callClicks: insight.callClicks || 0,
                websiteClicks: insight.websiteClicks || 0,
                dailyMetrics: insight.dailyMetrics || [],
                websiteClicksSeries: insight.websiteClicksSeries || null,
                callClicksSeries: insight.callClicksSeries || null
              }
            }
          })
          insightsCount++
        }
      }
    }
    
    if (data.searchKeywords && Array.isArray(data.searchKeywords) && (!data.locations || data.locations.length === 0)) {
      // Update stores with search keywords only
      for (const keyword of data.searchKeywords) {
        const store = await Store.findOne({ 'gmbData.locationId': keyword.locationId })
        if (store) {
          await Store.findByIdAndUpdate(store._id, {
            $push: {
              'gmbData.searchKeywords': {
                keyword: keyword.keyword,
                impressions: keyword.impressions,
                period: keyword.period,
                clicks: keyword.clicks || 0,
                ctr: keyword.ctr || 0,
                position: keyword.position || 0
              }
            }
          })
          searchKeywordsCount++
        }
      }
    }

    console.log('✅ GMB data synced to unified models:')
    console.log(`  Brands updated: 1`)
    console.log(`  Stores updated: ${storesUpdated}`)
    console.log(`  Reviews: ${reviewsCount}`)
    console.log(`  Posts: ${postsCount}`)
    console.log(`  Insights: ${insightsCount}`)
    console.log(`  Search keywords: ${searchKeywordsCount}`)

    // Save to separate collections
    let separateReviewsCount = 0
    let separatePostsCount = 0
    let separatePerformanceCount = 0
    let separateKeywordsCount = 0

    // Save reviews to separate Review collection
    if (data.reviews && Array.isArray(data.reviews)) {
      console.log(`📝 Processing ${data.reviews.length} reviews for separate collection...`)
      
      for (const reviewData of data.reviews) {
        try {
          const store = await Store.findOne({ gmbLocationId: reviewData.locationId })
          if (store && brand) {
            // Log review data for debugging
            const hasReply = !!(reviewData.reviewReply || reviewData.response)
            const replyData = reviewData.reviewReply || reviewData.response
            
            console.log(`📋 Review ${reviewData.id}:`, {
              hasReply,
              hasReviewReply: !!reviewData.reviewReply,
              hasResponse: !!reviewData.response,
              profilePhotoUrl: reviewData.reviewer?.profilePhotoUrl,
              starRating: reviewData.starRating,
              convertedRating: convertStarRating(reviewData.starRating)
            })
            
            if (hasReply) {
              console.log(`  💬 Reply data:`, {
                comment: replyData?.comment?.substring(0, 50) + '...',
                updateTime: replyData?.updateTime
              })
            }
            
            const savedReview = await Review.findOneAndUpdate(
              { gmbReviewId: reviewData.id },
              {
                gmbReviewId: reviewData.id,
                storeId: store._id,
                brandId: brand._id,
                accountId: data.account.id,
                reviewer: {
                  displayName: reviewData.reviewer?.displayName || 'Anonymous',
                  profilePhotoUrl: reviewData.reviewer?.profilePhotoUrl,
                  isAnonymous: reviewData.reviewer?.isAnonymous || false
                },
                starRating: convertStarRating(reviewData.starRating),
                comment: reviewData.comment,
                gmbCreateTime: new Date(reviewData.createTime),
                gmbUpdateTime: new Date(reviewData.updateTime),
                hasResponse: hasReply,
                response: replyData ? {
                  comment: replyData.comment,
                  responseTime: new Date(replyData.updateTime)
                } : undefined
              },
              { upsert: true, new: true }
            )
            
            console.log(`  ✅ Saved review with hasResponse:`, savedReview?.hasResponse, 'response:', savedReview?.response?.comment?.substring(0, 30))
            separateReviewsCount++
          } else {
            console.log(`  ⚠️ Store not found for locationId: ${reviewData.locationId}`)
          }
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          console.warn(`Failed to save review ${reviewData.id} to separate collection:`, errorMessage)
          // Continue processing other reviews
        }
      }
    }

    // Save posts to separate Post collection
    if (data.posts && Array.isArray(data.posts)) {
      for (const postData of data.posts) {
        try {
          const store = await Store.findOne({ gmbLocationId: postData.locationId })
          if (store && brand) {
            await Post.findOneAndUpdate(
              { gmbPostId: postData.id },
              {
                gmbPostId: postData.id,
                storeId: store._id,
                brandId: brand._id,
                accountId: data.account.id,
                summary: postData.summary,
                callToAction: postData.callToAction,
                media: postData.media || [],
                gmbCreateTime: new Date(postData.createTime),
                gmbUpdateTime: new Date(postData.updateTime),
                languageCode: postData.languageCode || 'en',
                state: postData.state || 'LIVE',
                topicType: postData.topicType || 'STANDARD',
                event: postData.event,
                searchUrl: postData.searchUrl
              },
              { upsert: true, new: true }
            )
            separatePostsCount++
          }
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          console.warn(`Failed to save post ${postData.id} to separate collection:`, errorMessage)
          // Continue processing other posts
        }
      }
    }

    // Save insights to separate Performance collection
    if (data.insights && Array.isArray(data.insights)) {
      for (const insightData of data.insights) {
        let store = null
        try {
          store = await Store.findOne({ gmbLocationId: insightData.locationId })
          if (store && brand && insightData.period) {
            // Process the raw insight data using the utility
            const processedData = PerformanceDataProcessor.processRawData(insightData)
            
            // Validate the processed data
            const validation = PerformanceDataProcessor.validatePerformanceData(processedData)
            
            if (!validation.isValid) {
              console.error(`❌ Invalid performance data for store ${store.name}:`, validation.errors)
              continue
            }
            
            if (validation.warnings.length > 0) {
              console.warn(`⚠️ Performance data warnings for store ${store.name}:`, validation.warnings)
            }
            
            // Log processing results
            console.log(`📊 Processed performance data for store ${store.name}:`, {
              locationId: processedData.locationId,
              period: processedData.period,
              metrics: {
                queries: processedData.queries,
                views: processedData.views,
                actions: processedData.actions,
                callClicks: processedData.callClicks,
                websiteClicks: processedData.websiteClicks,
                conversionRate: processedData.conversionRate,
                clickThroughRate: processedData.clickThroughRate
              },
              dataQuality: processedData.dataQuality
            })
            
            const performanceData = {
              storeId: store._id,
              brandId: brand._id,
              accountId: data.account.id,
              period: processedData.period,
              queries: processedData.queries,
              views: processedData.views,
              actions: processedData.actions,
              photoViews: processedData.photoViews,
              callClicks: processedData.callClicks,
              websiteClicks: processedData.websiteClicks,
              businessBookings: processedData.businessBookings,
              businessFoodOrders: processedData.businessFoodOrders,
              businessMessages: processedData.businessMessages,
              conversionRate: processedData.conversionRate,
              clickThroughRate: processedData.clickThroughRate,
              source: 'gmb',
              status: 'active'
            }
            
            console.log(`💾 Saving performance data:`, performanceData)
            
            const savedPerformance = await Performance.findOneAndUpdate(
              { 
                storeId: store._id,
                'period.startTime': new Date(insightData.period.startTime),
                'period.endTime': new Date(insightData.period.endTime)
              },
              performanceData,
              { upsert: true, new: true }
            )
            
            console.log(`✅ Performance data saved with ID: ${savedPerformance._id}`)
            separatePerformanceCount++
          } else {
            console.warn(`⚠️ Skipping performance data - missing requirements:`, {
              hasStore: !!store,
              hasBrand: !!brand,
              hasPeriod: !!insightData.period,
              locationId: insightData.locationId
            })
          }
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          console.error(`❌ Failed to save performance data for location ${insightData.locationId} (store: ${store?._id}):`, errorMessage)
          console.error(`Error details:`, error)
          // Continue processing other insights
        }
      }
    } else {
      console.log(`ℹ️ No insights data provided for performance collection`)
    }

    // Save search keywords to separate SearchKeyword collection
    if (data.searchKeywords && Array.isArray(data.searchKeywords)) {
      for (const keywordData of data.searchKeywords) {
        try {
          const store = await Store.findOne({ gmbLocationId: keywordData.locationId })
          if (store && brand && keywordData.period) {
            await SearchKeyword.findOneAndUpdate(
              { 
                storeId: store._id,
                keyword: keywordData.keyword,
                'period.year': keywordData.period.year,
                'period.month': keywordData.period.month
              },
              {
                storeId: store._id,
                brandId: brand._id,
                accountId: data.account.id,
                keyword: keywordData.keyword,
                period: keywordData.period,
                impressions: keywordData.impressions || 0,
                clicks: keywordData.clicks || 0,
                ctr: keywordData.ctr || 0,
                position: keywordData.position || 0
              },
              { upsert: true, new: true }
            )
            separateKeywordsCount++
          }
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          console.warn(`Failed to save search keyword '${keywordData.keyword}' to separate collection:`, errorMessage)
          // Continue processing other keywords
        }
      }
    }

    console.log('✅ GMB sync completed - saved to separate collections:')
    console.log(`  Reviews: ${separateReviewsCount}`)
    console.log(`  Posts: ${separatePostsCount}`)
    console.log(`  Performance: ${separatePerformanceCount}`)
    console.log(`  Search keywords: ${separateKeywordsCount}`)

    return NextResponse.json({
      success: true,
      message: 'GMB data synced successfully to unified models and separate collections',
      stats: {
        brands: 1,
        stores: storesUpdated,
        reviews: reviewsCount,
        posts: postsCount,
        insights: insightsCount,
        searchKeywords: searchKeywordsCount,
        separateCollections: {
          reviews: separateReviewsCount,
          posts: separatePostsCount,
          performance: separatePerformanceCount,
          keywords: separateKeywordsCount
        }
      }
    })
  } catch (error: unknown) {
    console.error('❌ Error syncing GMB data to unified models:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to sync data to unified models' 
      },
      { status: 500 }
    )
  }
}
