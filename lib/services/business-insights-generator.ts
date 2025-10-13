import { Review } from '@/lib/database/separate-models'
import { HybridSentimentAnalyzer } from './sentiment-analyzer'
import { EnhancedSentimentAnalyzer } from './enhanced-sentiment-analyzer'
import connectToDatabase from '@/lib/database/connection'
import mongoose from 'mongoose'

interface KeywordCloud {
  word: string
  frequency: number
  sentiment: 'positive' | 'negative' | 'neutral'
  category: 'product' | 'service' | 'ambiance' | 'value' | 'general'
}

interface TopComplaint {
  complaint: string
  frequency: number
  severity: 'low' | 'medium' | 'high'
  category: 'service' | 'product' | 'ambiance' | 'value' | 'other'
}

interface ProductFeedback {
  tag: string
  frequency: number
  sentiment: 'positive' | 'negative' | 'neutral'
  category: 'food_quality' | 'taste' | 'presentation' | 'portion' | 'freshness'
}

interface BusinessInsights {
  keywordCloud: KeywordCloud[]
  topComplaints: TopComplaint[]
  productFeedback: ProductFeedback[]
  aiRecommendations: string[]
  sentimentTrend: {
    period: string
    positive: number
    negative: number
    neutral: number
  }[]
}

export class BusinessInsightsGenerator {
  private analyzer: HybridSentimentAnalyzer
  private enhancedAnalyzer: EnhancedSentimentAnalyzer

  constructor() {
    this.analyzer = new HybridSentimentAnalyzer()
    this.enhancedAnalyzer = new EnhancedSentimentAnalyzer()
  }

  /**
   * Generate comprehensive business insights from reviews using enhanced analysis
   */
  async generateInsights(entityId: string, entityType: 'brand' | 'store', days: number = 30): Promise<BusinessInsights> {
    await connectToDatabase()

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(entityId)) {
      throw new Error(`Invalid ${entityType} ID format`)
    }

    // Calculate date range for analysis
    const endDate = new Date()
    const startDate = new Date(endDate.getTime() - (days * 24 * 60 * 60 * 1000))
    
    console.log(`📅 Analyzing business insights from ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]} (${days} days)`)

    // Get reviews for the entity within the specified time range
    const query: any = {
      status: 'active',
      comment: { $exists: true, $nin: [null, ''] },
      gmbCreateTime: { $gte: startDate, $lte: endDate }
    }
    
    if (entityType === 'brand') {
      query.brandId = new mongoose.Types.ObjectId(entityId)
    } else {
      query.storeId = new mongoose.Types.ObjectId(entityId)
    }
    
    const reviews = await Review.find(query).sort({ gmbCreateTime: -1 })

    if (reviews.length === 0) {
      return this.getEmptyInsights()
    }

    try {
      // Use enhanced analyzer for better insights
      const enhancedAnalysis = await this.enhancedAnalyzer.analyzeReviews(reviews)
      
      // Convert enhanced analysis to legacy format for compatibility
      const keywordCloud = this.convertNGramsToKeywordCloud(enhancedAnalysis.nGrams)
      const topComplaints = this.convertComplaintsToLegacyFormat(enhancedAnalysis.complaints)
      const productFeedback = this.convertAspectPairsToProductFeedback(enhancedAnalysis.aspectPairs)
      
      // Generate AI recommendations using enhanced insights
      const aiRecommendations = this.generateEnhancedRecommendations(enhancedAnalysis)
      
      // Generate sentiment trend
      const sentimentTrend = await this.generateSentimentTrend(reviews)

      return {
        keywordCloud,
        topComplaints,
        productFeedback,
        aiRecommendations,
        sentimentTrend
      }
    } catch (error) {
      console.error('Enhanced analysis failed, falling back to legacy method:', error)
      
      // Fallback to legacy method
      const keywordCloud = await this.generateKeywordCloud(reviews)
      const topComplaints = await this.generateTopComplaints(reviews)
      const productFeedback = await this.generateProductFeedback(reviews)
      const aiRecommendations = await this.generateAIRecommendations(reviews)
      const sentimentTrend = await this.generateSentimentTrend(reviews)

      return {
        keywordCloud,
        topComplaints,
        productFeedback,
        aiRecommendations,
        sentimentTrend
      }
    }
  }

  /**
   * Generate keyword cloud with frequency and sentiment
   */
  private async generateKeywordCloud(reviews: any[]): Promise<KeywordCloud[]> {
    const wordFrequency = new Map<string, { count: number, sentiment: string, category: string }>()
    
    // Business-relevant keywords with categories
    const businessKeywords = {
      product: ['food', 'dish', 'meal', 'taste', 'flavor', 'delicious', 'fresh', 'quality', 'ingredients', 'cooked', 'spicy', 'sweet', 'portion'],
      service: ['service', 'staff', 'waiter', 'waitress', 'friendly', 'attentive', 'professional', 'helpful', 'polite', 'courteous'],
      ambiance: ['atmosphere', 'ambiance', 'decor', 'environment', 'clean', 'dirty', 'noisy', 'quiet', 'comfortable', 'cozy'],
      value: ['price', 'expensive', 'cheap', 'value', 'worth', 'affordable', 'overpriced', 'budget', 'cost'],
      general: ['good', 'bad', 'great', 'excellent', 'amazing', 'terrible', 'awful', 'nice', 'wonderful', 'fantastic']
    }

    reviews.forEach(review => {
      if (!review.comment) return
      
      const comment = review.comment.toLowerCase()
      const words = comment.split(/\s+/)
      
      words.forEach((word: string) => {
        const cleanWord = word.replace(/[^\w]/g, '')
        if (cleanWord.length > 2) {
          // Check which category this word belongs to
          let category = 'general'
          for (const [cat, keywords] of Object.entries(businessKeywords)) {
            if (keywords.includes(cleanWord)) {
              category = cat
              break
            }
          }
          
          if (wordFrequency.has(cleanWord)) {
            const existing = wordFrequency.get(cleanWord)!
            existing.count++
            // Update sentiment based on review sentiment
            if (review.sentimentAnalysis?.sentiment) {
              existing.sentiment = review.sentimentAnalysis.sentiment
            }
          } else {
            wordFrequency.set(cleanWord, {
              count: 1,
              sentiment: review.sentimentAnalysis?.sentiment || 'neutral',
              category
            })
          }
        }
      })
    })

    return Array.from(wordFrequency.entries())
      .map(([word, data]) => ({
        word,
        frequency: data.count,
        sentiment: data.sentiment as 'positive' | 'negative' | 'neutral',
        category: data.category as 'product' | 'service' | 'ambiance' | 'value' | 'general'
      }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 20) // Top 20 keywords
  }

  /**
   * Generate top complaints from negative reviews
   */
  private async generateTopComplaints(reviews: any[]): Promise<TopComplaint[]> {
    const complaintPatterns = {
      service: ['slow service', 'rude staff', 'unfriendly', 'poor service', 'bad service', 'unprofessional'],
      product: ['bad food', 'terrible food', 'awful taste', 'cold food', 'burnt', 'undercooked', 'stale'],
      ambiance: ['dirty', 'noisy', 'uncomfortable', 'poor atmosphere', 'bad environment'],
      value: ['expensive', 'overpriced', 'not worth', 'waste of money', 'too costly'],
      other: ['disappointed', 'never again', 'avoid', 'worst', 'terrible experience']
    }

    const complaintCounts = new Map<string, { count: number, severity: string, category: string }>()

    reviews.forEach(review => {
      if (review.sentimentAnalysis?.sentiment !== 'negative' || !review.comment) return
      
      const comment = review.comment.toLowerCase()
      
      for (const [category, patterns] of Object.entries(complaintPatterns)) {
        patterns.forEach(pattern => {
          if (comment.includes(pattern)) {
            const key = `${category}:${pattern}`
            if (complaintCounts.has(key)) {
              complaintCounts.get(key)!.count++
            } else {
              complaintCounts.set(key, {
                count: 1,
                severity: this.calculateSeverity(pattern, review.starRating),
                category
              })
            }
          }
        })
      }
    })

    return Array.from(complaintCounts.entries())
      .map(([key, data]) => {
        const [category, complaint] = key.split(':')
        return {
          complaint: complaint.replace(/_/g, ' '),
          frequency: data.count,
          severity: data.severity as 'low' | 'medium' | 'high',
          category: category as 'service' | 'product' | 'ambiance' | 'value' | 'other'
        }
      })
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 10) // Top 10 complaints
  }

  /**
   * Generate product feedback tags
   */
  private async generateProductFeedback(reviews: any[]): Promise<ProductFeedback[]> {
    const productTags = {
      food_quality: ['delicious', 'tasty', 'flavorful', 'bland', 'boring', 'excellent', 'poor'],
      taste: ['spicy', 'sweet', 'sour', 'bitter', 'mild', 'hot', 'cold', 'perfect'],
      presentation: ['beautiful', 'attractive', 'ugly', 'messy', 'well-presented', 'poor presentation'],
      portion: ['large', 'small', 'huge', 'tiny', 'generous', 'meager', 'adequate', 'insufficient'],
      freshness: ['fresh', 'stale', 'old', 'rotten', 'crisp', 'soft', 'hard', 'tender']
    }

    const tagCounts = new Map<string, { count: number, sentiment: string, category: string }>()

    reviews.forEach(review => {
      if (!review.comment) return
      
      const comment = review.comment.toLowerCase()
      
      for (const [category, tags] of Object.entries(productTags)) {
        tags.forEach(tag => {
          if (comment.includes(tag)) {
            const key = `${category}:${tag}`
            if (tagCounts.has(key)) {
              tagCounts.get(key)!.count++
            } else {
              tagCounts.set(key, {
                count: 1,
                sentiment: review.sentimentAnalysis?.sentiment || 'neutral',
                category
              })
            }
          }
        })
      }
    })

    return Array.from(tagCounts.entries())
      .map(([key, data]) => {
        const [category, tag] = key.split(':')
        return {
          tag: tag.replace(/_/g, ' '),
          frequency: data.count,
          sentiment: data.sentiment as 'positive' | 'negative' | 'neutral',
          category: category as 'food_quality' | 'taste' | 'presentation' | 'portion' | 'freshness'
        }
      })
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 15) // Top 15 product feedback tags
  }

  /**
   * Generate AI-powered business recommendations
   */
  private async generateAIRecommendations(reviews: any[]): Promise<string[]> {
    try {
      const sampleReviews = reviews.slice(0, 20).map(r => r.comment).filter(Boolean)
      const context = sampleReviews.join('\n')

      const prompt = `Analyze these restaurant reviews and provide 5 specific, actionable business recommendations:

Reviews: ${context}

Focus on:
1. Service improvements
2. Product quality enhancements  
3. Operational efficiency
4. Customer experience
5. Business growth opportunities

Provide concrete, implementable recommendations that address the most common feedback themes.`

      const result = await this.analyzer.analyzeSentiment(prompt)
      
      // Parse AI response
      const recommendations = result.reasoning?.split('\n').filter(line => 
        line.trim().length > 0 && 
        !line.includes('Sentiment:') && 
        !line.includes('Confidence:') &&
        !line.includes('Score:') &&
        !line.includes('Reasoning:')
      ) || []

      return recommendations.length > 0 ? recommendations : this.getFallbackRecommendations()

    } catch (error) {
      console.error('Error generating AI recommendations:', error)
      return this.getFallbackRecommendations()
    }
  }

  /**
   * Generate sentiment trend over time
   */
  private async generateSentimentTrend(reviews: any[]): Promise<{ period: string, positive: number, negative: number, neutral: number }[]> {
    const now = new Date()
    const periods = [
      { name: '7d', days: 7 },
      { name: '30d', days: 30 },
      { name: '60d', days: 60 },
      { name: '90d', days: 90 }
    ]

    return periods.map(period => {
      const startDate = new Date(now.getTime() - period.days * 24 * 60 * 60 * 1000)
      const periodReviews = reviews.filter(r => r.gmbCreateTime >= startDate)
      
      let positive = 0
      let negative = 0
      let neutral = 0
      
      periodReviews.forEach(review => {
        const sentiment = review.sentimentAnalysis?.sentiment || 'neutral'
        if (sentiment === 'positive') positive++
        else if (sentiment === 'negative') negative++
        else neutral++
      })
      
      return {
        period: period.name,
        positive,
        negative,
        neutral
      }
    })
  }

  private calculateSeverity(pattern: string, starRating: string): 'low' | 'medium' | 'high' {
    const rating = parseInt(starRating) || 3
    if (rating <= 2) return 'high'
    if (rating <= 3) return 'medium'
    return 'low'
  }

  private getFallbackRecommendations(): string[] {
    return [
      'Monitor customer feedback trends regularly',
      'Address negative themes proactively',
      'Leverage positive themes in marketing',
      'Improve staff training based on service feedback',
      'Review pricing strategy based on value feedback'
    ]
  }

  private getEmptyInsights(): BusinessInsights {
    return {
      keywordCloud: [],
      topComplaints: [],
      productFeedback: [],
      aiRecommendations: this.getFallbackRecommendations(),
      sentimentTrend: []
    }
  }

  /**
   * Convert N-grams to legacy keyword cloud format
   */
  private convertNGramsToKeywordCloud(nGrams: any[]): KeywordCloud[] {
    return nGrams.slice(0, 20).map(ngram => ({
      word: ngram.phrase,
      frequency: ngram.frequency,
      sentiment: ngram.sentiment > 0.1 ? 'positive' : ngram.sentiment < -0.1 ? 'negative' : 'neutral',
      category: this.mapCategoryToLegacy(ngram.category)
    }))
  }

  /**
   * Convert complaint patterns to legacy format
   */
  private convertComplaintsToLegacyFormat(complaints: any[]): TopComplaint[] {
    return complaints.slice(0, 10).map(complaint => ({
      complaint: complaint.pattern,
      frequency: complaint.frequency,
      severity: complaint.severity === 'critical' ? 'high' : complaint.severity,
      category: this.mapComplaintCategory(complaint.pattern)
    }))
  }

  /**
   * Convert aspect pairs to product feedback format
   */
  private convertAspectPairsToProductFeedback(aspectPairs: any[]): ProductFeedback[] {
    return aspectPairs.slice(0, 15).map(pair => ({
      tag: pair.aspect,
      frequency: pair.frequency,
      sentiment: pair.sentiment,
      category: this.mapAspectToProductCategory(pair.aspect)
    }))
  }

  /**
   * Generate enhanced recommendations based on analysis
   */
  private generateEnhancedRecommendations(analysis: any): string[] {
    const recommendations: string[] = []
    
    // Add actionable insights
    recommendations.push(...analysis.actionableInsights)
    
    // Add trending issue recommendations
    if (analysis.trendingIssues.length > 0) {
      recommendations.push(`Address trending issues: ${analysis.trendingIssues.join(', ')}`)
    }
    
    // Add specific recommendations based on top negative aspects
    const topNegative = analysis.aspectPairs
      .filter((p: any) => p.sentiment === 'negative')
      .slice(0, 3)
    
    for (const aspect of topNegative) {
      recommendations.push(`Improve ${aspect.aspect}: Focus on ${aspect.context} (${aspect.frequency} mentions)`)
    }
    
    // Add critical complaint recommendations
    const criticalComplaints = analysis.complaints.filter((c: any) => c.severity === 'critical')
    if (criticalComplaints.length > 0) {
      recommendations.push(`URGENT: Address ${criticalComplaints.length} critical complaint patterns immediately`)
    }
    
    return recommendations.slice(0, 10) // Limit to 10 recommendations
  }

  /**
   * Map enhanced categories to legacy format
   */
  private mapCategoryToLegacy(category: string): 'product' | 'service' | 'ambiance' | 'value' | 'general' {
    const mapping: { [key: string]: 'product' | 'service' | 'ambiance' | 'value' | 'general' } = {
      'Product Quality': 'product',
      'User Experience': 'product',
      'Customer Service': 'service',
      'Value Proposition': 'value',
      'Environment': 'ambiance'
    }
    return mapping[category] || 'general'
  }

  /**
   * Map complaint to category for TopComplaint interface
   */
  private mapComplaintCategory(pattern: string): 'service' | 'product' | 'ambiance' | 'value' | 'other' {
    const patternLower = pattern.toLowerCase()
    
    if (patternLower.includes('service') || patternLower.includes('staff') || patternLower.includes('wait')) return 'service'
    if (patternLower.includes('food') || patternLower.includes('quality') || patternLower.includes('taste')) return 'product'
    if (patternLower.includes('ambiance') || patternLower.includes('atmosphere') || patternLower.includes('noise')) return 'ambiance'
    if (patternLower.includes('price') || patternLower.includes('value') || patternLower.includes('expensive')) return 'value'
    
    return 'other'
  }

  /**
   * Map aspect to product category
   */
  private mapAspectToProductCategory(aspect: string): 'food_quality' | 'taste' | 'presentation' | 'portion' | 'freshness' {
    const aspectLower = aspect.toLowerCase()
    
    if (aspectLower.includes('taste') || aspectLower.includes('flavor')) return 'taste'
    if (aspectLower.includes('fresh') || aspectLower.includes('stale')) return 'freshness'
    if (aspectLower.includes('portion') || aspectLower.includes('size')) return 'portion'
    if (aspectLower.includes('presentation') || aspectLower.includes('look')) return 'presentation'
    
    return 'food_quality' // Default
  }
}

export const businessInsightsGenerator = new BusinessInsightsGenerator()
