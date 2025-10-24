import { NextRequest, NextResponse } from 'next/server'
import { GmbApiServerService } from '@/lib/server/gmb-api-server'
import connectDB from '@/lib/database/connection'
import { Brand, Store, Review, Post, Performance, SearchKeyword } from '@/lib/database/models'
import { GmbErrorHandler } from '@/lib/utils/error-handler'

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
    const { tokens } = await request.json()
    
    if (!tokens) {
      return NextResponse.json(
        { error: 'No tokens provided' },
        { status: 400 }
      )
    }

    // Create a streaming response
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      start(controller) {
        syncGmbData(tokens, controller, encoder)
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Keep-Alive': 'timeout=60, max=1000',
        'X-Accel-Buffering': 'no',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
      }
    })
  } catch (error: unknown) {
    console.error('Error in sync-data API:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to sync data' },
      { status: 500 }
    )
  }
}

async function syncGmbData(tokens: any, controller: ReadableStreamDefaultController, encoder: TextEncoder) {
  let isControllerClosed = false
  let brand: any = null

  // Helper function to safely enqueue data
  const safeEnqueue = (data: any) => {
    if (!isControllerClosed && controller.desiredSize !== null) {
      try {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      } catch (error) {
        console.warn('Failed to enqueue data:', error)
        isControllerClosed = true
      }
    }
  }
  
  // Helper function to safely close controller
  const safeClose = () => {
    if (!isControllerClosed && controller.desiredSize !== null) {
      try {
        controller.close()
        isControllerClosed = true
      } catch (error) {
        console.warn('Failed to close controller:', error)
        isControllerClosed = true
      }
    }
  }
  
  // Helper function to create or find brand
  const ensureBrand = async (accountData: any) => {
    if (brand) return brand
    
    try {
      await connectDB()
      
      // Find existing brand by email
      brand = await Brand.findOne({ 
        $or: [
          { email: accountData.email },
          { 'users.owner.email': accountData.email }
        ]
      })
      
      if (!brand) {
        // Create new brand automatically
        brand = new Brand({
          name: accountData.name || 'GMB Business',
          slug: (accountData.name || 'gmb-business').toLowerCase().replace(/[^a-z0-9]/g, '-'),
          email: accountData.email,
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
              name: accountData.name || 'Business Owner',
              email: accountData.email,
              password: 'gmb-auto-generated', // Will be changed on first login
              role: 'owner'
            }
          },
          settings: {
            gmbIntegration: {
              connected: true,
              gmbAccountId: accountData.id,
              gmbAccountName: accountData.name,
              lastSyncAt: new Date()
            }
          }
        })
        
        await brand.save()
        
      } else {
        // Update existing brand with GMB connection
        await Brand.findByIdAndUpdate(brand._id, {
          'settings.gmbIntegration.connected': true,
          'settings.gmbIntegration.gmbAccountId': accountData.id,
          'settings.gmbIntegration.gmbAccountName': accountData.name,
          'settings.gmbIntegration.lastSyncAt': new Date()
        })
        
      }
      
      return brand
    } catch (error) {
      console.error('Failed to ensure brand:', error)
      throw error
    }
  }
  
  // Helper to resolve storeId for a GMB location, creating Store if missing
  const getStoreIdByLocationId = async (
    locationId: string,
    brandId: string,
    locationData?: any
  ): Promise<string> => {
    await connectDB();

    // Normalize the locationId
    const normalizeLocationId = (loc: string) => loc?.trim();
    const normalizedId = normalizeLocationId(locationId);

    // Try to find an existing store
    let store = await Store.findOne({ gmbLocationId: normalizedId, brandId });

    // If no store exists, create a new one
    if (!store) {
      const brandDoc = await Brand.findById(brandId);
      if (!brandDoc) throw new Error(`Brand not found: ${brandId}`);

      // Extract store name from location data
      const storeName =
        locationData?.name ||
        locationData?.title ||
        locationData?.locationName ||
        `Store ${normalizedId}`;

      const cleanName = storeName.replace(/[^a-zA-Z0-9\s]/g, '').trim();
      const storeCode = cleanName.replace(/\s+/g, '-').toUpperCase().slice(0, 20);

      // Generate a unique slug
      const baseSlug = cleanName
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .slice(0, 30);
      let slug = baseSlug;
      let counter = 1;
      while (await Store.findOne({ slug })) {
        slug = `${baseSlug}-${counter++}`;
      }

      // Extract address information
      const addressLine1 = locationData?.address?.addressLines?.[0] || locationData?.address || 'Address not available';
      const locality = locationData?.address?.locality || 'Unknown';
      const city = locationData?.address?.administrativeArea || locationData?.address?.city || 'Unknown';
      const state = locationData?.address?.administrativeArea || 'Unknown';
      const postalCode = locationData?.address?.postalCode || '00000';
      const countryCode = locationData?.address?.regionCode || 'US';

      // Create the store
      store = await Store.create({
        brandId,
        name: storeName,
        storeCode,
        slug,
        email: brandDoc.email,
        phone: locationData?.phoneNumber || locationData?.primaryPhone || brandDoc.phone || '',
        address: {
          line1: addressLine1,
          locality,
          city,
          state,
          postalCode,
          countryCode,
        },
        primaryCategory: locationData?.categories?.[0] || locationData?.primaryCategory || 'Business',
        gmbLocationId: normalizedId,
        gmbAccountId: brandDoc.settings?.gmbIntegration?.gmbAccountId || '',
        verified: locationData?.verified || false,
        status: 'active',
        microsite: {
          gmbUrl: locationData?.websiteUrl || locationData?.micrositeUrl || null,
        },
      });
    }

    return (store._id as any).toString()
  };


  // Helper function to save data progressively with retry mechanism (direct DB bulk writes)
  const saveToDatabase = async (dataType: string, data: any[], progressMessage: string, retryCount = 0, locationData?: any): Promise<any> => {
    const maxRetries = 3
    const retryDelay = 1000 * Math.pow(2, retryCount) // Exponential backoff

    try {
      if (!brand) {
        throw new Error('Brand not initialized')
      }
      
      safeEnqueue({
        type: 'save-progress',
        progress: {
          step: `save-${dataType}`,
          message: retryCount > 0 ? `${progressMessage} (Retry ${retryCount}/${maxRetries})` : progressMessage
        }
      })
      
    
      await connectDB()

      let stats: any = {}
      if (dataType === 'locations') {
        const ops = data.map((location: any) => ({
          updateOne: {
            filter: {
              gmbLocationId: location.id, // Use location.id as it contains the full GMB location path
              brandId: brand._id
            },
            update: {
              $set: {
                brandId: brand._id, // Ensure brandId is set on upsert
                name: location.name, // location.name is already the title from GMB API service
                phone: location.phoneNumber, // location.phoneNumber is already processed by GMB API service
                address: {
                  line1: location.storefrontAddress?.addressLines?.[0] || location.address?.split(',')[0]?.trim() || '',
                  line2: location.storefrontAddress?.addressLines?.slice(1).join(', ') || location.address?.split(',').slice(1, -2).join(', ').trim() || '',
                  locality: location.storefrontAddress?.locality || location.address?.split(',')[location.address.split(',').length - 2]?.trim() || '',
                  city: location.storefrontAddress?.locality || location.address?.split(',')[location.address.split(',').length - 2]?.trim() || '',
                  state: location.storefrontAddress?.administrativeArea || location.address?.split(',')[location.address.split(',').length - 2]?.trim() || '',
                  postalCode: location.storefrontAddress?.postalCode || location.address?.split(',').pop()?.trim() || '',
                  countryCode: location.storefrontAddress?.regionCode || 'IN',
                  // Extract coordinates from GMB API service response
                  latitude: location.latlng?.latitude,
                  longitude: location.latlng?.longitude
                },
                primaryCategory: location.primaryCategory || location.categories?.[0] || 'Business',
                additionalCategories: location.categories?.slice(1) || [], // Additional categories after primary
                verified: location.verified || false,
                gmbAccountId: brand.settings.gmbIntegration.gmbAccountId,
                lastSyncAt: new Date(),
                // Save GMB websiteUrl as microsite.gmbUrl
                'microsite.gmbUrl': location.websiteUrl || location.micrositeUrl || null,
                'microsite.mapsUrl': location.mapsUri, // Save Google Maps URL
                // Save complete GMB metadata
                'gmbData.metadata': {
                  categories: location.categories || [],
                  websiteUrl: location.websiteUrl,
                  phoneNumber: location.phoneNumber,
                  businessStatus: 'OPEN', // Default since not provided by GMB API service
                  priceLevel: 'PRICE_LEVEL_UNSPECIFIED', // Default since not provided by GMB API service
                  primaryCategory: location.primaryCategory,
                  additionalCategories: location.categories?.slice(1) || [],
                  mapsUri: location.mapsUri // Save Google Maps URL
                },
                'gmbData.verified': location.verified || false,
                'gmbData.lastSyncAt': new Date()
              }
            },
            upsert: true
          }
        }))
        const res = await Store.bulkWrite(ops)
        stats = { inserted: res.insertedCount, modified: res.modifiedCount, upserted: res.upsertedCount }
      } else if (dataType === 'reviews') {
        // Assume all reviews belong to same location in this call (as per per-location processing)
        const locationId = data[0]?.locationId
        const storeId = locationId ? await getStoreIdByLocationId(locationId, (brand._id as any).toString(), locationData) : null

        const ops = data.map((review: any) => {

          const hasReply = !!(review.reviewReply || review.response)
          const replyData = review.reviewReply || review.response


          return {
            updateOne: {
              filter: { gmbReviewId: review.id },
              update: {
                $set: {
                  storeId,
                  brandId: brand._id,
                  accountId: brand.settings.gmbIntegration.gmbAccountId,
                  reviewer: {
                    displayName: review.reviewer?.displayName || 'Anonymous',
                    profilePhotoUrl: review.reviewer?.profilePhotoUrl,
                    isAnonymous: review.reviewer?.isAnonymous || false
                  },
                  starRating: convertStarRating(review.starRating),
                  comment: review.comment,
                  gmbCreateTime: new Date(review.createTime),
                  gmbUpdateTime: new Date(review.updateTime),
                  hasResponse: hasReply,
                  response: replyData ? {
                    comment: replyData.comment,
                    responseTime: new Date(replyData.updateTime)
                  } : undefined,
                  source: 'gmb',
                  status: 'active'
                }
              },
              upsert: true
            }
          }
        })

        const res = await Review.bulkWrite(ops)
        stats = { inserted: res.insertedCount, modified: res.modifiedCount, upserted: res.upsertedCount }
      } else if (dataType === 'posts') {
        const locationId = data[0]?.locationId
        const storeId = locationId ? await getStoreIdByLocationId(locationId, (brand._id as any).toString(), locationData) : null
        const ops = data.map((post: any) => ({
          updateOne: {
            filter: { gmbPostId: post.id },
            update: {
              $set: {
                storeId,
                brandId: brand._id,
                accountId: brand.settings.gmbIntegration.gmbAccountId,
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

        const res = await Post.bulkWrite(ops)
        stats = { inserted: res.insertedCount, modified: res.modifiedCount, upserted: res.upsertedCount }
      } else if (dataType === 'insights') {
        const locationId = data[0]?.locationId
        const storeId = locationId
          ? await getStoreIdByLocationId(locationId, (brand._id as any).toString(), locationData)
          : null

        const normalizeDate = (date: string | Date) => {
          const d = new Date(date)
          d.setUTCHours(0, 0, 0, 0)
          return d
        }

        const ops = data.map((insight: any) => ({
          updateOne: {
            filter: {
              storeId,
              'period.startTime': normalizeDate(insight.period.startTime),
              'period.endTime': normalizeDate(insight.period.endTime),
            },
            update: {
              $set: {
                brandId: brand._id,
                accountId: brand.settings.gmbIntegration.gmbAccountId,
                period: {
                  startTime: normalizeDate(insight.period.startTime),
                  endTime: normalizeDate(insight.period.endTime)
                },
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
                mobileSearchImpressions: insight.mobileSearchImpressions,
                desktopMapsImpressions: insight.desktopMapsImpressions,
                mobileMapsImpressions: insight.mobileMapsImpressions,
                dailyMetrics: insight.dailyMetrics,
                websiteClicksSeries: insight.websiteClicksSeries,
                callClicksSeries: insight.callClicksSeries,
                source: 'gmb',
                status: 'active',
                updatedAt: new Date()
              },
              $setOnInsert: {
                storeId,
                createdAt: new Date()
              }
            },
            upsert: true
          }
        }))

        const res = await Performance.bulkWrite(ops)
        stats = { inserted: res.insertedCount, modified: res.modifiedCount, upserted: res.upsertedCount }
      }
      else if (dataType === 'searchKeywords') {
        const locationId = data[0]?.locationId
        const storeId = locationId ? await getStoreIdByLocationId(locationId, (brand._id as any).toString(), locationData) : null
        const ops = data.map((kw: any) => ({
          updateOne: {
            filter: { storeId, keyword: kw.keyword, 'period.year': kw.period.year, 'period.month': kw.period.month },
            update: {
              $set: {
                brandId: brand._id,
                accountId: brand.settings.gmbIntegration.gmbAccountId,
                impressions: kw.impressions,
                clicks: kw.clicks,
                ctr: kw.ctr,
                position: kw.position,
                source: 'gmb',
                status: 'active'
              }
            },
            upsert: true
          }
        }))
        const res = await SearchKeyword.bulkWrite(ops)
        stats = { inserted: res.insertedCount, modified: res.modifiedCount, upserted: res.upsertedCount }
      }

      const result = { stats }


      safeEnqueue({
        type: 'save-complete',
        saveType: dataType,
        message: `Successfully saved ${dataType}${retryCount > 0 ? ` (after ${retryCount} retries)` : ''}`,
        stats: result.stats
      })

      return result
    } catch (error: unknown) {
      // Use error handler for better error classification
      GmbErrorHandler.logError(error, `Save ${dataType}`)

      if (GmbErrorHandler.shouldRetry(error, retryCount, maxRetries)) {
        const delay = GmbErrorHandler.getRetryDelay(retryCount)

        await new Promise(resolve => setTimeout(resolve, delay))
        return saveToDatabase(dataType, data, progressMessage, retryCount + 1, locationData)
      }

      console.error(`❌ Critical error saving ${dataType}:`, error instanceof Error ? error.message : error)

      safeEnqueue({
        type: 'save-error',
        saveType: dataType,
        error: GmbErrorHandler.formatErrorForUser(error),
        retryCount,
        maxRetries
      })

      // Don't throw the error - continue with the sync process
      console.warn(`⚠️ Continuing sync process despite ${dataType} save failure after ${retryCount} retries`)
      return null
    }
  }

  try {
    // Heartbeat to keep SSE connection alive
    const heartbeatIntervalMs = 15000
    const heartbeat = setInterval(() => {
      safeEnqueue({ type: 'heartbeat', ts: Date.now() })
    }, heartbeatIntervalMs)
    const gmbService = new GmbApiServerService(tokens)

    // Step 1: Get account info
    safeEnqueue({
      type: 'progress',
      progress: {
        step: 'account',
        progress: 1,
        total: 5,
        message: 'Fetching account information...'
      }
    })



    const accountInfo = await gmbService.getAccountInfo()
    const account = {
      id: accountInfo.id,
      name: accountInfo.name,
      email: accountInfo.email,
      connectedAt: new Date().toISOString()
    }

    // Ensure brand exists (create if needed)
    await ensureBrand(account)

    safeEnqueue({
      type: 'account',
      account,
      brand: {
        id: brand._id,
        name: brand.name,
        email: brand.email
      }
    })

    // Step 2: Get accounts and locations
    safeEnqueue({
      type: 'progress',
      progress: {
        step: 'locations',
        progress: 2,
        total: 5,
        message: 'Fetching business locations...'
      }
    })



    const accounts = await gmbService.getAccounts()
    let allLocations: Record<string, unknown>[] = []

    for (const accountData of accounts) {
      try {

        const locations = await gmbService.getLocations(accountData.name)
        allLocations = [...allLocations, ...locations.map((loc: any) => ({ ...loc } as Record<string, unknown>))]

      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        console.warn(`❌ Failed to fetch locations for account ${accountData.name}:`, errorMessage)
        safeEnqueue({
          type: 'warning',
          message: `Failed to fetch locations for account ${accountData.name}: ${errorMessage}`
        })
      }
    }

    safeEnqueue({
      type: 'locations',
      locations: allLocations
    })

    // Save locations to database
    if (allLocations.length > 0) {
      try {
        await saveToDatabase('locations', allLocations, `Saving ${allLocations.length} locations to database...`)

        // Fix any existing stores with incorrect names (e.g., "Store accounts/...")
        await connectDB()
        for (const location of allLocations) {
          try {
            const existingStore = await Store.findOne({
              gmbLocationId: location.id as string,
              brandId: brand._id
            })

            if (existingStore && existingStore.name.startsWith('Store accounts/')) {
              const correctName = (location as any).name || 'Unnamed Location'

              await Store.findByIdAndUpdate(existingStore._id, {
                $set: {
                  name: correctName
                }
              })

            }
          } catch (error) {
            console.warn(`⚠️ Failed to update store for location ${location.id}:`, error)
          }
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        console.error('❌ Failed to save locations, but continuing sync process:', errorMessage)
        safeEnqueue({
          type: 'warning',
          message: `Failed to save locations to database: ${errorMessage}`
        })
      }
    } else {
      safeEnqueue({
        type: 'warning',
        message: 'No locations found from GMB accounts'
      })
    }

    // Step 3: Process each location individually - Reviews, Posts, Insights, Keywords
    safeEnqueue({
      type: 'progress',
      progress: {
        step: 'location-processing',
        progress: 3,
        total: 5,
        message: 'Processing locations individually...'
      }
    })


    // Set up date range for insights
    const endDate = new Date().toISOString()
    const startDate = new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString()


    // Validate dates
    const startDateObj = new Date(startDate)
    const endDateObj = new Date(endDate)
    if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
      console.error(`❌ Invalid date range calculated: startDate=${startDate}, endDate=${endDate}`)
      throw new Error(`Invalid date range calculated`)
    }

    let allReviews: Record<string, unknown>[] = []
    let allPosts: Record<string, unknown>[] = []
    let allInsights: Record<string, unknown>[] = []
    let allSearchKeywords: Record<string, unknown>[] = []
    const reviewErrors: Record<string, unknown>[] = []
    const postErrors: Record<string, unknown>[] = []
    let reviewsApiAvailable = false

    // Helper: concurrency limiter
    const runWithConcurrency = async <T,>(items: T[], limit: number, worker: (item: T, index: number) => Promise<void>) => {
      let index = 0
      const runners = new Array(Math.min(limit, items.length)).fill(0).map(async () => {
        while (true) {
          const current = index++
          if (current >= items.length) break
          await worker(items[current], current)
        }
      })
      await Promise.allSettled(runners)
    }

    const MAX_CONCURRENT_LOCATIONS = parseInt(process.env.GMB_SYNC_CONCURRENCY || '5')

    // Process each location with controlled concurrency
    await runWithConcurrency(allLocations as any[], MAX_CONCURRENT_LOCATIONS, async (location: any, locIndex: number) => {


      // Progress update
      safeEnqueue({
        type: 'progress',
        progress: {
          step: 'location-processing',
          progress: 3,
          total: 5,
          message: `Processing location ${locIndex + 1}/${allLocations.length}: ${location.name}`
        }
      })

      // Validate location ID format before spawning tasks
      if (!location.id || typeof location.id !== 'string' || !location.id.includes('accounts/') || !location.id.includes('/locations/')) {
        console.error(`❌ Invalid location ID format: ${location.id}`)
        return
      }

      // Define per-location tasks to run in parallel
      const processPosts = (async () => {
        try {

          const posts = await gmbService.getPosts(location.id as string)
          if (posts && posts.length > 0) {
            const postsWithLocationId = posts.map(post => ({ ...post, locationId: location.id }))
            await saveToDatabase('posts', postsWithLocationId, `Saving ${postsWithLocationId.length} posts for ${location.name}...`, 0, location)
            allPosts = [...allPosts, ...postsWithLocationId]

          } else {

          }
        } catch (error: unknown) {
          console.warn(`❌ Failed to fetch posts for location ${location.name}:`, error)
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          postErrors.push({
            locationName: location.name,
            locationId: location.id,
            error: errorMessage,
            details: (error as any).details || null,
            timestamp: new Date().toISOString()
          })
        }
      })()

      const processInsights = (async () => {
        try {

          const insights = await gmbService.getInsights(location.id as string, startDate, endDate)
          if (insights) {
            const insightData: any = { ...insights, locationId: location.id }
            if (insightData.actions === 0 && (insightData.callClicks > 0 || insightData.websiteClicks > 0)) {
              insightData.actions = (insightData.callClicks || 0) + (insightData.websiteClicks || 0)
            }
            allInsights.push(insightData)
            await saveToDatabase('insights', [insightData], `Saving insights for ${location.name}...`, 0, location)
          } else {
            const minimalInsights: any = {
              locationId: location.id,
              period: { startTime: startDate, endTime: endDate },
              queries: 0,
              views: 0,
              actions: 0,
              photoViews: 0,
              callClicks: 0,
              websiteClicks: 0,
              dailyMetrics: []
            }
            allInsights.push(minimalInsights)
            await saveToDatabase('insights', [minimalInsights], `Saving minimal insights for ${location.name}...`, 0, location)
          }
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          console.warn(`❌ Failed to fetch insights for location ${location.name}:`, errorMessage)
        }
      })()

      const processKeywords = (async () => {
        try {

          const currentDate = new Date()
          const threeMonthsAgo = new Date(currentDate.getFullYear(), currentDate.getMonth() - 3, 1)
          const searchKeywords = await gmbService.getSearchKeywords(
            location.id as string,
            threeMonthsAgo.getFullYear(),
            threeMonthsAgo.getMonth() + 1,
            currentDate.getFullYear(),
            currentDate.getMonth() + 1
          )
          if (searchKeywords && searchKeywords.length > 0) {
            const locationKeywords = searchKeywords.map((kw: any) => ({ ...kw, locationId: location.id } as Record<string, unknown>))
            allSearchKeywords.push(...locationKeywords)
            await saveToDatabase('searchKeywords', locationKeywords, `Saving ${locationKeywords.length} search keywords for ${location.name}...`, 0, location)

          } else {

          }
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          console.warn(`❌ Failed to fetch search keywords for location ${location.name}:`, errorMessage)
        }
      })()

      // First complete posts, insights and keywords in parallel
      await Promise.allSettled([processPosts, processInsights, processKeywords])

      // Then fetch reviews last to minimize API pressure and UI latency
      try {

        const reviews = await gmbService.getReviews(location.id as string)
        const locationReviews = reviews.map((rev: any) => ({ ...rev, locationId: location.id } as Record<string, unknown>))
        if (locationReviews.length > 0) {
          await saveToDatabase('reviews', locationReviews, `Saving ${locationReviews.length} reviews for ${location.name}...`, 0, location)
        }
        reviewsApiAvailable = true
        allReviews = [...allReviews, ...locationReviews]

      } catch (error: unknown) {
        console.warn(`❌ Failed to fetch reviews for location ${location.name}:`, error)
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        reviewErrors.push({
          locationName: location.name,
          locationId: location.id,
          error: errorMessage,
          details: (error as any).details || null,
          timestamp: new Date().toISOString()
        })
      }

      // Update progress after processing this location
      safeEnqueue({
        type: 'progress',
        progress: {
          step: 'location-processing',
          progress: 3,
          total: 5,
          message: `Completed location ${locIndex + 1}/${allLocations.length}: ${location.name}`
        }
      })
    })

    // Send consolidated data for UI display
    safeEnqueue({
      type: 'reviews',
      reviews: allReviews,
      reviewsApiAvailable,
      reviewErrors: reviewErrors.length > 0 ? reviewErrors : undefined,
      reviewsMessage: !reviewsApiAvailable && reviewErrors.length > 0
        ? 'Google My Business Reviews API requires special permissions. Most standard Google Cloud projects do not have access to this API.'
        : undefined
    })

    safeEnqueue({
      type: 'posts',
      posts: allPosts,
      postErrors: postErrors.length > 0 ? postErrors : undefined
    })

    safeEnqueue({
      type: 'search-keywords',
      searchKeywords: allSearchKeywords
    })

    // All data has been saved progressively above during location processing

    // Final completion step
    safeEnqueue({
      type: 'progress',
      progress: {
        step: 'complete',
        progress: 5,
        total: 5,
        message: 'Sync completed successfully!'
      }
    })



    // Complete
    safeEnqueue({
      type: 'complete',
      data: {
        account,
        locations: allLocations,
        reviews: allReviews,
        posts: allPosts,
        insights: allInsights,
        searchKeywords: allSearchKeywords
      }
    })

    // As a final guard, also emit a terminal marker SSE message to signal the client
    safeEnqueue({ type: 'done' })

    safeClose()
    clearInterval(heartbeat)
  } catch (error: unknown) {
    console.error('GMB sync failed:', error)
    safeEnqueue({
      type: 'error',
      error: error instanceof Error ? error.message : 'Failed to sync GMB data'
    })
    safeClose()
  }
}
