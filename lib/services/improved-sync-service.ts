import mongoose from 'mongoose'
import connectDB from '@/lib/database/connection'
import { Brand, Store, Review, Post, Performance, SearchKeyword } from '@/lib/database/models'
import { GmbApiServerService } from '@/lib/server/gmb-api-server'
import { GmbErrorHandler } from '@/lib/utils/error-handler'

// Sync State Management
export interface SyncState {
  id: string
  brandId: string
  accountId: string
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'paused'
  currentStep: string
  progress: {
    total: number
    completed: number
    percentage: number
  }
  checkpoints: SyncCheckpoint[]
  errors: SyncError[]
  startedAt: Date
  lastUpdatedAt: Date
  completedAt?: Date
}

export interface SyncCheckpoint {
  step: string
  dataType: string
  locationId?: string
  dataCount: number
  timestamp: Date
  status: 'pending' | 'completed' | 'failed'
  error?: string
}

export interface SyncError {
  step: string
  locationId?: string
  error: string
  timestamp: Date
  retryable: boolean
  retryCount: number
}

export interface BatchOperation {
  operation: 'insert' | 'update' | 'upsert'
  collection: string
  data: any[]
  filter?: any
  options?: any
}

// Improved Sync Service with better architecture
export class ImprovedSyncService {
  private static readonly BATCH_SIZE = 100
  private static readonly MAX_RETRIES = 3
  private static readonly RETRY_DELAY = 1000
  private static readonly CIRCUIT_BREAKER_THRESHOLD = 5
  private static readonly CIRCUIT_BREAKER_TIMEOUT = 60000

  private static circuitBreakerState = new Map<string, {
    failures: number
    lastFailure: number
    state: 'closed' | 'open' | 'half-open'
  }>()

  /**
   * Initialize sync state and create checkpoint system
   */
  static async initializeSync(tokens: any, accountData: any): Promise<SyncState> {
    try {
      await connectDB()
      
      // Create or find brand
      const brand = await this.ensureBrand(accountData)
      
      // Create sync state
      const syncState: SyncState = {
        id: new mongoose.Types.ObjectId().toString(),
        brandId: brand._id.toString(),
        accountId: accountData.id,
        status: 'pending',
        currentStep: 'initialization',
        progress: { total: 0, completed: 0, percentage: 0 },
        checkpoints: [],
        errors: [],
        startedAt: new Date(),
        lastUpdatedAt: new Date()
      }

      // Save initial state
      await this.saveSyncState(syncState)
      
      return syncState
    } catch (error) {
      console.error('Failed to initialize sync:', error)
      throw error
    }
  }

  /**
   * Main sync orchestrator with checkpoint system
   */
  static async syncWithCheckpoints(
    tokens: any, 
    syncState: SyncState,
    onProgress?: (state: SyncState) => void
  ): Promise<SyncState> {
    try {
      const gmbService = new GmbApiServerService(tokens)
      
      // Update status to in_progress
      syncState.status = 'in_progress'
      syncState.currentStep = 'account_info'
      await this.updateSyncState(syncState)
      onProgress?.(syncState)

      // Step 1: Account Info (already done in initialization)
      await this.createCheckpoint(syncState, 'account_info', 'account', 1)

      // Step 2: Locations
      syncState.currentStep = 'locations'
      const locations = await this.fetchLocationsWithRetry(gmbService, syncState)
      await this.saveDataBatch('locations', locations, syncState)
      await this.createCheckpoint(syncState, 'locations', 'locations', locations.length)

      // Step 3: Process each location in parallel batches
      syncState.currentStep = 'location_processing'
      const locationBatches = this.createBatches(locations, 5) // Process 5 locations at a time
      
      for (const batch of locationBatches) {
        await this.processLocationBatch(batch, gmbService, syncState)
        onProgress?.(syncState)
      }

      // Step 4: Finalize
      syncState.status = 'completed'
      syncState.completedAt = new Date()
      await this.updateSyncState(syncState)

      return syncState
    } catch (error) {
      syncState.status = 'failed'
      syncState.errors.push({
        step: syncState.currentStep,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
        retryable: true,
        retryCount: 0
      })
      await this.updateSyncState(syncState)
      throw error
    }
  }

  /**
   * Process a batch of locations in parallel
   */
  private static async processLocationBatch(
    locations: any[],
    gmbService: GmbApiServerService,
    syncState: SyncState
  ): Promise<void> {
    const promises = locations.map(location => 
      this.processLocation(location, gmbService, syncState)
    )

    // Use Promise.allSettled to handle individual failures
    const results = await Promise.allSettled(promises)
    
    // Log any failures but continue processing
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.error(`Failed to process location ${locations[index].name}:`, result.reason)
        syncState.errors.push({
          step: 'location_processing',
          locationId: locations[index].id,
          error: result.reason instanceof Error ? result.reason.message : 'Unknown error',
          timestamp: new Date(),
          retryable: true,
          retryCount: 0
        })
      }
    })
  }

  /**
   * Process individual location with all data types and parallel database saves
   */
  private static async processLocation(
    location: any,
    gmbService: GmbApiServerService,
    syncState: SyncState
  ): Promise<void> {
    const locationId = location.id
    const locationName = location.name

    try {
      // Set up date range for insights
      const endDate = new Date().toISOString()
      const startDate = new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString()

      // Process all data types in parallel with immediate database saves
      const dataPromises = [
        this.fetchAndSaveReviews(locationId, gmbService, syncState),
        this.fetchAndSavePosts(locationId, gmbService, syncState),
        this.fetchAndSaveInsights(locationId, startDate, endDate, gmbService, syncState),
        this.fetchAndSaveSearchKeywords(locationId, gmbService, syncState),
        this.fetchAndSavePerformanceDataMultipleRanges(locationId, gmbService, syncState)
      ]

      // Wait for all data fetching and saving to complete
      const results = await Promise.allSettled(dataPromises)
      
      // Log any failures but continue processing
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          const dataTypes = ['reviews', 'posts', 'insights', 'searchKeywords', 'performanceData']
          console.warn(`Failed to process ${dataTypes[index]} for location ${locationName}:`, result.reason)
        }
      })
      
      // Update progress
      syncState.progress.completed++
      syncState.progress.percentage = Math.round((syncState.progress.completed / syncState.progress.total) * 100)
      
    } catch (error) {
      console.error(`Error processing location ${locationName}:`, error)
      throw error
    }
  }

  /**
   * Fetch and save reviews with retry logic and parallel database operations
   */
  private static async fetchAndSaveReviews(
    locationId: string,
    gmbService: GmbApiServerService,
    syncState: SyncState
  ): Promise<void> {
    try {
      console.log(`🔍 Starting reviews fetch for location ${locationId}`)
      
      const reviews = await this.executeWithCircuitBreaker(
        'reviews',
        () => gmbService.getReviews(locationId)
      )
      
      console.log(`📊 Fetched ${reviews?.length || 0} reviews for location ${locationId}`)
      
      if (reviews && reviews.length > 0) {
        console.log(`💾 Starting parallel save for ${reviews.length} reviews...`)
        // Save reviews immediately with parallel database operations
        await this.saveReviewsBatchParallel(reviews, syncState, locationId)
        console.log(`✅ Successfully saved ${reviews.length} reviews for location ${locationId}`)
      } else {
        console.log(`ℹ️ No reviews to save for location ${locationId}`)
      }
    } catch (error) {
      console.warn(`❌ Failed to fetch/save reviews for location ${locationId}:`, error)
      // Don't throw - continue with other data types
    }
  }

  /**
   * Fetch and save posts with retry logic and parallel database operations
   */
  private static async fetchAndSavePosts(
    locationId: string,
    gmbService: GmbApiServerService,
    syncState: SyncState
  ): Promise<void> {
    try {
      console.log(`🔍 Starting posts fetch for location ${locationId}`)
      
      const posts = await this.executeWithCircuitBreaker(
        'posts',
        () => gmbService.getPosts(locationId)
      )
      
      console.log(`📊 Fetched ${posts?.length || 0} posts for location ${locationId}`)
      
      if (posts && posts.length > 0) {
        console.log(`💾 Starting parallel save for ${posts.length} posts...`)
        // Save posts immediately with parallel database operations
        await this.savePostsBatchParallel(posts, syncState, locationId)
        console.log(`✅ Successfully saved ${posts.length} posts for location ${locationId}`)
      } else {
        console.log(`ℹ️ No posts to save for location ${locationId}`)
      }
    } catch (error) {
      console.warn(`❌ Failed to fetch/save posts for location ${locationId}:`, error)
      // Don't throw - continue with other data types
    }
  }

  /**
   * Fetch and save insights with retry logic and parallel database operations
   */
  private static async fetchAndSaveInsights(
    locationId: string,
    startDate: string,
    endDate: string,
    gmbService: GmbApiServerService,
    syncState: SyncState
  ): Promise<void> {
    try {
      const insights = await this.executeWithCircuitBreaker(
        'insights',
        () => gmbService.getInsights(locationId, startDate, endDate)
      )
      
      if (insights) {
        // Save insights immediately with parallel database operations
        await this.saveInsightsBatchParallel([insights], syncState, locationId)
        console.log(`✅ Saved insights for location ${locationId}`)
      }
    } catch (error) {
      console.warn(`Failed to fetch insights for location ${locationId}:`, error)
      // Don't throw - continue with other data types
    }
  }

  /**
   * Fetch and save search keywords with retry logic and parallel database operations
   */
  private static async fetchAndSaveSearchKeywords(
    locationId: string,
    gmbService: GmbApiServerService,
    syncState: SyncState
  ): Promise<void> {
    try {
      const currentDate = new Date()
      const threeMonthsAgo = new Date(currentDate.getFullYear(), currentDate.getMonth() - 3, 1)
      
      const keywords = await this.executeWithCircuitBreaker(
        'searchKeywords',
        () => gmbService.getSearchKeywords(
          locationId,
          threeMonthsAgo.getFullYear(),
          threeMonthsAgo.getMonth() + 1,
          currentDate.getFullYear(),
          currentDate.getMonth() + 1
        )
      )
      
      if (keywords && keywords.length > 0) {
        // Save keywords immediately with parallel database operations
        await this.saveSearchKeywordsBatchParallel(keywords, syncState, locationId)
        console.log(`✅ Saved ${keywords.length} search keywords for location ${locationId}`)
      }
    } catch (error) {
      console.warn(`Failed to fetch search keywords for location ${locationId}:`, error)
      // Don't throw - continue with other data types
    }
  }

  /**
   * Fetch and save performance data for multiple date ranges (7, 30, 90, 180 days)
   */
  private static async fetchAndSavePerformanceDataMultipleRanges(
    locationId: string,
    gmbService: GmbApiServerService,
    syncState: SyncState
  ): Promise<void> {
    try {
      const dateRanges = [
        { days: 7, label: '7 days' },
        { days: 30, label: '30 days' },
        { days: 60, label: '60 days' },
        { days: 90, label: '90 days' }
      ]

      const endDate = new Date()
      const performanceDataArray: any[] = []

      // Fetch performance data for each date range
      for (const range of dateRanges) {
        const startDate = new Date()
        startDate.setDate(startDate.getDate() - range.days)
        
        try {
          const insights = await this.executeWithCircuitBreaker(
            'performance',
            () => gmbService.getInsights(locationId, startDate.toISOString(), endDate.toISOString())
          )
          
          if (insights) {
            // Add date range information to insights
            const performanceData = {
              ...insights,
              dateRange: {
                days: range.days,
                label: range.label,
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString()
              }
            }
            performanceDataArray.push(performanceData)
          }
        } catch (error) {
          console.warn(`Failed to fetch ${range.label} performance data for ${locationId}:`, error)
          // Continue with other date ranges
        }
      }

      // Save all performance data if we have any
      if (performanceDataArray.length > 0) {
        await this.savePerformanceDataBatchParallel(performanceDataArray, syncState, locationId)
        console.log(`✅ Saved performance data for ${performanceDataArray.length} date ranges for location ${locationId}`)
      }
    } catch (error) {
      console.warn(`Failed to fetch performance data for location ${locationId}:`, error)
      // Don't throw - continue with other data types
    }
  }

  /**
   * Circuit breaker pattern for API calls
   */
  private static async executeWithCircuitBreaker<T>(
    service: string,
    operation: () => Promise<T>
  ): Promise<T> {
    const state = this.circuitBreakerState.get(service) || {
      failures: 0,
      lastFailure: 0,
      state: 'closed' as const
    }

    // Check if circuit is open
    if (state.state === 'open') {
      if (Date.now() - state.lastFailure > this.CIRCUIT_BREAKER_TIMEOUT) {
        state.state = 'half-open'
      } else {
        throw new Error(`Circuit breaker is open for ${service}`)
      }
    }

    try {
      const result = await operation()
      
      // Reset on success
      if (state.state === 'half-open') {
        state.failures = 0
        state.state = 'closed'
      }
      
      return result
    } catch (error) {
      state.failures++
      state.lastFailure = Date.now()
      
      if (state.failures >= this.CIRCUIT_BREAKER_THRESHOLD) {
        state.state = 'open'
      }
      
      this.circuitBreakerState.set(service, state)
      throw error
    }
  }

  /**
   * Fetch locations with retry logic
   */
  private static async fetchLocationsWithRetry(
    gmbService: GmbApiServerService,
    syncState: SyncState
  ): Promise<any[]> {
    let lastError: Error | null = null
    
    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        const accounts = await gmbService.getAccounts()
        let allLocations: any[] = []
        
        for (const account of accounts) {
          const locations = await gmbService.getLocations(account.name)
          allLocations = [...allLocations, ...locations]
        }
        
        // Update total progress
        syncState.progress.total = allLocations.length
        await this.updateSyncState(syncState)
        
        return allLocations
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error')
        console.warn(`Attempt ${attempt} failed to fetch locations:`, lastError.message)
        
        if (attempt < this.MAX_RETRIES) {
          await this.delay(this.RETRY_DELAY * attempt)
        }
      }
    }
    
    throw lastError || new Error('Failed to fetch locations after all retries')
  }

  /**
   * Save data in batches with validation and transformation
   */
  public static async saveDataBatch(
    dataType: string,
    data: any[],
    syncState: SyncState,
    locationData?: any
  ): Promise<void> {
    if (!data || data.length === 0) return

    try {
      // Validate and transform data
      const validatedData = this.validateAndTransformData(dataType, data)
      
      // Process in batches
      const batches = this.createBatches(validatedData, this.BATCH_SIZE)
      
      for (const batch of batches) {
        await this.saveBatch(dataType, batch, syncState, locationData)
      }
      
    } catch (error) {
      console.error(`Failed to save ${dataType} batch:`, error)
      throw error
    }
  }

  /**
   * Save individual batch to database
   */
  private static async saveBatch(
    dataType: string,
    batch: any[],
    syncState: SyncState,
    locationData?: any
  ): Promise<void> {
    try {
      switch (dataType) {
        case 'locations':
          await this.saveLocationsBatch(batch, syncState)
          break
        case 'reviews':
          await this.saveReviewsBatch(batch, syncState, locationData)
          break
        case 'posts':
          await this.savePostsBatch(batch, syncState, locationData)
          break
        case 'insights':
          await this.saveInsightsBatch(batch, syncState, locationData)
          break
        case 'searchKeywords':
          await this.saveSearchKeywordsBatch(batch, syncState, locationData)
          break
        case 'performance':
          await this.savePerformanceBatch(batch, syncState, locationData)
          break
        default:
          console.warn(`Unknown data type: ${dataType}`)
      }
    } catch (error) {
      console.error(`Failed to save ${dataType} batch:`, error)
      throw error
    }
  }

  /**
   * Save locations batch
   */
  private static async saveLocationsBatch(locations: any[], syncState: SyncState): Promise<void> {
    const operations = locations.map(location => ({
      updateOne: {
        filter: { gmbLocationId: location.id },
        update: {
          $set: {
            name: location.name,
            phone: location.phoneNumbers?.primaryPhone || location.phoneNumber,
            address: {
              line1: (location as any).storefrontAddress?.addressLines?.[0] || location.address?.split(',')[0] || '',
              line2: (location as any).storefrontAddress?.addressLines?.slice(1).join(', ') || '',
              locality: (location as any).storefrontAddress?.locality || location.address?.split(',')[location.address.split(',').length - 2]?.trim() || '',
              city: (location as any).storefrontAddress?.locality || location.address?.split(',')[location.address.split(',').length - 2]?.trim() || '',
              state: (location as any).storefrontAddress?.administrativeArea || location.address?.split(',')[location.address.split(',').length - 2]?.trim() || '',
              postalCode: (location as any).storefrontAddress?.postalCode || location.address?.split(',').pop()?.trim() || '',
              countryCode: (location as any).storefrontAddress?.regionCode || 'IN',
              // Extract coordinates from GMB API response
              latitude: (location as any).latlng?.latitude,
              longitude: (location as any).latlng?.longitude
            },
            primaryCategory: (location as any).categories?.primaryCategory?.displayName || location.categories?.[0],
            additionalCategories: (location as any).categories?.additionalCategories || [],
            websiteUrl: location.websiteUri,
            gmbAccountId: syncState.accountId,
            verified: location.verified || false,
            lastSyncAt: new Date(),
            'microsite.gmbUrl': location.websiteUri,
            'microsite.mapsUrl': (location as any).metadata?.mapsUri || location.mapsUri, // Save Google Maps URL
            // Save complete GMB metadata
            'gmbData.metadata': {
              categories: (location as any).categories?.additionalCategories || [],
              websiteUrl: location.websiteUri,
              phoneNumber: (location as any).phoneNumbers?.primaryPhone,
              businessStatus: (location as any).businessStatus || 'OPEN',
              priceLevel: (location as any).priceLevel || 'PRICE_LEVEL_UNSPECIFIED',
              primaryCategory: (location as any).categories?.primaryCategory?.displayName,
              additionalCategories: (location as any).categories?.additionalCategories || [],
              mapsUri: (location as any).metadata?.mapsUri || location.mapsUri // Save Google Maps URL
            },
            'gmbData.verified': location.verified || false,
            'gmbData.lastSyncAt': new Date()
          }
        },
        upsert: true
      }
    }))

    await Store.bulkWrite(operations)
  }

  /**
   * Save reviews batch with parallel database operations
   */
  private static async saveReviewsBatchParallel(reviews: any[], syncState: SyncState, locationId: string): Promise<void> {
    try {
      // Ensure database connection
      await connectDB()
      
      // Get store ID once for all reviews
      const storeId = await this.getStoreIdByLocationId(locationId, syncState.brandId)
      
      // Create operations in parallel
      const operations = reviews.map(review => ({
        updateOne: {
          filter: { gmbReviewId: review.id },
          update: {
            $set: {
              storeId: storeId,
              brandId: syncState.brandId,
              accountId: syncState.accountId,
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

      // Execute bulk write operation
      const result = await Review.bulkWrite(operations)
      console.log(`💾 Parallel save completed: ${reviews.length} reviews for location ${locationId}`, {
        inserted: result.insertedCount,
        modified: result.modifiedCount,
        upserted: result.upsertedCount
      })
    } catch (error) {
      console.error(`Failed to save reviews batch for location ${locationId}:`, error)
      throw error
    }
  }

  /**
   * Save reviews batch (legacy method for compatibility)
   */
  private static async saveReviewsBatch(reviews: any[], syncState: SyncState, locationData?: any): Promise<void> {
    const operations = await Promise.all(reviews.map(async review => ({
      updateOne: {
        filter: { gmbReviewId: review.id },
        update: {
          $set: {
            storeId: await this.getStoreIdByLocationId(review.locationId, syncState.brandId, locationData),
            brandId: syncState.brandId,
            accountId: syncState.accountId,
            reviewer: review.reviewer,
            starRating: review.starRating,
            comment: review.comment,
            gmbCreateTime: new Date(review.createTime),
            gmbUpdateTime: new Date(review.updateTime)
          }
        },
        upsert: true
      }
    })))

    await Review.bulkWrite(operations)
  }

  /**
   * Save posts batch with parallel database operations
   */
  private static async savePostsBatchParallel(posts: any[], syncState: SyncState, locationId: string): Promise<void> {
    try {
      // Ensure database connection
      await connectDB()
      
      // Get store ID once for all posts
      const storeId = await this.getStoreIdByLocationId(locationId, syncState.brandId)
      
      // Create operations in parallel
      const operations = posts.map(post => ({
        updateOne: {
          filter: { gmbPostId: post.id },
          update: {
            $set: {
              storeId: storeId,
              brandId: syncState.brandId,
              accountId: syncState.accountId,
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

      // Execute bulk write operation
      const result = await Post.bulkWrite(operations)
      console.log(`💾 Parallel save completed: ${posts.length} posts for location ${locationId}`, {
        inserted: result.insertedCount,
        modified: result.modifiedCount,
        upserted: result.upsertedCount
      })
    } catch (error) {
      console.error(`Failed to save posts batch for location ${locationId}:`, error)
      throw error
    }
  }

  /**
   * Save posts batch (legacy method for compatibility)
   */
  private static async savePostsBatch(posts: any[], syncState: SyncState, locationData?: any): Promise<void> {
    const operations = await Promise.all(posts.map(async post => ({
      updateOne: {
        filter: { gmbPostId: post.id },
        update: {
          $set: {
            storeId: await this.getStoreIdByLocationId(post.locationId, syncState.brandId, locationData),
            brandId: syncState.brandId,
            accountId: syncState.accountId,
            summary: post.summary,
            callToAction: post.callToAction,
            media: post.media,
            gmbCreateTime: new Date(post.createTime),
            gmbUpdateTime: new Date(post.updateTime),
            languageCode: post.languageCode,
            state: post.state,
            topicType: post.topicType,
            event: post.event,
            searchUrl: post.searchUrl
          }
        },
        upsert: true
      }
    })))

    await Post.bulkWrite(operations)
  }

  /**
   * Save insights batch with parallel database operations
   */
  private static async saveInsightsBatchParallel(insights: any[], syncState: SyncState, locationId: string): Promise<void> {
    try {
      // Ensure database connection
      await connectDB()
      
      // Get store ID once for all insights
      const storeId = await this.getStoreIdByLocationId(locationId, syncState.brandId)
      
      // Create operations in parallel
      const operations = insights.map(insight => ({
        updateOne: {
          filter: {
            storeId: storeId,
            'period.startTime': new Date(insight.period.startTime),
            'period.endTime': new Date(insight.period.endTime)
          },
          update: {
            $set: {
              brandId: syncState.brandId,
              accountId: syncState.accountId,
              period: insight.period,
              queries: insight.queries,
              views: insight.views,
              actions: insight.actions,
              photoViews: insight.photoViews,
              callClicks: insight.callClicks,
              websiteClicks: insight.websiteClicks,
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

      // Execute bulk write operation
      const result = await Performance.bulkWrite(operations)
      console.log(`💾 Parallel save completed: ${insights.length} insights for location ${locationId}`, {
        inserted: result.insertedCount,
        modified: result.modifiedCount,
        upserted: result.upsertedCount
      })
    } catch (error) {
      console.error(`Failed to save insights batch for location ${locationId}:`, error)
      throw error
    }
  }

  /**
   * Save performance batch (used by sync orchestrator)
   */
  private static async savePerformanceBatch(
    batch: any[],
    syncState: SyncState,
    locationData?: any
  ): Promise<void> {
    try {
      if (!batch || batch.length === 0) return

      // Ensure database connection
      await connectDB()
      
      // Get store ID
      const storeId = await this.getStoreIdByLocationId(locationData?.locationId || locationData?.id, syncState.brandId)
      
      // Create operations for each performance record
      const operations = batch.map(performanceData => {
        return {
          updateOne: {
            filter: {
              storeId: storeId,
              'period.startTime': new Date(performanceData.period.startTime),
              'period.endTime': new Date(performanceData.period.endTime),
              'period.dateRange.days': performanceData.period.dateRange.days
            },
            update: {
              $set: {
                brandId: syncState.brandId,
                accountId: syncState.accountId,
                period: performanceData.period,
                queries: performanceData.queries || 0,
                views: performanceData.views || 0,
                actions: performanceData.actions || 0,
                photoViews: performanceData.photoViews || 0,
                callClicks: performanceData.callClicks || 0,
                websiteClicks: performanceData.websiteClicks || 0,
                directionRequests: performanceData.directionRequests || 0,
                businessBookings: performanceData.businessBookings || 0,
                businessFoodOrders: performanceData.businessFoodOrders || 0,
                businessMessages: performanceData.businessMessages || 0,
                desktopSearchImpressions: performanceData.desktopSearchImpressions || 0,
                mobileMapsImpressions: performanceData.mobileMapsImpressions || 0,
                conversionRate: performanceData.conversionRate || 0,
                clickThroughRate: performanceData.clickThroughRate || 0,
                source: 'gmb',
                status: 'active'
              }
            },
            upsert: true
          }
        }
      })

      // Execute bulk write operation
      const result = await Performance.bulkWrite(operations)
      console.log(`💾 Performance batch saved: ${result.upsertedCount} inserted, ${result.modifiedCount} updated`)

    } catch (error) {
      console.error('Failed to save performance batch:', error)
      throw error
    }
  }

  /**
   * Save performance data batch with parallel database operations for multiple date ranges
   */
  private static async savePerformanceDataBatchParallel(performanceDataArray: any[], syncState: SyncState, locationId: string): Promise<void> {
    try {
      // Ensure database connection
      await connectDB()
      
      // Get store ID once for all performance data
      const storeId = await this.getStoreIdByLocationId(locationId, syncState.brandId)
      
      // Create operations in parallel
      const operations = performanceDataArray.map(performanceData => {
        // Create period with date range information
        const period = {
          startTime: new Date(performanceData.period.startTime),
          endTime: new Date(performanceData.period.endTime),
          periodType: 'custom' as const,
          dateRange: performanceData.dateRange // Store the date range info
        }

        return {
          updateOne: {
            filter: {
              storeId: storeId,
              'period.startTime': period.startTime,
              'period.endTime': period.endTime
            },
            update: {
              $set: {
                brandId: syncState.brandId,
                accountId: syncState.accountId,
                period: period,
                queries: performanceData.queries,
                views: performanceData.views,
                actions: performanceData.actions,
                photoViews: performanceData.photoViews,
                callClicks: performanceData.callClicks,
                websiteClicks: performanceData.websiteClicks,
                directionRequests: performanceData.directionRequests,
                businessBookings: performanceData.businessBookings,
                businessFoodOrders: performanceData.businessFoodOrders,
                businessMessages: performanceData.businessMessages,
                desktopSearchImpressions: performanceData.desktopSearchImpressions,
                mobileMapsImpressions: performanceData.mobileMapsImpressions,
                dailyMetrics: performanceData.dailyMetrics,
                websiteClicksSeries: performanceData.websiteClicksSeries,
                callClicksSeries: performanceData.callClicksSeries,
                // Calculate conversion rates
                conversionRate: performanceData.views > 0 ? (performanceData.actions / performanceData.views) * 100 : 0,
                clickThroughRate: performanceData.views > 0 ? ((performanceData.callClicks + performanceData.websiteClicks) / performanceData.views) * 100 : 0,
                source: 'gmb',
                status: 'active'
              }
            },
            upsert: true
          }
        }
      })

      // Execute bulk write operation
      const result = await Performance.bulkWrite(operations)
      console.log(`💾 Parallel save completed: ${performanceDataArray.length} performance data points for location ${locationId}`, {
        inserted: result.insertedCount,
        modified: result.modifiedCount,
        upserted: result.upsertedCount
      })
    } catch (error) {
      console.error(`Failed to save performance data batch for location ${locationId}:`, error)
      throw error
    }
  }

  /**
   * Save insights batch (legacy method for compatibility)
   */
  private static async saveInsightsBatch(insights: any[], syncState: SyncState, locationData?: any): Promise<void> {
    const operations = await Promise.all(insights.map(async insight => ({
      updateOne: {
        filter: {
          storeId: await this.getStoreIdByLocationId(insight.locationId, syncState.brandId, locationData),
          'period.startTime': new Date(insight.period.startTime),
          'period.endTime': new Date(insight.period.endTime)
        },
        update: {
          $set: {
            brandId: syncState.brandId,
            accountId: syncState.accountId,
            period: insight.period,
            queries: insight.queries,
            views: insight.views,
            actions: insight.actions,
            photoViews: insight.photoViews,
            callClicks: insight.callClicks,
            websiteClicks: insight.websiteClicks,
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
    })))

    await Performance.bulkWrite(operations)
  }

  /**
   * Save search keywords batch with parallel database operations
   */
  private static async saveSearchKeywordsBatchParallel(keywords: any[], syncState: SyncState, locationId: string): Promise<void> {
    try {
      // Ensure database connection
      await connectDB()
      
      // Get store ID once for all keywords
      const storeId = await this.getStoreIdByLocationId(locationId, syncState.brandId)
      
      // Create operations in parallel
      const operations = keywords.map(keyword => ({
        updateOne: {
          filter: {
            storeId: storeId,
            keyword: keyword.keyword,
            'period.year': keyword.period.year,
            'period.month': keyword.period.month
          },
          update: {
            $set: {
              brandId: syncState.brandId,
              accountId: syncState.accountId,
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

      // Execute bulk write operation
      const result = await SearchKeyword.bulkWrite(operations)
      console.log(`💾 Parallel save completed: ${keywords.length} search keywords for location ${locationId}`, {
        inserted: result.insertedCount,
        modified: result.modifiedCount,
        upserted: result.upsertedCount
      })
    } catch (error) {
      console.error(`Failed to save search keywords batch for location ${locationId}:`, error)
      throw error
    }
  }

  /**
   * Save search keywords batch (legacy method for compatibility)
   */
  private static async saveSearchKeywordsBatch(keywords: any[], syncState: SyncState, locationData?: any): Promise<void> {
    const operations = await Promise.all(keywords.map(async keyword => ({
      updateOne: {
        filter: {
          storeId: await this.getStoreIdByLocationId(keyword.locationId, syncState.brandId, locationData),
          keyword: keyword.keyword,
          'period.year': keyword.period.year,
          'period.month': keyword.period.month
        },
        update: {
          $set: {
            brandId: syncState.brandId,
            accountId: syncState.accountId,
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
    })))

    await SearchKeyword.bulkWrite(operations)
  }

  /**
   * Validate and transform data based on type
   */
  private static validateAndTransformData(dataType: string, data: any[]): any[] {
    return data.map(item => {
      switch (dataType) {
        case 'reviews':
          return this.validateReview(item)
        case 'posts':
          return this.validatePost(item)
        case 'insights':
          return this.validateInsight(item)
        case 'searchKeywords':
          return this.validateSearchKeyword(item)
        default:
          return item
      }
    })
  }

  /**
   * Validate review data
   */
  private static validateReview(review: any): any {
    return {
      id: review.id || `review-${Date.now()}-${Math.random()}`,
      locationId: review.locationId,
      reviewer: {
        displayName: review.reviewer?.displayName || 'Anonymous',
        profilePhotoUrl: review.reviewer?.profilePhotoUrl
      },
      starRating: Math.max(1, Math.min(5, review.starRating || 0)),
      comment: review.comment || '',
      createTime: review.createTime,
      updateTime: review.updateTime
    }
  }

  /**
   * Validate post data
   */
  private static validatePost(post: any): any {
    return {
      id: post.id || `post-${Date.now()}-${Math.random()}`,
      locationId: post.locationId,
      summary: post.summary || '',
      callToAction: post.callToAction,
      media: post.media || [],
      createTime: post.createTime,
      updateTime: post.updateTime,
      languageCode: post.languageCode || 'en',
      state: post.state || 'LIVE',
      topicType: post.topicType,
      event: post.event,
      searchUrl: post.searchUrl
    }
  }

  /**
   * Validate insight data
   */
  private static validateInsight(insight: any): any {
    return {
      locationId: insight.locationId,
      period: insight.period,
      queries: insight.queries || 0,
      views: insight.views || 0,
      actions: insight.actions || 0,
      photoViews: insight.photoViews || 0,
      callClicks: insight.callClicks || 0,
      websiteClicks: insight.websiteClicks || 0,
      businessBookings: insight.businessBookings || 0,
      businessFoodOrders: insight.businessFoodOrders || 0,
      businessMessages: insight.businessMessages || 0,
      desktopSearchImpressions: insight.desktopSearchImpressions || 0,
      mobileMapsImpressions: insight.mobileMapsImpressions || 0,
      dailyMetrics: insight.dailyMetrics || [],
      websiteClicksSeries: insight.websiteClicksSeries,
      callClicksSeries: insight.callClicksSeries
    }
  }

  /**
   * Validate search keyword data
   */
  private static validateSearchKeyword(keyword: any): any {
    return {
      locationId: keyword.locationId,
      keyword: keyword.keyword || '',
      impressions: keyword.impressions || 0,
      period: keyword.period,
      clicks: keyword.clicks || 0,
      ctr: keyword.ctr || 0,
      position: keyword.position || 0
    }
  }

  /**
   * Helper methods
   */
  private static async ensureBrand(accountData: any): Promise<any> {
    let brand = await Brand.findOne({ 
      $or: [
        { email: accountData.email },
        { 'users.owner.email': accountData.email }
      ]
    })
    
    if (!brand) {
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
            password: 'gmb-auto-generated',
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
      await Brand.findByIdAndUpdate(brand._id, {
        'settings.gmbIntegration.connected': true,
        'settings.gmbIntegration.gmbAccountId': accountData.id,
        'settings.gmbIntegration.gmbAccountName': accountData.name,
        'settings.gmbIntegration.lastSyncAt': new Date()
      })
    }
    
    return brand
  }

  private static async getStoreIdByLocationId(locationId: string, brandId: string, locationData?: any): Promise<string> {
    await connectDB()
    
    let store = await Store.findOne({ gmbLocationId: locationId, brandId })
    
    if (!store) {
      console.log(`⚠️ Store not found for location ${locationId}, creating new store...`)
      
      // Try to find by brandId only to get brand info
      const brand = await Brand.findById(brandId)
      if (!brand) {
        throw new Error(`Brand not found: ${brandId}`)
      }
      
      // Extract location name from locationData if available
      let storeName = `Store ${locationId}`
      if (locationData?.name) {
        // locationData.name might be the full path, extract just the business name
        if (locationData.name.includes('locations/')) {
          // If it's a path, try to get the title from the location data
          storeName = locationData.title || locationData.name || `Store ${locationId}`
        } else {
          storeName = locationData.name
        }
      }
      
      // Generate a clean store code and slug
      const cleanName = storeName.replace(/[^a-zA-Z0-9\s]/g, '').trim()
      const storeCode = cleanName.replace(/\s+/g, '-').toUpperCase().slice(0, 20)
      const baseSlug = cleanName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 30)
      
      // Ensure unique slug
      let slug = baseSlug
      let counter = 1
      while (await Store.findOne({ slug })) {
        slug = `${baseSlug}-${counter}`
        counter++
      }
      
      // Create a new store for this location
      store = await Store.create({
        brandId: brandId,
        name: storeName,
        storeCode: storeCode,
        slug: slug,
        email: brand.email,
        phone: locationData?.phoneNumber || brand.phone || '',
        address: {
          line1: locationData?.address || 'Address not available',
          locality: 'Unknown',
          city: 'Unknown',
          state: 'Unknown',
          postalCode: '00000',
          countryCode: 'US'
        },
        primaryCategory: locationData?.categories?.[0] || 'Business',
        gmbLocationId: locationId,
        gmbAccountId: brand.settings?.gmbIntegration?.gmbAccountId || '',
        verified: locationData?.verified || false,
        status: 'active'
      })
      
      console.log(`✅ Created new store "${storeName}" for location ${locationId}: ${store._id}`)
    }
    
    return (store._id as any).toString()
  }

  private static createBatches<T>(array: T[], batchSize: number): T[][] {
    const batches: T[][] = []
    for (let i = 0; i < array.length; i += batchSize) {
      batches.push(array.slice(i, i + batchSize))
    }
    return batches
  }

  private static async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  private static async createCheckpoint(
    syncState: SyncState,
    step: string,
    dataType: string,
    dataCount: number
  ): Promise<void> {
    const checkpoint: SyncCheckpoint = {
      step,
      dataType,
      dataCount,
      timestamp: new Date(),
      status: 'completed'
    }
    
    syncState.checkpoints.push(checkpoint)
    await this.updateSyncState(syncState)
  }

  public static async saveSyncState(syncState: SyncState): Promise<void> {
    try {
      await connectDB()
      
      // Create a simple sync state collection for tracking
      const SyncStateModel = mongoose.models.SyncState || mongoose.model('SyncState', new mongoose.Schema({
        id: { type: String, required: true, unique: true },
        brandId: { type: String, required: true },
        accountId: { type: String, required: true },
        status: { type: String, required: true },
        currentStep: { type: String, required: true },
        progress: {
          total: { type: Number, default: 0 },
          completed: { type: Number, default: 0 },
          percentage: { type: Number, default: 0 }
        },
        checkpoints: [{
          step: String,
          dataType: String,
          locationId: String,
          dataCount: Number,
          timestamp: Date,
          status: String,
          error: String
        }],
        errors: [{
          step: String,
          error: String,
          timestamp: Date,
          retryable: Boolean,
          retryCount: Number
        }],
        startedAt: { type: Date, required: true },
        lastUpdatedAt: { type: Date, required: true },
        completedAt: Date
      }))

      await SyncStateModel.findOneAndUpdate(
        { id: syncState.id },
        syncState,
        { upsert: true, new: true }
      )
      
      console.log('✅ Sync state saved to database:', syncState.id)
    } catch (error) {
      console.error('❌ Failed to save sync state:', error)
      throw error
    }
  }

  public static async updateSyncState(syncState: SyncState): Promise<void> {
    try {
      await connectDB()
      
      const SyncStateModel = mongoose.models.SyncState || mongoose.model('SyncState', new mongoose.Schema({
        id: { type: String, required: true, unique: true },
        brandId: { type: String, required: true },
        accountId: { type: String, required: true },
        status: { type: String, required: true },
        currentStep: { type: String, required: true },
        progress: {
          total: { type: Number, default: 0 },
          completed: { type: Number, default: 0 },
          percentage: { type: Number, default: 0 }
        },
        checkpoints: [{
          step: String,
          dataType: String,
          locationId: String,
          dataCount: Number,
          timestamp: Date,
          status: String,
          error: String
        }],
        errors: [{
          step: String,
          error: String,
          timestamp: Date,
          retryable: Boolean,
          retryCount: Number
        }],
        startedAt: { type: Date, required: true },
        lastUpdatedAt: { type: Date, required: true },
        completedAt: Date
      }))

      syncState.lastUpdatedAt = new Date()
      
      await SyncStateModel.findOneAndUpdate(
        { id: syncState.id },
        syncState,
        { upsert: true, new: true }
      )
      
      console.log('✅ Sync state updated in database:', syncState.id, syncState.status, `${syncState.progress.percentage}%`)
    } catch (error) {
      console.error('❌ Failed to update sync state:', error)
      throw error
    }
  }

  public static async loadSyncState(syncStateId: string): Promise<SyncState | null> {
    try {
      await connectDB()
      
      const SyncStateModel = mongoose.models.SyncState || mongoose.model('SyncState', new mongoose.Schema({
        id: { type: String, required: true, unique: true },
        brandId: { type: String, required: true },
        accountId: { type: String, required: true },
        status: { type: String, required: true },
        currentStep: { type: String, required: true },
        progress: {
          total: { type: Number, default: 0 },
          completed: { type: Number, default: 0 },
          percentage: { type: Number, default: 0 }
        },
        checkpoints: [{
          step: String,
          dataType: String,
          locationId: String,
          dataCount: Number,
          timestamp: Date,
          status: String,
          error: String
        }],
        errors: [{
          step: String,
          error: String,
          timestamp: Date,
          retryable: Boolean,
          retryCount: Number
        }],
        startedAt: { type: Date, required: true },
        lastUpdatedAt: { type: Date, required: true },
        completedAt: Date
      }))

      const syncState = await SyncStateModel.findOne({ id: syncStateId })
      
      if (syncState) {
        console.log('✅ Sync state loaded from database:', syncState.id, syncState.status, `${syncState.progress.percentage}%`)
        return syncState.toObject() as SyncState
      } else {
        console.log('⚠️ Sync state not found in database:', syncStateId)
        return null
      }
    } catch (error) {
      console.error('❌ Failed to load sync state:', error)
      return null
    }
  }
}
