import { Review } from '@/lib/database/separate-models'
import { SentimentAnalytics } from '@/lib/database/sentiment-analytics-model'
import { HybridSentimentAnalyzer } from './sentiment-analyzer'
import { optimizedSentimentAnalyzer } from './optimized-sentiment-analyzer'
import { geminiAnalyzer } from './gemini-api'
import connectToDatabase from '@/lib/database/connection'
import mongoose from 'mongoose'

interface SentimentPeriodData {
  total: number
  positive: number
  negative: number
  neutral: number
  percentages: {
    positive: number
    negative: number
    neutral: number
  }
  averageScore: number
}

interface SentimentAnalyticsData {
  entityId: string
  entityType: 'brand' | 'store'
  lastAnalyzed: Date
  overallSentiment: 'positive' | 'negative' | 'neutral'
  overallConfidence: number
  overallScore: number
  overallTrend: 'improving' | 'declining' | 'stable' | 'new'
  periods: {
    '7d': SentimentPeriodData
    '30d': SentimentPeriodData
    '60d': SentimentPeriodData
    '90d': SentimentPeriodData
  }
  topPositiveThemes: string[]
  topNegativeThemes: string[]
  recommendations: string[]
  totalReviewsAnalyzed: number
  lastReviewDate?: Date
  processingStats?: {
    totalReviews: number
    processedInThisRun: number
    remainingToProcess: number
    processingComplete: boolean
    lastProcessedAt: Date
  }
}

export class SentimentWorkflowService {
  private analyzer: HybridSentimentAnalyzer

  constructor() {
    this.analyzer = new HybridSentimentAnalyzer()
  }
  
  private checkMemoryUsage(): boolean {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const memUsage = process.memoryUsage()
      const heapUsedMB = memUsage.heapUsed / 1024 / 1024
      const heapTotalMB = memUsage.heapTotal / 1024 / 1024
      
      console.log(`💾 Memory usage: ${heapUsedMB.toFixed(2)}MB used / ${heapTotalMB.toFixed(2)}MB total`)
      
      // If memory usage is too high, return false to stop processing
      if (heapUsedMB > 3000) { // 3GB threshold
        console.warn(`⚠️ High memory usage detected: ${heapUsedMB.toFixed(2)}MB. Stopping processing to prevent crash.`)
        return false
      }
    }
    return true
  }

  /**
   * Check if sentiment analysis is needed for an entity
   */
  async needsAnalysis(entityId: string, entityType: 'brand' | 'store', days: number = 30): Promise<boolean> {
    await connectToDatabase()

    // Compute analysis window
    const endDate = new Date()
    const startDate = new Date(endDate.getTime() - (days * 24 * 60 * 60 * 1000))

    // If we already have analytics and it's fresh compared to latest review, skip
    const existing = await SentimentAnalytics.findOne({ entityId, entityType }).lean()

    // Find latest review in window
    const latestReview = await Review.findOne({
      [entityType === 'brand' ? 'brandId' : 'storeId']: new mongoose.Types.ObjectId(entityId),
      status: 'active',
      comment: { $exists: true, $nin: [null, ''] },
      gmbCreateTime: { $gte: startDate, $lte: endDate }
    }).sort({ gmbCreateTime: -1 }).select({ gmbCreateTime: 1 }).lean()

    if (existing && latestReview && existing.lastAnalyzed && existing.lastReviewDate) {
      // If no newer reviews since last analyzed, no need to re-run
      if (new Date(existing.lastReviewDate).getTime() >= new Date(latestReview.gmbCreateTime).getTime()) {
        return false
      }
    }

    // Check if there are any reviews in the window that still need analysis
    const reviewsNeedingAnalysis = await Review.countDocuments({
      [entityType === 'brand' ? 'brandId' : 'storeId']: new mongoose.Types.ObjectId(entityId),
      status: 'active',
      comment: { $exists: true, $nin: [null, ''] },
      gmbCreateTime: { $gte: startDate, $lte: endDate },
      $or: [
        { 'sentimentAnalysis.sentiment': { $exists: false } },
        { 'sentimentAnalysis.sentiment': null }
      ]
    })

    return reviewsNeedingAnalysis > 0
  }

  /**
   * Analyze sentiment for an entity and save to database
   */
  async analyzeAndSave(entityId: string, entityType: 'brand' | 'store', days: number = 30): Promise<SentimentAnalyticsData> {
    await connectToDatabase()

    console.log(`🔍 Starting sentiment analysis for ${entityType}: ${entityId}`)

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(entityId)) {
      throw new Error(`Invalid ${entityType} ID format`)
    }

    // Calculate date range for analysis
    const endDate = new Date()
    const startDate = new Date(endDate.getTime() - (days * 24 * 60 * 60 * 1000))
    
    console.log(`📅 Analyzing reviews from ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]} (${days} days)`)
    
    // Log account-specific analysis
    console.log(`🏢 Account-specific analysis for ${entityType} ID: ${entityId}`)

    // Get reviews for this entity within the specified time range, sorted by recency (newest first)
    const reviews = await Review.find({
      [entityType === 'brand' ? 'brandId' : 'storeId']: new mongoose.Types.ObjectId(entityId),
      status: 'active',
      comment: { $exists: true, $nin: [null, ''] },
      gmbCreateTime: { $gte: startDate, $lte: endDate }
    }).sort({ gmbCreateTime: -1 }) // Newest reviews first

    // If there are no reviews in the selected period, do not throw.
    // Return an "empty" analytics object so the UI can render a valid state.
    if (reviews.length === 0) {
      console.log(`ℹ️ No reviews found for ${entityType}: ${entityId} in the last ${days} days. Returning empty analytics.`)
      const emptyAnalytics = await this.calculateAggregatedAnalytics(entityId, entityType, reviews)
      emptyAnalytics.processingStats = {
        totalReviews: 0,
        processedInThisRun: 0,
        remainingToProcess: 0,
        processingComplete: true,
        lastProcessedAt: new Date()
      }
      await SentimentAnalytics.findOneAndUpdate(
        { entityId, entityType },
        emptyAnalytics,
        { upsert: true, new: true }
      )
      return emptyAnalytics
    }

    console.log(`📊 Found ${reviews.length} reviews to analyze`)

    // Analyze sentiment for reviews that don't have it yet, sorted by recency
    const reviewsToAnalyze = reviews.filter(review => !review.sentimentAnalysis?.sentiment)
    console.log(`🤖 Found ${reviewsToAnalyze.length} reviews needing sentiment analysis in the last ${days} days`)

    // Limit the number of reviews processed in a single run to prevent memory issues
    const maxReviewsPerRun = 500
    let reviewsToProcess = reviewsToAnalyze
    let remainingReviews = 0
    
    if (reviewsToAnalyze.length > 0) {
        reviewsToProcess = reviewsToAnalyze.slice(0, maxReviewsPerRun)
        remainingReviews = reviewsToAnalyze.length - maxReviewsPerRun
        
        if (remainingReviews > 0) {
          console.log(`⚠️ Large dataset: ${reviewsToAnalyze.length} total reviews. Processing ${maxReviewsPerRun} in this run. ${remainingReviews} remaining for next run.`)
        }
        
        console.log(`📊 Processing ${reviewsToProcess.length} reviews (newest first)`)
        
        // Use optimized batch processing for all reviews in the time range
        const batchSize = 3 // Very conservative batch size for maximum memory stability
        const texts = reviewsToProcess.map(review => review.comment || '')
        
        console.log(`📦 Processing ${texts.length} reviews in batches of ${batchSize}`)
      
      // Process all reviews in the time range
      for (let i = 0; i < texts.length; i += batchSize) {
        // Check memory usage before each batch
        if (!this.checkMemoryUsage()) {
          console.warn(`🛑 Stopping processing due to high memory usage`)
          break
        }
        
        const batchTexts = texts.slice(i, i + batchSize)
        const batchReviews = reviewsToProcess.slice(i, i + batchSize)
        
        try {
          // Use optimized analyzer for batch processing
          const sentimentResults = await optimizedSentimentAnalyzer.analyzeBatch(batchTexts)
          
          // Update reviews with sentiment analysis
          for (let j = 0; j < batchReviews.length; j++) {
            const review = batchReviews[j]
            const sentimentResult = sentimentResults[j]
            
            review.sentimentAnalysis = {
              sentiment: sentimentResult.sentiment,
              confidence: sentimentResult.confidence,
              score: sentimentResult.score,
              method: 'rule-based', // Use 'rule-based' instead of 'optimized-rule-based' to avoid validation errors
              reasoning: sentimentResult.reasoning,
              analyzedAt: new Date()
            }
          }
          
          // Save batch to database
          await Promise.all(batchReviews.map(review => review.save()))
          
          const batchNumber = Math.floor(i / batchSize) + 1
          const totalBatches = Math.ceil(texts.length / batchSize)
          console.log(`✅ Processed batch ${batchNumber}/${totalBatches} (${Math.round((batchNumber / totalBatches) * 100)}%)`)
          
          // Force garbage collection between batches to prevent memory issues
          if (global.gc && batchNumber % 2 === 0) { // GC every 2 batches for aggressive memory management
            console.log(`🧹 Running garbage collection...`)
            global.gc()
          }
          
          // Add small delay between batches to prevent memory overload
          if (batchNumber % 5 === 0) {
            console.log(`⏸️ Pausing briefly to prevent memory overload...`)
            await new Promise(resolve => setTimeout(resolve, 200))
          }
          
          // Clear any large objects from memory
          if (batchNumber % 10 === 0) {
            console.log(`🧹 Clearing memory caches...`)
            if (global.gc) global.gc()
            // Clear any potential memory leaks
            if (typeof global.gc === 'function') {
              global.gc()
            }
          }
          
        } catch (error) {
          console.error(`Error processing batch ${Math.floor(i / batchSize) + 1}:`, error)
          // Continue with other batches even if one fails
        }
      }
    }

    // Calculate aggregated analytics
    const analytics = await this.calculateAggregatedAnalytics(entityId, entityType, reviews)

    // Add processing statistics
    const processedCount = reviewsToAnalyze.length > 0 ? Math.min(reviewsToAnalyze.length, maxReviewsPerRun) : 0
    const remainingCount = Math.max(0, remainingReviews)
    
    analytics.processingStats = {
      totalReviews: reviews.length,
      processedInThisRun: processedCount,
      remainingToProcess: remainingCount,
      processingComplete: remainingCount === 0,
      lastProcessedAt: new Date()
    }
    
    console.log(`📊 Processing Stats: ${processedCount} processed, ${remainingCount} remaining`)

    // Save to database
    await SentimentAnalytics.findOneAndUpdate(
      { entityId, entityType },
      analytics,
      { upsert: true, new: true }
    )

    console.log(`✅ Sentiment analysis completed for ${entityType}: ${entityId}`)
    console.log(`📊 Processing Stats: ${analytics.processingStats.processedInThisRun} processed, ${analytics.processingStats.remainingToProcess} remaining`)
    return analytics
  }

  /**
   * Get pre-analyzed sentiment analytics from database
   */
  async getAnalytics(entityId: string, entityType: 'brand' | 'store'): Promise<SentimentAnalyticsData | null> {
    await connectToDatabase()

    const analytics = await SentimentAnalytics.findOne({ entityId, entityType }).lean()
    return analytics as SentimentAnalyticsData | null
  }

  /**
   * Calculate aggregated analytics from reviews
   */
  private async calculateAggregatedAnalytics(
    entityId: string, 
    entityType: 'brand' | 'store', 
    reviews: any[]
  ): Promise<SentimentAnalyticsData> {
    const now = new Date()
    const date7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const date30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const date60d = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)
    const date90d = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)

    // Filter reviews by time periods
    const reviews7d = reviews.filter(r => r.gmbCreateTime >= date7d)
    const reviews30d = reviews.filter(r => r.gmbCreateTime >= date30d)
    const reviews60d = reviews.filter(r => r.gmbCreateTime >= date60d)
    const reviews90d = reviews.filter(r => r.gmbCreateTime >= date90d)

    // Calculate period data
    const periods = {
      '7d': this.calculatePeriodData(reviews7d),
      '30d': this.calculatePeriodData(reviews30d),
      '60d': this.calculatePeriodData(reviews60d),
      '90d': this.calculatePeriodData(reviews90d)
    }

    // Calculate overall metrics
    const overallScore = periods['90d'].averageScore
    let overallSentiment: 'positive' | 'negative' | 'neutral' = 'neutral'
    if (overallScore > 0.1) overallSentiment = 'positive'
    else if (overallScore < -0.1) overallSentiment = 'negative'

    const overallConfidence = Math.abs(overallScore)
    const overallTrend = this.determineTrend(periods['30d'], periods['60d'])

    // Generate themes via lightweight keyword extraction
    const { positiveThemes, negativeThemes, recommendations } = await this.generateThemesAndRecommendations(reviews30d)

    // Unified AI business insights (single prompt, best-effort)
    // Send up to 50 recent review texts to the Gemini client; falls back safely if AI disabled
    let unifiedInsights: any | null = null
    try {
      const reviewTexts = reviews30d
        .slice(0, 50)
        .map(r => r.comment)
        .filter(Boolean)
      if (reviewTexts.length > 0) {
        unifiedInsights = await geminiAnalyzer.generateBusinessInsights(reviewTexts)
      }
    } catch (e) {
      // Best-effort only; keep non-AI analytics intact
      unifiedInsights = null
    }

    return {
      entityId,
      entityType,
      lastAnalyzed: now,
      overallSentiment,
      overallConfidence,
      overallScore,
      overallTrend,
      periods,
      topPositiveThemes: positiveThemes,
      topNegativeThemes: negativeThemes,
      // Prefer unified AI recommendations if available; otherwise keep rule-based recs
      recommendations: Array.isArray(unifiedInsights?.aiRecommendations) && unifiedInsights.aiRecommendations.length > 0
        ? unifiedInsights.aiRecommendations
        : recommendations,
      totalReviewsAnalyzed: reviews.length,
      lastReviewDate: reviews[0]?.gmbCreateTime
    }
  }

  private calculatePeriodData(reviews: any[]): SentimentPeriodData {
    const total = reviews.length
    let positive = 0
    let negative = 0
    let neutral = 0
    let totalScore = 0

    reviews.forEach(review => {
      if (review.sentimentAnalysis?.sentiment === 'positive') positive++
      else if (review.sentimentAnalysis?.sentiment === 'negative') negative++
      else neutral++
      
      totalScore += review.sentimentAnalysis?.score || 0
    })

    return {
      total,
      positive,
      negative,
      neutral,
      percentages: {
        positive: total > 0 ? (positive / total) * 100 : 0,
        negative: total > 0 ? (negative / total) * 100 : 0,
        neutral: total > 0 ? (neutral / total) * 100 : 0,
      },
      averageScore: total > 0 ? totalScore / total : 0,
    }
  }

  private determineTrend(current: SentimentPeriodData, previous: SentimentPeriodData): 'improving' | 'declining' | 'stable' | 'new' {
    if (previous.total === 0) return 'new'
    if (current.averageScore > previous.averageScore + 0.05) return 'improving'
    if (current.averageScore < previous.averageScore - 0.05) return 'declining'
    return 'stable'
  }

  private async generateThemesAndRecommendations(reviews: any[]): Promise<{
    positiveThemes: string[]
    negativeThemes: string[]
    recommendations: string[]
  }> {
    // Enhanced keyword extraction with business context
    const businessKeywords = new Map<string, number>()
    const complaintKeywords = new Map<string, number>()
    const productKeywords = new Map<string, number>()
    const serviceKeywords = new Map<string, number>()

    // Business context keywords
    const businessTerms = [
      'food', 'service', 'staff', 'ambiance', 'price', 'value', 'quality', 'taste',
      'delicious', 'fresh', 'clean', 'friendly', 'professional', 'fast', 'slow',
      'expensive', 'cheap', 'worth', 'recommend', 'visit', 'experience', 'atmosphere'
    ]

    const complaintTerms = [
      'bad', 'terrible', 'awful', 'disappointed', 'rude', 'unfriendly', 'dirty',
      'slow', 'expensive', 'overpriced', 'worst', 'hate', 'never', 'avoid',
      'complaint', 'issue', 'problem', 'unacceptable', 'poor', 'disgusting'
    ]

    const productTerms = [
      'food', 'dish', 'meal', 'taste', 'flavor', 'ingredients', 'fresh', 'stale',
      'delicious', 'bland', 'spicy', 'sweet', 'sour', 'hot', 'cold', 'cooked',
      'raw', 'burnt', 'undercooked', 'portion', 'size', 'presentation'
    ]

    const serviceTerms = [
      'service', 'staff', 'waiter', 'waitress', 'manager', 'friendly', 'rude',
      'attentive', 'helpful', 'professional', 'slow', 'fast', 'efficient',
      'polite', 'courteous', 'welcoming', 'hospitality', 'customer'
    ]

    reviews.forEach(review => {
      if (!review.comment) return
      
      const comment = review.comment.toLowerCase()
      const words = comment.split(/\s+/)
      
      // Extract business keywords
      words.forEach((word: string) => {
        const cleanWord = word.replace(/[^\w]/g, '')
        if (cleanWord.length > 2 && businessTerms.includes(cleanWord)) {
          businessKeywords.set(cleanWord, (businessKeywords.get(cleanWord) || 0) + 1)
        }
      })

      // Extract complaint keywords
      if (review.sentimentAnalysis?.sentiment === 'negative') {
        words.forEach((word: string) => {
          const cleanWord = word.replace(/[^\w]/g, '')
          if (cleanWord.length > 2 && complaintTerms.includes(cleanWord)) {
            complaintKeywords.set(cleanWord, (complaintKeywords.get(cleanWord) || 0) + 1)
          }
        })
      }

      // Extract product keywords
      words.forEach((word: string) => {
        const cleanWord = word.replace(/[^\w]/g, '')
        if (cleanWord.length > 2 && productTerms.includes(cleanWord)) {
          productKeywords.set(cleanWord, (productKeywords.get(cleanWord) || 0) + 1)
        }
      })

      // Extract service keywords
      words.forEach((word: string) => {
        const cleanWord = word.replace(/[^\w]/g, '')
        if (cleanWord.length > 2 && serviceTerms.includes(cleanWord)) {
          serviceKeywords.set(cleanWord, (serviceKeywords.get(cleanWord) || 0) + 1)
        }
      })
    })

    // Generate positive themes (top business keywords)
    const positiveThemes = Array.from(businessKeywords.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([word, count]) => `${word} (${count})`)

    // Generate negative themes (top complaint keywords)
    const negativeThemes = Array.from(complaintKeywords.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([word, count]) => `${word} (${count})`)

    // Generate AI-powered recommendations
    const recommendations = await this.generateAIRecommendations(reviews, {
      positiveThemes,
      negativeThemes,
      productKeywords: Array.from(productKeywords.entries()).slice(0, 5),
      serviceKeywords: Array.from(serviceKeywords.entries()).slice(0, 5)
    })

    return { positiveThemes, negativeThemes, recommendations }
  }

  private async generateAIRecommendations(reviews: any[], insights: any): Promise<string[]> {
    try {
      // Use the existing analyzer for AI-powered insights
      const sampleReviews = reviews.slice(0, 10).map(r => r.comment).filter(Boolean)
      const context = sampleReviews.join('\n')

      const prompt = `Based on these restaurant reviews, provide 3-5 actionable business recommendations:

Reviews: ${context}

Key Insights:
- Positive themes: ${insights.positiveThemes.join(', ')}
- Negative themes: ${insights.negativeThemes.join(', ')}
- Product keywords: ${insights.productKeywords.map(([k, v]: [string, number]) => `${k}(${v})`).join(', ')}
- Service keywords: ${insights.serviceKeywords.map(([k, v]: [string, number]) => `${k}(${v})`).join(', ')}

Provide specific, actionable recommendations for improving the restaurant business. Focus on:
1. Addressing negative feedback
2. Leveraging positive aspects
3. Operational improvements
4. Customer experience enhancements

Format as a simple list of recommendations.`

      const result = await this.analyzer.analyzeSentiment(prompt)
      
      // Parse AI response for recommendations
      const aiRecommendations = result.reasoning?.split('\n').filter(line => 
        line.trim().length > 0 && !line.includes('Sentiment:') && !line.includes('Confidence:')
      ) || []

      // Fallback recommendations if AI fails
      const fallbackRecommendations = [
        'Monitor customer feedback trends regularly',
        'Address negative themes proactively', 
        'Leverage positive themes in marketing',
        'Improve staff training based on service feedback',
        'Review pricing strategy based on value feedback'
      ]

      return aiRecommendations.length > 0 ? aiRecommendations : fallbackRecommendations

    } catch (error) {
      console.error('Error generating AI recommendations:', error)
      return [
        'Monitor customer feedback trends regularly',
        'Address negative themes proactively',
        'Leverage positive themes in marketing'
      ]
    }
  }

  /**
   * Get analysis status for an entity
   */
  async getAnalysisStatus(entityId: string, entityType: 'brand' | 'store', days: number = 30): Promise<{
    totalReviews: number
    analyzedReviews: number
    remainingReviews: number
    analysisProgress: number
    lastAnalyzed?: Date
    needsAnalysis: boolean
  }> {
    await connectToDatabase()

    const endDate = new Date()
    const startDate = new Date(endDate.getTime() - (days * 24 * 60 * 60 * 1000))

    // Get total reviews
    const totalReviews = await Review.countDocuments({
      [entityType === 'brand' ? 'brandId' : 'storeId']: new mongoose.Types.ObjectId(entityId),
      status: 'active',
      comment: { $exists: true, $nin: [null, ''] },
      gmbCreateTime: { $gte: startDate, $lte: endDate }
    })

    // Get analyzed reviews
    const analyzedReviews = await Review.countDocuments({
      [entityType === 'brand' ? 'brandId' : 'storeId']: new mongoose.Types.ObjectId(entityId),
      status: 'active',
      comment: { $exists: true, $nin: [null, ''] },
      gmbCreateTime: { $gte: startDate, $lte: endDate },
      'sentimentAnalysis.sentiment': { $exists: true }
    })

    const remainingReviews = totalReviews - analyzedReviews
    const analysisProgress = totalReviews > 0 ? Math.round((analyzedReviews / totalReviews) * 100) : 0

    // Get last analyzed date
    const lastAnalyzedReview = await Review.findOne({
      [entityType === 'brand' ? 'brandId' : 'storeId']: new mongoose.Types.ObjectId(entityId),
      status: 'active',
      'sentimentAnalysis.sentiment': { $exists: true }
    }).sort({ 'sentimentAnalysis.analyzedAt': -1 })

    return {
      totalReviews,
      analyzedReviews,
      remainingReviews,
      analysisProgress,
      lastAnalyzed: lastAnalyzedReview?.sentimentAnalysis?.analyzedAt,
      needsAnalysis: remainingReviews > 0
    }
  }
}

export const sentimentWorkflow = new SentimentWorkflowService()
