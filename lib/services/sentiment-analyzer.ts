import { geminiAnalyzer, SentimentResult } from './gemini-api'

// Confidence thresholds
const CONFIDENCE_THRESHOLDS = {
  HIGH: 0.8,
  MEDIUM: 0.6,
  LOW: 0.4
}
interface SentimentStats {
  total: number
  positive: number
  negative: number
  neutral: number
  averageConfidence: number
  averageScore: number
  highConfidence: number
  mediumConfidence: number
  lowConfidence: number
}

export class HybridSentimentAnalyzer {
  constructor() {
    console.log('✅ Hybrid Sentiment Analyzer initialized with Gemini API')
  }

  /**
   * Main sentiment analysis method - uses hybrid approach
   */
  async analyzeSentiment(text: string): Promise<SentimentResult> {
    if (!text || text.trim().length === 0) {
      return {
        sentiment: 'neutral',
        confidence: 0,
        score: 0,
        method: 'rule-based',
        reasoning: 'Empty text'
      }
    }

    // Step 1: Rule-based analysis
    const ruleResult = this.analyzeWithRules(text)
    
    // Step 2: Check if we need AI analysis
    const needsAI = ruleResult.confidence < CONFIDENCE_THRESHOLDS.MEDIUM
    
    if (!needsAI) {
      return ruleResult
    }

    try {
      // Step 3: AI analysis for low confidence cases
      const aiResult = await geminiAnalyzer.analyzeSentiment(text)
      
      // Step 4: Combine results (AI takes precedence for low confidence rule-based)
      return {
        sentiment: aiResult.sentiment,
        confidence: Math.max(ruleResult.confidence, aiResult.confidence),
        score: aiResult.score,
        method: 'hybrid',
        reasoning: `Hybrid: Rule-based (${ruleResult.confidence.toFixed(2)}) + AI (${aiResult.confidence.toFixed(2)})`
      }
    } catch (error) {
      console.warn('AI analysis failed, using rule-based result:', error)
      // Return rule-based result with hybrid method to indicate AI was attempted
      return {
        ...ruleResult,
        method: 'hybrid',
        reasoning: `Hybrid (AI failed): ${ruleResult.reasoning}`
      }
    }
  }

  /**
   * Rule-based sentiment analysis
   */
  private analyzeWithRules(text: string): SentimentResult {
    const lowerText = text.toLowerCase()
    
    // Positive indicators
    const positiveWords = [
      'good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'love', 'perfect', 'best', 'awesome',
      'outstanding', 'brilliant', 'superb', 'delicious', 'fresh', 'clean', 'friendly', 'helpful', 'fast',
      'quick', 'easy', 'convenient', 'affordable', 'cheap', 'value', 'recommend', 'satisfied', 'happy', 'pleased',
      'excellent service', 'great food', 'amazing experience', 'must try', 'highly recommend', 'will come back',
      'worth it', 'value for money', 'pocket friendly', 'fair price', 'reasonable price'
    ]
    
    // Negative indicators
    const negativeWords = [
      'bad', 'terrible', 'awful', 'horrible', 'worst', 'hate', 'disappointed', 'disgusting', 'dirty', 'slow',
      'rude', 'expensive', 'overpriced', 'waste', 'regret', 'avoid', 'complaint', 'problem', 'issue', 'wrong',
      'broken', 'poor', 'unacceptable', 'frustrated', 'angry', 'upset', 'never again', 'don\'t go', 'rip off',
      'worst experience', 'waste of money', 'unfriendly', 'unclean', 'stale', 'cold', 'burnt', 'undercooked',
      'overcooked', 'tasteless', 'bland', 'so so', 'mediocre', 'average', 'okay', 'not great', 'could be better',
      'disappointing', 'let down'
    ]
    
    let positiveScore = 0
    let negativeScore = 0

    // Count positive and negative words
    positiveWords.forEach(word => {
      const regex = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi')
      const matches = lowerText.match(regex)
      if (matches) positiveScore += matches.length
    })

    negativeWords.forEach(word => {
      const regex = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi')
      const matches = lowerText.match(regex)
      if (matches) negativeScore += matches.length
    })

    // Calculate sentiment
    const totalScore = positiveScore - negativeScore
    const confidence = Math.min((Math.abs(totalScore) + 1) / 10, 1)

    let sentiment: 'positive' | 'negative' | 'neutral'
    let score: number

    if (totalScore > 0) {
      sentiment = 'positive'
      score = Math.min(totalScore / 5, 1)
    } else if (totalScore < 0) {
      sentiment = 'negative'
      score = Math.max(totalScore / 5, -1)
    } else {
      sentiment = 'neutral'
      score = 0
    }

    return {
      sentiment,
      confidence,
      score,
      method: 'rule-based',
      reasoning: `Rule-based analysis: +${positiveScore}, -${negativeScore}`
    }
  }

  /**
   * Batch sentiment analysis for multiple reviews
   */
  async analyzeBatch(reviews: string[]): Promise<SentimentResult[]> {
    const results: SentimentResult[] = []

    // Process in batches to avoid rate limits
    const batchSize = 10
    for (let i = 0; i < reviews.length; i += batchSize) {
      const batch = reviews.slice(i, i + batchSize)
      const batchResults = await Promise.all(
        batch.map(review => this.analyzeSentiment(review))
      )
      results.push(...batchResults)

      // Small delay between batches
      if (i + batchSize < reviews.length) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }

    return results
  }

  /**
   * Calculate statistics from sentiment results
   */
  getSentimentStats(results: SentimentResult[]): SentimentStats {
    if (results.length === 0) {
      return {
        total: 0,
        positive: 0,
        negative: 0,
        neutral: 0,
        averageConfidence: 0,
        averageScore: 0,
        highConfidence: 0,
        mediumConfidence: 0,
        lowConfidence: 0
      }
    }

    const positive = results.filter(r => r.sentiment === 'positive').length
    const negative = results.filter(r => r.sentiment === 'negative').length
    const neutral = results.filter(r => r.sentiment === 'neutral').length

    const totalConfidence = results.reduce((sum, r) => sum + r.confidence, 0)
    const totalScore = results.reduce((sum, r) => sum + r.score, 0)

    const highConfidence = results.filter(r => r.confidence >= CONFIDENCE_THRESHOLDS.HIGH).length
    const mediumConfidence = results.filter(r =>
      r.confidence >= CONFIDENCE_THRESHOLDS.MEDIUM &&
      r.confidence < CONFIDENCE_THRESHOLDS.HIGH
    ).length
    const lowConfidence = results.filter(r => r.confidence < CONFIDENCE_THRESHOLDS.MEDIUM).length

    return {
      total: results.length,
      positive,
      negative,
      neutral,
      averageConfidence: totalConfidence / results.length,
      averageScore: totalScore / results.length,
      highConfidence,
      mediumConfidence,
      lowConfidence
    }
  }

  /**
   * Generate business insights from reviews
   */
  async generateBusinessInsights(reviews: string[]): Promise<any> {
    try {
      return await geminiAnalyzer.generateBusinessInsights(reviews)
    } catch (error) {
      console.warn('Failed to generate business insights:', error)
      return {
        keywordCloud: [],
        topComplaints: [],
        productFeedback: [],
        aiRecommendations: []
      }
    }
  }
}

// Export singleton instance
export const sentimentAnalyzer = new HybridSentimentAnalyzer()