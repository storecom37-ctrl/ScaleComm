import { sentimentAnalyzer } from './sentiment-analyzer'
import { Review } from '@/lib/database/separate-models'
import { Store } from '@/lib/database/models'
import connectToDatabase from '@/lib/database/connection'
import mongoose from 'mongoose'

// Time period types
export type TimePeriod = '7d' | '30d' | '60d' | '90d'

// Aggregated sentiment data interface
export interface AggregatedSentimentData {
  period: TimePeriod
  totalReviews: number
  sentiment: {
    positive: number
    negative: number
    neutral: number
  }
  percentages: {
    positive: number
    negative: number
    neutral: number
  }
  averageScore: number
  averageConfidence: number
  trend: 'improving' | 'declining' | 'stable'
  keyInsights: string[]
  topPositiveThemes: string[]
  topNegativeThemes: string[]
  lastAnalyzed: Date
}

// Store/Brand sentiment analytics interface
export interface SentimentAnalytics {
  storeId?: string
  brandId?: string
  storeName?: string
  brandName?: string
  periods: {
    '7d': AggregatedSentimentData
    '30d': AggregatedSentimentData
    '60d': AggregatedSentimentData
    '90d': AggregatedSentimentData
  }
  overallTrend: 'improving' | 'declining' | 'stable'
  recommendations: string[]
  lastUpdated: Date
}

export class AggregatedSentimentAnalyzer {

  /**
   * Get date range for a specific period
   */
  private getDateRange(period: TimePeriod): { start: Date; end: Date } {
    const end = new Date()
    const start = new Date()

    switch (period) {
      case '7d':
        start.setDate(end.getDate() - 7)
        break
      case '30d':
        start.setDate(end.getDate() - 30)
        break
      case '60d':
        start.setDate(end.getDate() - 60)
        break
      case '90d':
        start.setDate(end.getDate() - 90)
        break
    }

    return { start, end }
  }

  /**
   * Analyze sentiment for reviews in a specific time period
   */
  private async analyzePeriodSentiment(
    reviews: any[],
    period: TimePeriod
  ): Promise<AggregatedSentimentData> {
    if (reviews.length === 0) {
      return {
        period,
        totalReviews: 0,
        sentiment: { positive: 0, negative: 0, neutral: 0 },
        percentages: { positive: 0, negative: 0, neutral: 0 },
        averageScore: 0,
        averageConfidence: 0,
        trend: 'stable',
        keyInsights: ['No reviews in this period'],
        topPositiveThemes: [],
        topNegativeThemes: [],
        lastAnalyzed: new Date()
      }
    }

    // Extract comments for analysis
    const comments = reviews
      .filter(review => review.comment && review.comment.trim().length > 0)
      .map(review => review.comment)

    if (comments.length === 0) {
      return {
        period,
        totalReviews: reviews.length,
        sentiment: { positive: 0, negative: 0, neutral: 0 },
        percentages: { positive: 0, negative: 0, neutral: 0 },
        averageScore: 0,
        averageConfidence: 0,
        trend: 'stable',
        keyInsights: ['No review comments to analyze'],
        topPositiveThemes: [],
        topNegativeThemes: [],
        lastAnalyzed: new Date()
      }
    }

    // Perform sentiment analysis
    const sentimentResults = await sentimentAnalyzer.analyzeBatch(comments)

    // Aggregate results
    const sentiment = {
      positive: sentimentResults.filter(r => r.sentiment === 'positive').length,
      negative: sentimentResults.filter(r => r.sentiment === 'negative').length,
      neutral: sentimentResults.filter(r => r.sentiment === 'neutral').length
    }

    const percentages = {
      positive: (sentiment.positive / sentimentResults.length) * 100,
      negative: (sentiment.negative / sentimentResults.length) * 100,
      neutral: (sentiment.neutral / sentimentResults.length) * 100
    }

    const averageScore = sentimentResults.reduce((sum, r) => sum + r.score, 0) / sentimentResults.length
    const averageConfidence = sentimentResults.reduce((sum, r) => sum + r.confidence, 0) / sentimentResults.length

    // Determine trend (simplified - would need historical data for accurate trend)
    const trend: 'improving' | 'declining' | 'stable' =
      percentages.positive > 70 ? 'improving' :
        percentages.negative > 50 ? 'declining' : 'stable'

    // Generate insights
    const keyInsights = this.generateInsights(sentiment, percentages, averageScore)
    const { topPositiveThemes, topNegativeThemes } = this.extractThemes(reviews, sentimentResults)

    return {
      period,
      totalReviews: reviews.length,
      sentiment,
      percentages,
      averageScore,
      averageConfidence,
      trend,
      keyInsights,
      topPositiveThemes,
      topNegativeThemes,
      lastAnalyzed: new Date()
    }
  }

  /**
   * Generate key insights from sentiment data
   */
  private generateInsights(
    sentiment: { positive: number; negative: number; neutral: number },
    percentages: { positive: number; negative: number; neutral: number },
    averageScore: number
  ): string[] {
    const insights: string[] = []

    if (percentages.positive > 80) {
      insights.push('Excellent customer satisfaction with overwhelmingly positive sentiment')
    } else if (percentages.positive > 60) {
      insights.push('Good customer satisfaction with mostly positive sentiment')
    } else if (percentages.negative > 50) {
      insights.push('Customer satisfaction needs attention with negative sentiment trend')
    } else {
      insights.push('Mixed customer sentiment with room for improvement')
    }

    if (averageScore > 0.5) {
      insights.push('Strong positive sentiment score indicates satisfied customers')
    } else if (averageScore < -0.3) {
      insights.push('Negative sentiment score suggests customer concerns need addressing')
    }

    if (sentiment.neutral > sentiment.positive + sentiment.negative) {
      insights.push('High neutral sentiment suggests customers are neither very satisfied nor dissatisfied')
    }

    return insights
  }

  /**
   * Extract common themes from reviews
   */
  private extractThemes(reviews: any[], sentimentResults: any[]): {
    topPositiveThemes: string[]
    topNegativeThemes: string[]
  } {
    // Simple theme extraction based on common keywords
    const positiveKeywords = ['excellent', 'amazing', 'great', 'good', 'wonderful', 'fantastic', 'delicious', 'friendly', 'clean', 'fast', 'quick', 'helpful']
    const negativeKeywords = ['terrible', 'awful', 'bad', 'poor', 'slow', 'dirty', 'rude', 'expensive', 'cold', 'burnt', 'tasteless']

    const positiveThemes: { [key: string]: number } = {}
    const negativeThemes: { [key: string]: number } = {}

    reviews.forEach((review, index) => {
      const sentiment = sentimentResults[index]
      const comment = review.comment?.toLowerCase() || ''

      if (sentiment.sentiment === 'positive') {
        positiveKeywords.forEach(keyword => {
          if (comment.includes(keyword)) {
            positiveThemes[keyword] = (positiveThemes[keyword] || 0) + 1
          }
        })
      } else if (sentiment.sentiment === 'negative') {
        negativeKeywords.forEach(keyword => {
          if (comment.includes(keyword)) {
            negativeThemes[keyword] = (negativeThemes[keyword] || 0) + 1
          }
        })
      }
    })

    const topPositiveThemes = Object.entries(positiveThemes)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([theme]) => theme)

    const topNegativeThemes = Object.entries(negativeThemes)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([theme]) => theme)

    return { topPositiveThemes, topNegativeThemes }
  }

  /**
   * Analyze sentiment for a specific store
   */
  async analyzeStoreSentiment(storeId: string): Promise<SentimentAnalytics> {
    await connectToDatabase()

    // Get store information
    const store = await Store.findById(storeId).select('name brandId')
    if (!store) {
      throw new Error('Store not found')
    }

    const periods: { [key in TimePeriod]: AggregatedSentimentData } = {} as any

    // Analyze each time period
    for (const period of ['7d', '30d', '60d', '90d'] as TimePeriod[]) {
      const { start, end } = this.getDateRange(period)

      // Get reviews for this period
      const reviews = await Review.find({
        storeId: new mongoose.Types.ObjectId(storeId),
        gmbCreateTime: { $gte: start, $lte: end },
        status: 'active'
      }).select('comment starRating gmbCreateTime')

      periods[period] = await this.analyzePeriodSentiment(reviews, period)
    }

    // Determine overall trend
    const overallTrend = this.calculateOverallTrend(periods)
    const recommendations = this.generateRecommendations(periods)

    return {
      storeId,
      storeName: store.name,
      periods,
      overallTrend,
      recommendations,
      lastUpdated: new Date()
    }
  }

  /**
   * Analyze sentiment for a specific brand
   */
  async analyzeBrandSentiment(brandId: string): Promise<SentimentAnalytics> {
    await connectToDatabase()

    // Get brand information
    const brand = await Store.findOne({ brandId })
      .populate<{ brandId: { name: string } }>('brandId', 'name')
      .select('brandId')
    if (!brand) {
      throw new Error('Brand not found')
    }

    const periods: { [key in TimePeriod]: AggregatedSentimentData } = {} as any

    // Analyze each time period
    for (const period of ['7d', '30d', '60d', '90d'] as TimePeriod[]) {
      const { start, end } = this.getDateRange(period)

      // Get reviews for all stores under this brand
      const reviews = await Review.find({
        brandId: new mongoose.Types.ObjectId(brandId),
        gmbCreateTime: { $gte: start, $lte: end },
        status: 'active'
      }).select('comment starRating gmbCreateTime')

      periods[period] = await this.analyzePeriodSentiment(reviews, period)
    }

    // Determine overall trend
    const overallTrend = this.calculateOverallTrend(periods)
    const recommendations = this.generateRecommendations(periods)

    return {
      brandId,
      brandName: brand.brandId?.name || 'Unknown Brand',
      periods,
      overallTrend,
      recommendations,
      lastUpdated: new Date()
    }
  }

  /**
   * Calculate overall trend from period data
   */
  private calculateOverallTrend(periods: { [key in TimePeriod]: AggregatedSentimentData }): 'improving' | 'declining' | 'stable' {
    const trends = [periods['7d'].trend, periods['30d'].trend, periods['60d'].trend, periods['90d'].trend]

    const improvingCount = trends.filter(t => t === 'improving').length
    const decliningCount = trends.filter(t => t === 'declining').length

    if (improvingCount > decliningCount) return 'improving'
    if (decliningCount > improvingCount) return 'declining'
    return 'stable'
  }

  /**
   * Generate recommendations based on sentiment data
   */
  private generateRecommendations(periods: { [key in TimePeriod]: AggregatedSentimentData }): string[] {
    const recommendations: string[] = []

    const recentData = periods['7d']
    const monthlyData = periods['30d']

    // Recent performance recommendations
    if (recentData.percentages.negative > 30) {
      recommendations.push('Address recent negative feedback immediately')
    }

    if (recentData.percentages.positive < 50) {
      recommendations.push('Focus on improving customer experience in the short term')
    }

    // Trend-based recommendations
    if (periods['7d'].percentages.positive < periods['30d'].percentages.positive) {
      recommendations.push('Sentiment declining recently - investigate recent changes')
    }

    if (monthlyData.percentages.positive > 70) {
      recommendations.push('Maintain current high satisfaction levels')
    }

    // Theme-based recommendations
    if (recentData.topNegativeThemes.includes('slow')) {
      recommendations.push('Improve service speed based on customer feedback')
    }

    if (recentData.topNegativeThemes.includes('rude')) {
      recommendations.push('Provide staff training on customer service')
    }

    if (recentData.topPositiveThemes.includes('friendly')) {
      recommendations.push('Continue emphasizing friendly service')
    }

    return recommendations
  }

  /**
   * Get sentiment analytics for multiple stores
   */
  async getMultiStoreSentiment(storeIds: string[]): Promise<SentimentAnalytics[]> {
    const results: SentimentAnalytics[] = []

    for (const storeId of storeIds) {
      try {
        const analytics = await this.analyzeStoreSentiment(storeId)
        results.push(analytics)
      } catch (error) {
        console.error(`Error analyzing sentiment for store ${storeId}:`, error)
      }
    }

    return results
  }

  /**
   * Get sentiment analytics for multiple brands
   */
  async getMultiBrandSentiment(brandIds: string[]): Promise<SentimentAnalytics[]> {
    const results: SentimentAnalytics[] = []

    for (const brandId of brandIds) {
      try {
        const analytics = await this.analyzeBrandSentiment(brandId)
        results.push(analytics)
      } catch (error) {
        console.error(`Error analyzing sentiment for brand ${brandId}:`, error)
      }
    }

    return results
  }
}

// Export singleton instance
export const aggregatedSentimentAnalyzer = new AggregatedSentimentAnalyzer()
