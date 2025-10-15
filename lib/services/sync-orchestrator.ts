import { ImprovedSyncService, SyncState } from './improved-sync-service'
import { GmbParallelDataService } from './parallel-api-service'
import { DataPipelineService } from './data-pipeline'
import { GmbApiServerService } from '@/lib/server/gmb-api-server'

export interface SyncOrchestratorConfig {
  // Parallel processing
  maxConcurrentLocations: number
  batchSize: number
  
  // Data processing
  enableDataValidation: boolean
  enableDataTransformation: boolean
  enableDataEnrichment: boolean
  
  // Error handling
  maxRetries: number
  retryDelay: number
  circuitBreakerThreshold: number
  
  // Performance
  enableParallelProcessing: boolean
  enableBulkOperations: boolean
  enableProgressTracking: boolean
}

export interface SyncProgress {
  step: string
  progress: number
  total: number
  message: string
  dataType?: string
  locationId?: string
  errors?: string[]
  warnings?: string[]
}

export interface SyncResult {
  success: boolean
  syncState: SyncState
  stats: {
    totalLocations: number
    processedLocations: number
    totalReviews: number
    totalPosts: number
    totalInsights: number
    totalSearchKeywords: number
    errors: number
    warnings: number
    duration: number
  }
  errors: string[]
  warnings: string[]
}

/**
 * Main sync orchestrator that coordinates all sync operations
 */
export class SyncOrchestrator {
  private config: SyncOrchestratorConfig
  private dataPipeline: DataPipelineService
  private parallelDataService: GmbParallelDataService | null = null
  private syncState: SyncState | null = null
  private onProgress?: (progress: SyncProgress) => void

  constructor(config: Partial<SyncOrchestratorConfig> = {}) {
    this.config = {
      maxConcurrentLocations: 5,
      batchSize: 10,
      enableDataValidation: true,
      enableDataTransformation: true,
      enableDataEnrichment: true,
      maxRetries: 3,
      retryDelay: 1000,
      circuitBreakerThreshold: 5,
      enableParallelProcessing: true,
      enableBulkOperations: true,
      enableProgressTracking: true,
      ...config
    }

    this.dataPipeline = new DataPipelineService({
      validateData: this.config.enableDataValidation,
      transformData: this.config.enableDataTransformation,
      enrichData: this.config.enableDataEnrichment,
      maxErrors: 100,
      logLevel: 'info'
    })
  }

  /**
   * Start comprehensive sync process
   */
  async startSync(
    tokens: any,
    onProgress?: (progress: SyncProgress) => void
  ): Promise<SyncResult> {
    const startTime = Date.now()
    this.onProgress = onProgress

    try {
      // Step 1: Initialize sync state
      await this.updateProgress({
        step: 'initialization',
        progress: 0,
        total: 100,
        message: 'Initializing sync process...'
      })

      // Get account info
      const accountData = await this.getAccountInfo(tokens)
      this.syncState = await ImprovedSyncService.initializeSync(tokens, accountData)

      // Initialize parallel data service
      this.parallelDataService = new GmbParallelDataService(tokens, {
        maxConcurrent: this.config.maxConcurrentLocations,
        batchSize: this.config.batchSize,
        retryAttempts: this.config.maxRetries,
        retryDelay: this.config.retryDelay,
        timeout: 30000
      })

      // Step 2: Fetch locations
      await this.updateProgress({
        step: 'locations',
        progress: 10,
        total: 100,
        message: 'Fetching business locations...'
      })

      const locations = await this.fetchLocations(tokens)
      this.syncState.progress.total = locations.length
      await this.updateSyncState()

      // Step 3: Process locations
      await this.updateProgress({
        step: 'location_processing',
        progress: 20,
        total: 100,
        message: 'Processing locations...'
      })

      const results = await this.processLocations(locations)

      // Step 4: Finalize
      await this.updateProgress({
        step: 'finalization',
        progress: 90,
        total: 100,
        message: 'Finalizing sync...'
      })

      this.syncState.status = 'completed'
      this.syncState.completedAt = new Date()
      await this.updateSyncState()

      const duration = Date.now() - startTime

      return {
        success: true,
        syncState: this.syncState,
        stats: {
          totalLocations: locations.length,
          processedLocations: results.processedLocations,
          totalReviews: results.totalReviews,
          totalPosts: results.totalPosts,
          totalInsights: results.totalInsights,
          totalSearchKeywords: results.totalSearchKeywords,
          errors: results.errors,
          warnings: results.warnings,
          duration
        },
        errors: results.errorMessages,
        warnings: results.warningMessages
      }

    } catch (error) {
      console.error('Sync orchestrator failed:', error)
      
      if (this.syncState) {
        this.syncState.status = 'failed'
        this.syncState.errors.push({
          step: 'sync_orchestrator',
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date(),
          retryable: true,
          retryCount: 0
        })
        await this.updateSyncState()
      }

      return {
        success: false,
        syncState: this.syncState || {} as SyncState,
        stats: {
          totalLocations: 0,
          processedLocations: 0,
          totalReviews: 0,
          totalPosts: 0,
          totalInsights: 0,
          totalSearchKeywords: 0,
          errors: 1,
          warnings: 0,
          duration: Date.now() - startTime
        },
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        warnings: []
      }
    }
  }

  /**
   * Resume sync from checkpoint
   */
  async resumeSync(
    syncStateId: string,
    tokens: any,
    onProgress?: (progress: SyncProgress) => void
  ): Promise<SyncResult> {
    this.onProgress = onProgress

    try {
      // Load existing sync state
      this.syncState = await this.loadSyncState(syncStateId)
      
      if (!this.syncState) {
        throw new Error(`Sync state not found: ${syncStateId}`)
      }

      // Resume from last checkpoint
      return await this.startSync(tokens, onProgress)

    } catch (error) {
      console.error('Resume sync failed:', error)
      throw error
    }
  }

  /**
   * Get account information
   */
  private async getAccountInfo(tokens: any): Promise<any> {
    const { googleOAuthServerClient } = await import('@/lib/server/google-oauth-server')
    googleOAuthServerClient.setCredentials(tokens)
    
    const oauth2 = (await import('googleapis')).google.oauth2({
      version: 'v2',
      auth: googleOAuthServerClient.getAuthClient()
    })
    
    const accountInfo = await oauth2.userinfo.get()
    return {
      id: accountInfo.data.id,
      name: accountInfo.data.name,
      email: accountInfo.data.email,
      connectedAt: new Date().toISOString()
    }
  }

  /**
   * Fetch locations from GMB
   */
  private async fetchLocations(tokens: any): Promise<any[]> {
    const gmbService = new GmbApiServerService(tokens)
    const accounts = await gmbService.getAccounts()
    
    let allLocations: any[] = []
    for (const account of accounts) {
      const locations = await gmbService.getLocations(account.name)
      allLocations = [...allLocations, ...locations]
    }
    
    return allLocations
  }

  /**
   * Process all locations with parallel data fetching
   */
  private async processLocations(locations: any[]): Promise<{
    processedLocations: number
    totalReviews: number
    totalPosts: number
    totalInsights: number
    totalSearchKeywords: number
    errors: number
    warnings: number
    errorMessages: string[]
    warningMessages: string[]
  }> {
    if (!this.parallelDataService) {
      throw new Error('Parallel data service not initialized')
    }

    let processedLocations = 0
    let totalReviews = 0
    let totalPosts = 0
    let totalInsights = 0
    let totalSearchKeywords = 0
    let errors = 0
    let warnings = 0
    const errorMessages: string[] = []
    const warningMessages: string[] = []

    // Create a map of locationId to location data for easy lookup
    const locationMap = new Map<string, any>()
    locations.forEach(location => {
      locationMap.set(location.id, location)
    })

    try {
      // Fetch all data types in parallel
      const allData = await this.parallelDataService.fetchAllDataForLocations(
        locations,
        (completed, total, dataType) => {
          this.updateProgress({
            step: 'data_fetching',
            progress: 20 + (completed / total) * 50,
            total: 100,
            message: `Fetching ${dataType}... (${completed}/${total})`,
            dataType
          })
        }
      )

      // Process each data type
      for (const [locationId, reviewResult] of allData.reviews) {
        if (reviewResult.success && reviewResult.data) {
          const processedReviews = await this.dataPipeline.processReviews(
            reviewResult.data,
            locationId
          )
          
          const successfulReviews = processedReviews.filter(r => r.success)
          totalReviews += successfulReviews.length
          
          // Count errors and warnings
          processedReviews.forEach(result => {
            if (result.errors) {
              errors += result.errors.length
              errorMessages.push(...result.errors)
            }
            if (result.warnings) {
              warnings += result.warnings.length
              warningMessages.push(...result.warnings)
            }
          })

          // Save to database
          if (successfulReviews.length > 0) {
            const locationData = locationMap.get(locationId)
            await this.saveDataBatch('reviews', successfulReviews.map(r => r.data), locationId, locationData)
          }
        }
        processedLocations++
      }

      for (const [locationId, postResult] of allData.posts) {
        if (postResult.success && postResult.data) {
          const processedPosts = await this.dataPipeline.processPosts(
            postResult.data,
            locationId
          )
          
          const successfulPosts = processedPosts.filter(p => p.success)
          totalPosts += successfulPosts.length
          
          // Count errors and warnings
          processedPosts.forEach(result => {
            if (result.errors) {
              errors += result.errors.length
              errorMessages.push(...result.errors)
            }
            if (result.warnings) {
              warnings += result.warnings.length
              warningMessages.push(...result.warnings)
            }
          })

          // Save to database
          if (successfulPosts.length > 0) {
            const locationData = locationMap.get(locationId)
            await this.saveDataBatch('posts', successfulPosts.map(p => p.data), locationId, locationData)
          }
        }
      }

      for (const [locationId, insightResult] of allData.insights) {
        if (insightResult.success && insightResult.data) {
          const processedInsights = await this.dataPipeline.processInsights(
            [insightResult.data],
            locationId
          )
          
          const successfulInsights = processedInsights.filter(i => i.success)
          totalInsights += successfulInsights.length
          
          // Count errors and warnings
          processedInsights.forEach(result => {
            if (result.errors) {
              errors += result.errors.length
              errorMessages.push(...result.errors)
            }
            if (result.warnings) {
              warnings += result.warnings.length
              warningMessages.push(...result.warnings)
            }
          })

          // Save to database
          if (successfulInsights.length > 0) {
            const locationData = locationMap.get(locationId)
            await this.saveDataBatch('insights', successfulInsights.map(i => i.data), locationId, locationData)
          }
        }
      }

      for (const [locationId, keywordResult] of allData.searchKeywords) {
        if (keywordResult.success && keywordResult.data) {
          const processedKeywords = await this.dataPipeline.processSearchKeywords(
            keywordResult.data,
            locationId
          )
          
          const successfulKeywords = processedKeywords.filter(k => k.success)
          totalSearchKeywords += successfulKeywords.length
          
          // Count errors and warnings
          processedKeywords.forEach(result => {
            if (result.errors) {
              errors += result.errors.length
              errorMessages.push(...result.errors)
            }
            if (result.warnings) {
              warnings += result.warnings.length
              warningMessages.push(...result.warnings)
            }
          })

          // Save to database
          if (successfulKeywords.length > 0) {
            const locationData = locationMap.get(locationId)
            await this.saveDataBatch('searchKeywords', successfulKeywords.map(k => k.data), locationId, locationData)
          }
        }
      }

    } catch (error) {
      console.error('Error processing locations:', error)
      errorMessages.push(error instanceof Error ? error.message : 'Unknown error')
      errors++
    }

    return {
      processedLocations,
      totalReviews,
      totalPosts,
      totalInsights,
      totalSearchKeywords,
      errors,
      warnings,
      errorMessages,
      warningMessages
    }
  }

  /**
   * Save data batch to database using ImprovedSyncService
   */
  private async saveDataBatch(dataType: string, data: any[], locationId: string, locationData?: any): Promise<void> {
    try {
      if (!this.syncState) {
        throw new Error('Sync state not initialized')
      }

      console.log(`💾 Saving ${data.length} ${dataType} records for location ${locationId}`)
      
      // Add locationId to each data item for proper store association
      const dataWithLocation = data.map(item => ({
        ...item,
        locationId: locationId
      }))
      
      // Use the actual ImprovedSyncService to save data with location data for proper store naming
      await ImprovedSyncService.saveDataBatch(dataType, dataWithLocation, this.syncState, locationData)
      
      console.log(`✅ Successfully saved ${data.length} ${dataType} records for location ${locationId}`)
      
    } catch (error) {
      console.error(`❌ Failed to save ${dataType} batch for location ${locationId}:`, error)
      throw error
    }
  }

  /**
   * Update progress callback
   */
  private async updateProgress(progress: SyncProgress): Promise<void> {
    if (this.onProgress) {
      this.onProgress(progress)
    }
  }

  /**
   * Update sync state using ImprovedSyncService
   */
  private async updateSyncState(): Promise<void> {
    if (this.syncState) {
      this.syncState.lastUpdatedAt = new Date()
      // Use ImprovedSyncService to update sync state in database
      await ImprovedSyncService.updateSyncState(this.syncState)
      console.log('✅ Updated sync state:', this.syncState.id, this.syncState.status, `${this.syncState.progress.percentage}%`)
    }
  }

  /**
   * Load sync state from database using ImprovedSyncService
   */
  private async loadSyncState(syncStateId: string): Promise<SyncState | null> {
    try {
      // Use ImprovedSyncService to load sync state from database
      const syncState = await ImprovedSyncService.loadSyncState(syncStateId)
      if (syncState) {
        console.log('✅ Loaded sync state:', syncState.id, syncState.status, `${syncState.progress.percentage}%`)
      } else {
        console.log('⚠️ Sync state not found:', syncStateId)
      }
      return syncState
    } catch (error) {
      console.error('❌ Failed to load sync state:', error)
    return null
    }
  }

  /**
   * Get orchestrator statistics
   */
  getStats(): {
    config: SyncOrchestratorConfig
    dataPipelineStats: any
    parallelServiceStats: any
  } {
    return {
      config: this.config,
      dataPipelineStats: this.dataPipeline.getStats(),
      parallelServiceStats: this.parallelDataService?.getStats() || null
    }
  }
}


