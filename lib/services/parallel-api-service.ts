import { GmbApiServerService } from '@/lib/server/gmb-api-server'

export interface ParallelApiConfig {
  maxConcurrent: number
  batchSize: number
  retryAttempts: number
  retryDelay: number
  timeout: number
}

export interface ApiCallResult<T> {
  success: boolean
  data?: T
  error?: string
  locationId?: string
  dataType?: string
  duration?: number
}

export class ParallelApiService {
  private config: ParallelApiConfig
  private activeRequests = 0
  private requestQueue: Array<() => Promise<void>> = []
  private results: Map<string, ApiCallResult<any>> = new Map()

  constructor(config: Partial<ParallelApiConfig> = {}) {
    this.config = {
      maxConcurrent: 5,
      batchSize: 10,
      retryAttempts: 3,
      retryDelay: 1000,
      timeout: 30000,
      ...config
    }
  }

  /**
   * Process multiple locations in parallel with controlled concurrency
   */
  async processLocationsInParallel<T>(
    locations: any[],
    processor: (location: any) => Promise<T>,
    onProgress?: (completed: number, total: number) => void
  ): Promise<Map<string, ApiCallResult<T>>> {
    const results = new Map<string, ApiCallResult<T>>()
    const batches = this.createBatches(locations, this.config.batchSize)
    
    for (const batch of batches) {
      const batchResults = await this.processBatch(batch, processor)
      
      // Merge results
      for (const [key, result] of batchResults) {
        results.set(key, result)
      }
      
      // Update progress
      onProgress?.(results.size, locations.length)
    }
    
    return results
  }

  /**
   * Process a batch of locations with controlled concurrency
   */
  private async processBatch<T>(
    locations: any[],
    processor: (location: any) => Promise<T>
  ): Promise<Map<string, ApiCallResult<T>>> {
    const results = new Map<string, ApiCallResult<T>>()
    const promises: Promise<void>[] = []
    
    for (const location of locations) {
      const promise = this.processLocationWithRetry(location, processor, results)
      promises.push(promise)
      
      // Control concurrency
      if (promises.length >= this.config.maxConcurrent) {
        await Promise.allSettled(promises)
        promises.length = 0
      }
    }
    
    // Wait for remaining promises
    if (promises.length > 0) {
      await Promise.allSettled(promises)
    }
    
    return results
  }

  /**
   * Process individual location with retry logic
   */
  private async processLocationWithRetry<T>(
    location: any,
    processor: (location: any) => Promise<T>,
    results: Map<string, ApiCallResult<T>>
  ): Promise<void> {
    const locationId = location.id
    let lastError: Error | null = null
    
    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      const startTime = Date.now()
      
      try {
        const data = await this.executeWithTimeout(
          processor(location),
          this.config.timeout
        )
        
        const duration = Date.now() - startTime
        results.set(locationId, {
          success: true,
          data,
          locationId,
          duration
        })
        
        return
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error')
        
        if (attempt < this.config.retryAttempts) {
          const delay = this.config.retryDelay * Math.pow(2, attempt - 1)
          console.warn(`Attempt ${attempt} failed for location ${locationId}, retrying in ${delay}ms:`, lastError.message)
          await this.delay(delay)
        }
      }
    }
    
    // All retries failed
    results.set(locationId, {
      success: false,
      error: lastError?.message || 'Unknown error',
      locationId
    })
  }

  /**
   * Execute function with timeout
   */
  private async executeWithTimeout<T>(
    promise: Promise<T>,
    timeout: number
  ): Promise<T> {
    return Promise.race([
      promise,
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Operation timeout')), timeout)
      )
    ])
  }

  /**
   * Create batches from array
   */
  private createBatches<T>(array: T[], batchSize: number): T[][] {
    const batches: T[][] = []
    for (let i = 0; i < array.length; i += batchSize) {
      batches.push(array.slice(i, i + batchSize))
    }
    return batches
  }

  /**
   * Delay utility
   */
  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Get processing statistics
   */
  getStats(): {
    totalRequests: number
    successfulRequests: number
    failedRequests: number
    averageDuration: number
  } {
    const results = Array.from(this.results.values())
    const successful = results.filter(r => r.success)
    const failed = results.filter(r => !r.success)
    const durations = successful.map(r => r.duration || 0)
    const averageDuration = durations.length > 0 
      ? durations.reduce((a, b) => a + b, 0) / durations.length 
      : 0

    return {
      totalRequests: results.length,
      successfulRequests: successful.length,
      failedRequests: failed.length,
      averageDuration
    }
  }
}

/**
 * Specialized service for GMB data fetching with parallel processing
 */
export class GmbParallelDataService {
  private parallelApiService: ParallelApiService
  private gmbService: GmbApiServerService

  constructor(tokens: any, config?: Partial<ParallelApiConfig>) {
    this.gmbService = new GmbApiServerService(tokens)
    this.parallelApiService = new ParallelApiService(config)
  }

  /**
   * Fetch all data types for multiple locations in parallel
   */
  async fetchAllDataForLocations(
    locations: any[],
    onProgress?: (completed: number, total: number, dataType: string) => void
  ): Promise<{
    posts: Map<string, ApiCallResult<any>>
    insights: Map<string, ApiCallResult<any>>
    searchKeywords: Map<string, ApiCallResult<any>>
    reviews: Map<string, ApiCallResult<any>>
    performanceData: Map<string, ApiCallResult<any>>
  }> {
    const endDate = new Date().toISOString()
    const startDate = new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString()

    // First process posts/insights/keywords in parallel
    const [posts, insights, searchKeywords] = await Promise.all([
      this.fetchPostsForLocations(locations, onProgress),
      this.fetchInsightsForLocations(locations, startDate, endDate, onProgress),
      this.fetchSearchKeywordsForLocations(locations, onProgress)
    ])

    // Fetch performance data for multiple date ranges (7, 30, 90, 180 days)
    const performanceData = await this.fetchPerformanceDataForMultipleRanges(locations, onProgress)

    // Then fetch reviews last
    const reviews = await this.fetchReviewsForLocations(locations, onProgress)

    return {
      posts,
      insights,
      searchKeywords,
      reviews,
      performanceData
    }
  }

  /**
   * Fetch reviews for multiple locations
   */
  private async fetchReviewsForLocations(
    locations: any[],
    onProgress?: (completed: number, total: number, dataType: string) => void
  ): Promise<Map<string, ApiCallResult<any>>> {
    return this.parallelApiService.processLocationsInParallel(
      locations,
      async (location) => {
        try {
          return await this.gmbService.getReviews(location.id)
        } catch (error) {
          // Handle specific GMB API errors
          if (error instanceof Error && error.message.includes('Reviews API not available')) {
            return [] // Return empty array for unavailable API
          }
          throw error
        }
      },
      (completed, total) => onProgress?.(completed, total, 'reviews')
    )
  }

  /**
   * Fetch posts for multiple locations
   */
  private async fetchPostsForLocations(
    locations: any[],
    onProgress?: (completed: number, total: number, dataType: string) => void
  ): Promise<Map<string, ApiCallResult<any>>> {
    return this.parallelApiService.processLocationsInParallel(
      locations,
      async (location) => {
        try {
          return await this.gmbService.getPosts(location.id)
        } catch (error) {
          // Handle specific GMB API errors
          if (error instanceof Error && error.message.includes('Posts API not available')) {
            return [] // Return empty array for unavailable API
          }
          throw error
        }
      },
      (completed, total) => onProgress?.(completed, total, 'posts')
    )
  }

  /**
   * Fetch insights for multiple locations
   */
  private async fetchInsightsForLocations(
    locations: any[],
    startDate: string,
    endDate: string,
    onProgress?: (completed: number, total: number, dataType: string) => void
  ): Promise<Map<string, ApiCallResult<any>>> {
    return this.parallelApiService.processLocationsInParallel(
      locations,
      async (location) => {
        try {
          return await this.gmbService.getInsights(location.id, startDate, endDate)
        } catch (error) {
          // Handle specific GMB API errors
          if (error instanceof Error && error.message.includes('Insights API not available')) {
            return null // Return null for unavailable API
          }
          throw error
        }
      },
      (completed, total) => onProgress?.(completed, total, 'insights')
    )
  }

  /**
   * Fetch search keywords for multiple locations
   */
  private async fetchSearchKeywordsForLocations(
    locations: any[],
    onProgress?: (completed: number, total: number, dataType: string) => void
  ): Promise<Map<string, ApiCallResult<any>>> {
    return this.parallelApiService.processLocationsInParallel(
      locations,
      async (location) => {
        try {
          const currentDate = new Date()
          const threeMonthsAgo = new Date(currentDate.getFullYear(), currentDate.getMonth() - 3, 1)
          
          return await this.gmbService.getSearchKeywords(
            location.id,
            threeMonthsAgo.getFullYear(),
            threeMonthsAgo.getMonth() + 1,
            currentDate.getFullYear(),
            currentDate.getMonth() + 1
          )
        } catch (error) {
          // Handle specific GMB API errors
          if (error instanceof Error && error.message.includes('Search keywords API not available')) {
            return [] // Return empty array for unavailable API
          }
          throw error
        }
      },
      (completed, total) => onProgress?.(completed, total, 'searchKeywords')
    )
  }

  /**
   * Fetch performance data for multiple date ranges (7, 30, 90, 180 days)
   */
  private async fetchPerformanceDataForMultipleRanges(
    locations: any[],
    onProgress?: (completed: number, total: number, dataType: string) => void
  ): Promise<Map<string, ApiCallResult<any>>> {
    const dateRanges = [
      { days: 7, label: '7 days' },
      { days: 30, label: '30 days' },
      { days: 60, label: '60 days' },
      { days: 90, label: '90 days' }
    ]

    const endDate = new Date()
    const performanceDataMap = new Map<string, ApiCallResult<any>>()

    // Process each location
    for (let i = 0; i < locations.length; i++) {
      const location = locations[i]
      const locationPerformanceData: any = {
        locationId: location.id,
        dateRanges: {}
      }

      try {
        // Fetch performance data for each date range
        for (const range of dateRanges) {
          const startDate = new Date()
          startDate.setDate(startDate.getDate() - range.days)
          
          try {
            const insights = await this.gmbService.getInsights(
              location.id,
              startDate.toISOString(),
              endDate.toISOString()
            )
            
            if (insights) {
              locationPerformanceData.dateRanges[range.label] = {
                days: range.days,
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
                data: insights
              }
            }
          } catch (error) {
            console.warn(`Failed to fetch ${range.label} performance data for ${location.id}:`, error)
            locationPerformanceData.dateRanges[range.label] = {
              days: range.days,
              startDate: startDate.toISOString(),
              endDate: endDate.toISOString(),
              error: error instanceof Error ? error.message : 'Unknown error'
            }
          }
        }

        performanceDataMap.set(location.id, {
          success: true,
          data: locationPerformanceData
        })

      } catch (error) {
        console.error(`Failed to fetch performance data for location ${location.id}:`, error)
        performanceDataMap.set(location.id, {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          data: null
        })
      }

      // Update progress
      onProgress?.(i + 1, locations.length, 'performance')
    }

    return performanceDataMap
  }

  /**
   * Get processing statistics
   */
  getStats() {
    return this.parallelApiService.getStats()
  }
}




