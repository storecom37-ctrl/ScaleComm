import { z } from 'zod'

// Data validation schemas
export const GmbReviewSchema = z.object({
  id: z.string().min(1),
  locationId: z.string().min(1),
  reviewer: z.object({
    displayName: z.string().min(1),
    profilePhotoUrl: z.string().url().optional()
  }),
  starRating: z.number().min(1).max(5),
  comment: z.string().optional(),
  createTime: z.string().datetime(),
  updateTime: z.string().datetime()
})

export const GmbPostSchema = z.object({
  id: z.string().min(1),
  locationId: z.string().min(1),
  summary: z.string().optional(),
  callToAction: z.object({
    actionType: z.string(),
    url: z.string().url().optional()
  }).optional(),
  media: z.array(z.object({
    mediaFormat: z.string(),
    sourceUrl: z.string().url()
  })).optional(),
  createTime: z.string().datetime(),
  updateTime: z.string().datetime(),
  languageCode: z.string().optional(),
  state: z.string().optional(),
  topicType: z.string().optional(),
  event: z.any().optional(),
  searchUrl: z.string().url().optional()
})

export const GmbInsightSchema = z.object({
  locationId: z.string().min(1),
  period: z.object({
    startTime: z.string().datetime(),
    endTime: z.string().datetime()
  }),
  queries: z.number().min(0),
  views: z.number().min(0),
  actions: z.number().min(0),
  photoViews: z.number().min(0),
  callClicks: z.number().min(0),
  websiteClicks: z.number().min(0),
  businessBookings: z.number().min(0),
  businessFoodOrders: z.number().min(0),
  businessMessages: z.number().min(0),
  desktopSearchImpressions: z.number().min(0),
  mobileMapsImpressions: z.number().min(0),
  dailyMetrics: z.array(z.any()).optional(),
  websiteClicksSeries: z.any().optional(),
  callClicksSeries: z.any().optional()
})

export const GmbSearchKeywordSchema = z.object({
  locationId: z.string().min(1),
  keyword: z.string().min(1),
  impressions: z.number().min(0),
  period: z.object({
    year: z.number().min(2000).max(3000),
    month: z.number().min(1).max(12)
  }),
  clicks: z.number().min(0).optional(),
  ctr: z.number().min(0).max(1).optional(),
  position: z.number().min(0).optional()
})

export const GmbLocationSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  address: z.string(),
  phoneNumber: z.string().optional(),
  websiteUrl: z.string().url().optional(),
  categories: z.array(z.string()),
  verified: z.boolean(),
  accountId: z.string().min(1)
})

// Data transformation interfaces
export interface DataTransformationResult<T> {
  success: boolean
  data?: T
  errors?: string[]
  warnings?: string[]
}

export interface PipelineConfig {
  validateData: boolean
  transformData: boolean
  sanitizeData: boolean
  enrichData: boolean
  maxErrors: number
  logLevel: 'error' | 'warn' | 'info' | 'debug'
}

/**
 * Data Pipeline Service for validation, transformation, and enrichment
 */
export class DataPipelineService {
  private config: PipelineConfig
  private errors: string[] = []
  private warnings: string[] = []

  constructor(config: Partial<PipelineConfig> = {}) {
    this.config = {
      validateData: true,
      transformData: true,
      sanitizeData: true,
      enrichData: true,
      maxErrors: 100,
      logLevel: 'info',
      ...config
    }
  }

  /**
   * Process reviews through the pipeline
   */
  async processReviews(
    reviews: any[],
    locationId: string
  ): Promise<DataTransformationResult<any>[]> {
    const results: DataTransformationResult<any>[] = []
    
    for (const review of reviews) {
      try {
        const result = await this.processReview(review, locationId)
        results.push(result)
        
        if (result.errors && result.errors.length > 0) {
          this.errors.push(...result.errors)
        }
        if (result.warnings && result.warnings.length > 0) {
          this.warnings.push(...result.warnings)
        }
        
        // Stop if too many errors
        if (this.errors.length >= this.config.maxErrors) {
          this.log('error', `Too many errors (${this.errors.length}), stopping processing`)
          break
        }
      } catch (error) {
        const errorMessage = `Failed to process review: ${error instanceof Error ? error.message : 'Unknown error'}`
        this.errors.push(errorMessage)
        results.push({
          success: false,
          errors: [errorMessage]
        })
      }
    }
    
    return results
  }

  /**
   * Process posts through the pipeline
   */
  async processPosts(
    posts: any[],
    locationId: string
  ): Promise<DataTransformationResult<any>[]> {
    const results: DataTransformationResult<any>[] = []
    
    for (const post of posts) {
      try {
        const result = await this.processPost(post, locationId)
        results.push(result)
        
        if (result.errors && result.errors.length > 0) {
          this.errors.push(...result.errors)
        }
        if (result.warnings && result.warnings.length > 0) {
          this.warnings.push(...result.warnings)
        }
      } catch (error) {
        const errorMessage = `Failed to process post: ${error instanceof Error ? error.message : 'Unknown error'}`
        this.errors.push(errorMessage)
        results.push({
          success: false,
          errors: [errorMessage]
        })
      }
    }
    
    return results
  }

  /**
   * Process insights through the pipeline
   */
  async processInsights(
    insights: any[],
    locationId: string
  ): Promise<DataTransformationResult<any>[]> {
    const results: DataTransformationResult<any>[] = []
    
    for (const insight of insights) {
      try {
        const result = await this.processInsight(insight, locationId)
        results.push(result)
        
        if (result.errors && result.errors.length > 0) {
          this.errors.push(...result.errors)
        }
        if (result.warnings && result.warnings.length > 0) {
          this.warnings.push(...result.warnings)
        }
      } catch (error) {
        const errorMessage = `Failed to process insight: ${error instanceof Error ? error.message : 'Unknown error'}`
        this.errors.push(errorMessage)
        results.push({
          success: false,
          errors: [errorMessage]
        })
      }
    }
    
    return results
  }

  /**
   * Process search keywords through the pipeline
   */
  async processSearchKeywords(
    keywords: any[],
    locationId: string
  ): Promise<DataTransformationResult<any>[]> {
    const results: DataTransformationResult<any>[] = []
    
    for (const keyword of keywords) {
      try {
        const result = await this.processSearchKeyword(keyword, locationId)
        results.push(result)
        
        if (result.errors && result.errors.length > 0) {
          this.errors.push(...result.errors)
        }
        if (result.warnings && result.warnings.length > 0) {
          this.warnings.push(...result.warnings)
        }
      } catch (error) {
        const errorMessage = `Failed to process search keyword: ${error instanceof Error ? error.message : 'Unknown error'}`
        this.errors.push(errorMessage)
        results.push({
          success: false,
          errors: [errorMessage]
        })
      }
    }
    
    return results
  }

  /**
   * Process individual review
   */
  private async processReview(
    review: any,
    locationId: string
  ): Promise<DataTransformationResult<any>> {
    const errors: string[] = []
    const warnings: string[] = []
    
    try {
      // Step 1: Sanitize data
      const sanitized = this.sanitizeReview(review)
      
      // Step 2: Transform data
      const transformed = this.transformReview(sanitized, locationId)
      
      // Step 3: Validate data
      if (this.config.validateData) {
        const validation = this.validateReview(transformed)
        if (!validation.success) {
          errors.push(...validation.errors || [])
          return { success: false, errors }
        }
      }
      
      // Step 4: Enrich data
      const enriched = this.enrichReview(transformed)
      
      return {
        success: true,
        data: enriched,
        warnings: warnings.length > 0 ? warnings : undefined
      }
    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      }
    }
  }

  /**
   * Process individual post
   */
  private async processPost(
    post: any,
    locationId: string
  ): Promise<DataTransformationResult<any>> {
    const errors: string[] = []
    const warnings: string[] = []
    
    try {
      // Step 1: Sanitize data
      const sanitized = this.sanitizePost(post)
      
      // Step 2: Transform data
      const transformed = this.transformPost(sanitized, locationId)
      
      // Step 3: Validate data
      if (this.config.validateData) {
        const validation = this.validatePost(transformed)
        if (!validation.success) {
          errors.push(...validation.errors || [])
          return { success: false, errors }
        }
      }
      
      // Step 4: Enrich data
      const enriched = this.enrichPost(transformed)
      
      return {
        success: true,
        data: enriched,
        warnings: warnings.length > 0 ? warnings : undefined
      }
    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      }
    }
  }

  /**
   * Process individual insight
   */
  private async processInsight(
    insight: any,
    locationId: string
  ): Promise<DataTransformationResult<any>> {
    const errors: string[] = []
    const warnings: string[] = []
    
    try {
      // Step 1: Sanitize data
      const sanitized = this.sanitizeInsight(insight)
      
      // Step 2: Transform data
      const transformed = this.transformInsight(sanitized, locationId)
      
      // Step 3: Validate data
      if (this.config.validateData) {
        const validation = this.validateInsight(transformed)
        if (!validation.success) {
          errors.push(...validation.errors || [])
          return { success: false, errors }
        }
      }
      
      // Step 4: Enrich data
      const enriched = this.enrichInsight(transformed)
      
      return {
        success: true,
        data: enriched,
        warnings: warnings.length > 0 ? warnings : undefined
      }
    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      }
    }
  }

  /**
   * Process individual search keyword
   */
  private async processSearchKeyword(
    keyword: any,
    locationId: string
  ): Promise<DataTransformationResult<any>> {
    const errors: string[] = []
    const warnings: string[] = []
    
    try {
      // Step 1: Sanitize data
      const sanitized = this.sanitizeSearchKeyword(keyword)
      
      // Step 2: Transform data
      const transformed = this.transformSearchKeyword(sanitized, locationId)
      
      // Step 3: Validate data
      if (this.config.validateData) {
        const validation = this.validateSearchKeyword(transformed)
        if (!validation.success) {
          errors.push(...validation.errors || [])
          return { success: false, errors }
        }
      }
      
      // Step 4: Enrich data
      const enriched = this.enrichSearchKeyword(transformed)
      
      return {
        success: true,
        data: enriched,
        warnings: warnings.length > 0 ? warnings : undefined
      }
    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      }
    }
  }

  // Sanitization methods
  private sanitizeReview(review: any): any {
    return {
      id: this.sanitizeString(review.id),
      locationId: this.sanitizeString(review.locationId),
      reviewer: {
        displayName: this.sanitizeString(review.reviewer?.displayName),
        profilePhotoUrl: this.sanitizeUrl(review.reviewer?.profilePhotoUrl)
      },
      starRating: this.sanitizeNumber(review.starRating, 1, 5),
      comment: this.sanitizeString(review.comment),
      createTime: this.sanitizeDateTime(review.createTime),
      updateTime: this.sanitizeDateTime(review.updateTime)
    }
  }

  private sanitizePost(post: any): any {
    return {
      id: this.sanitizeString(post.id),
      locationId: this.sanitizeString(post.locationId),
      summary: this.sanitizeString(post.summary),
      callToAction: post.callToAction ? {
        actionType: this.sanitizeString(post.callToAction.actionType),
        url: this.sanitizeUrl(post.callToAction.url)
      } : undefined,
      media: post.media ? post.media.map((m: any) => ({
        mediaFormat: this.sanitizeString(m.mediaFormat),
        sourceUrl: this.sanitizeUrl(m.sourceUrl)
      })) : [],
      createTime: this.sanitizeDateTime(post.createTime),
      updateTime: this.sanitizeDateTime(post.updateTime),
      languageCode: this.sanitizeString(post.languageCode) || 'en',
      state: this.sanitizeString(post.state) || 'LIVE',
      topicType: this.sanitizeString(post.topicType),
      event: post.event,
      searchUrl: this.sanitizeUrl(post.searchUrl)
    }
  }

  private sanitizeInsight(insight: any): any {
    return {
      locationId: this.sanitizeString(insight.locationId),
      period: {
        startTime: this.sanitizeDateTime(insight.period?.startTime),
        endTime: this.sanitizeDateTime(insight.period?.endTime)
      },
      queries: this.sanitizeNumber(insight.queries, 0),
      views: this.sanitizeNumber(insight.views, 0),
      actions: this.sanitizeNumber(insight.actions, 0),
      photoViews: this.sanitizeNumber(insight.photoViews, 0),
      callClicks: this.sanitizeNumber(insight.callClicks, 0),
      websiteClicks: this.sanitizeNumber(insight.websiteClicks, 0),
      businessBookings: this.sanitizeNumber(insight.businessBookings, 0),
      businessFoodOrders: this.sanitizeNumber(insight.businessFoodOrders, 0),
      businessMessages: this.sanitizeNumber(insight.businessMessages, 0),
      desktopSearchImpressions: this.sanitizeNumber(insight.desktopSearchImpressions, 0),
      mobileMapsImpressions: this.sanitizeNumber(insight.mobileMapsImpressions, 0),
      dailyMetrics: insight.dailyMetrics || [],
      websiteClicksSeries: insight.websiteClicksSeries,
      callClicksSeries: insight.callClicksSeries
    }
  }

  private sanitizeSearchKeyword(keyword: any): any {
    return {
      locationId: this.sanitizeString(keyword.locationId),
      keyword: this.sanitizeString(keyword.keyword),
      impressions: this.sanitizeNumber(keyword.impressions, 0),
      period: {
        year: this.sanitizeNumber(keyword.period?.year, 2000, 3000),
        month: this.sanitizeNumber(keyword.period?.month, 1, 12)
      },
      clicks: this.sanitizeNumber(keyword.clicks, 0),
      ctr: this.sanitizeNumber(keyword.ctr, 0, 1),
      position: this.sanitizeNumber(keyword.position, 0)
    }
  }

  // Transformation methods
  private transformReview(review: any, locationId: string): any {
    return {
      ...review,
      locationId: locationId,
      gmbReviewId: review.id,
      reviewer: {
        ...review.reviewer,
        isAnonymous: !review.reviewer.displayName || review.reviewer.displayName === 'Anonymous'
      },
      gmbCreateTime: new Date(review.createTime),
      gmbUpdateTime: new Date(review.updateTime)
    }
  }

  private transformPost(post: any, locationId: string): any {
    return {
      ...post,
      locationId: locationId,
      gmbPostId: post.id,
      gmbCreateTime: new Date(post.createTime),
      gmbUpdateTime: new Date(post.updateTime)
    }
  }

  private transformInsight(insight: any, locationId: string): any {
    return {
      ...insight,
      locationId: locationId,
      period: {
        startTime: new Date(insight.period.startTime).toISOString(),
        endTime: new Date(insight.period.endTime).toISOString()
      }
    }
  }

  private transformSearchKeyword(keyword: any, locationId: string): any {
    return {
      ...keyword,
      locationId: locationId
    }
  }

  // Validation methods
  private validateReview(review: any): { success: boolean; errors?: string[] } {
    try {
      GmbReviewSchema.parse(review)
      return { success: true }
    } catch (error) {
      return {
        success: false,
        errors: error instanceof z.ZodError ? error.issues.map(e => e.message) : ['Validation failed']
      }
    }
  }

  private validatePost(post: any): { success: boolean; errors?: string[] } {
    try {
      GmbPostSchema.parse(post)
      return { success: true }
    } catch (error) {
      return {
        success: false,
        errors: error instanceof z.ZodError ? error.issues.map(e => e.message) : ['Validation failed']
      }
    }
  }

  private validateInsight(insight: any): { success: boolean; errors?: string[] } {
    try {
      GmbInsightSchema.parse(insight)
      return { success: true }
    } catch (error) {
      return {
        success: false,
        errors: error instanceof z.ZodError ? error.issues.map(e => e.message) : ['Validation failed']
      }
    }
  }

  private validateSearchKeyword(keyword: any): { success: boolean; errors?: string[] } {
    try {
      GmbSearchKeywordSchema.parse(keyword)
      return { success: true }
    } catch (error) {
      return {
        success: false,
        errors: error instanceof z.ZodError ? error.issues.map(e => e.message) : ['Validation failed']
      }
    }
  }

  // Enrichment methods
  private enrichReview(review: any): any {
    return {
      ...review,
      source: 'gmb',
      status: 'active',
      hasResponse: false,
      helpfulCount: 0,
      reportedCount: 0
    }
  }

  private enrichPost(post: any): any {
    return {
      ...post,
      source: 'gmb',
      status: 'active',
      viewCount: 0,
      clickCount: 0
    }
  }

  private enrichInsight(insight: any): any {
    return {
      ...insight,
      source: 'gmb',
      status: 'active'
    }
  }

  private enrichSearchKeyword(keyword: any): any {
    return {
      ...keyword,
      source: 'gmb',
      status: 'active'
    }
  }

  // Utility methods
  private sanitizeString(value: any): string {
    if (typeof value !== 'string') return ''
    return value.trim()
  }

  private sanitizeNumber(value: any, min: number = 0, max: number = Number.MAX_SAFE_INTEGER): number {
    const num = Number(value)
    if (isNaN(num)) return min
    return Math.max(min, Math.min(max, num))
  }

  private sanitizeUrl(value: any): string | undefined {
    if (typeof value !== 'string') return undefined
    try {
      new URL(value)
      return value
    } catch {
      return undefined
    }
  }

  private sanitizeDateTime(value: any): string {
    if (typeof value !== 'string') return new Date().toISOString()
    try {
      return new Date(value).toISOString()
    } catch {
      return new Date().toISOString()
    }
  }

  private log(level: string, message: string): void {
    if (this.shouldLog(level)) {
      const logMessage = `[DataPipeline] ${message}`
      switch (level) {
        case 'error':
          console.error(logMessage)
          break
        case 'warn':
          console.warn(logMessage)
          break
        case 'info':
          console.info(logMessage)
          break
        case 'debug':
          console.debug(logMessage)
          break
        default:
          console.log(logMessage)
      }
    }
  }

  private shouldLog(level: string): boolean {
    const levels = ['error', 'warn', 'info', 'debug']
    const currentLevelIndex = levels.indexOf(this.config.logLevel)
    const messageLevelIndex = levels.indexOf(level)
    return messageLevelIndex <= currentLevelIndex
  }

  /**
   * Get pipeline statistics
   */
  getStats(): {
    totalErrors: number
    totalWarnings: number
    config: PipelineConfig
  } {
    return {
      totalErrors: this.errors.length,
      totalWarnings: this.warnings.length,
      config: this.config
    }
  }

  /**
   * Reset pipeline state
   */
  reset(): void {
    this.errors = []
    this.warnings = []
  }
}




