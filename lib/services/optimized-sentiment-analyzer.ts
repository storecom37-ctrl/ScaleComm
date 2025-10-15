import { SentimentResult } from '../types/sentiment'

/**
 * Optimized sentiment analyzer for large-scale processing
 * Uses rule-based analysis with intelligent caching and batch processing
 */
export class OptimizedSentimentAnalyzer {
  private cache = new Map<string, SentimentResult>()
  private readonly CACHE_SIZE_LIMIT = 10000
  private readonly BATCH_SIZE = 100

  /**
   * Analyze sentiment for a single text
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

    // Check cache first
    const cacheKey = this.getCacheKey(text)
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!
    }

    // Analyze using rule-based approach for efficiency
    const result = this.analyzeWithRules(text)
    
    // Cache the result
    this.cacheResult(cacheKey, result)
    
    return result
  }

  /**
   * Analyze sentiment for multiple texts in batches
   */
  async analyzeBatch(texts: string[]): Promise<SentimentResult[]> {
    const results: SentimentResult[] = []
    
    // Process in batches to avoid memory issues
    for (let i = 0; i < texts.length; i += this.BATCH_SIZE) {
      const batch = texts.slice(i, i + this.BATCH_SIZE)
      const batchResults = await Promise.all(
        batch.map(text => this.analyzeSentiment(text))
      )
      results.push(...batchResults)
      
      // Force garbage collection between batches
      if (global.gc && i % (this.BATCH_SIZE * 5) === 0) {
        global.gc()
      }
    }
    
    return results
  }

  /**
   * Rule-based sentiment analysis optimized for performance
   */
  private analyzeWithRules(text: string): SentimentResult {
    const lowerText = text.toLowerCase()
    
    // Quick positive indicators
    const positivePatterns = [
      /\b(good|great|excellent|amazing|wonderful|fantastic|love|perfect|best|awesome|outstanding|brilliant|superb|delicious|fresh|clean|friendly|helpful|fast|quick|easy|convenient|affordable|cheap|value|recommend|satisfied|happy|pleased)\b/g,
      /\b(excellent service|great food|amazing experience|must try|highly recommend|will come back|worth it|value for money|pocket friendly|fair price|reasonable price)\b/g
    ]
    
    // Quick negative indicators
    const negativePatterns = [
      /\b(bad|terrible|awful|horrible|worst|hate|disappointed|disgusting|dirty|slow|rude|unfriendly|expensive|overpriced|cold|stale|poor|worst|never again|waste|regret|avoid|disgusting|nasty|filthy|unclean|unprofessional|incompetent|useless|pathetic|shameful|disgraceful)\b/g,
      /\b(poor service|bad food|terrible experience|waste of money|not worth|overpriced|too expensive|slow service|rude staff|dirty place|never coming back|worst experience|disappointed|regret coming)\b/g
    ]
    
    let positiveScore = 0
    let negativeScore = 0
    
    // Count positive patterns
    for (const pattern of positivePatterns) {
      const matches = lowerText.match(pattern)
      if (matches) {
        positiveScore += matches.length
      }
    }
    
    // Count negative patterns
    for (const pattern of negativePatterns) {
      const matches = lowerText.match(pattern)
      if (matches) {
        negativeScore += matches.length
      }
    }
    
    // Calculate sentiment
    const totalScore = positiveScore + negativeScore
    if (totalScore === 0) {
      return {
        sentiment: 'neutral',
        confidence: 0.5,
        score: 0,
        method: 'rule-based',
        reasoning: 'No clear sentiment indicators found'
      }
    }
    
    const netScore = positiveScore - negativeScore
    const score = Math.max(-1, Math.min(1, netScore / totalScore))
    
    let sentiment: 'positive' | 'negative' | 'neutral'
    let confidence: number
    
    if (score > 0.1) {
      sentiment = 'positive'
      confidence = Math.min(0.9, 0.5 + (score * 0.4))
    } else if (score < -0.1) {
      sentiment = 'negative'
      confidence = Math.min(0.9, 0.5 + (Math.abs(score) * 0.4))
    } else {
      sentiment = 'neutral'
      confidence = 0.6
    }
    
    return {
      sentiment,
      confidence,
      score,
      method: 'rule-based',
      reasoning: `Rule-based: ${positiveScore} positive, ${negativeScore} negative indicators`
    }
  }

  /**
   * Generate cache key for text
   */
  private getCacheKey(text: string): string {
    // Use first 50 characters + length for cache key
    return `${text.substring(0, 50)}_${text.length}`
  }

  /**
   * Cache result with size management
   */
  private cacheResult(key: string, result: SentimentResult): void {
    if (this.cache.size >= this.CACHE_SIZE_LIMIT) {
      // Remove oldest entries (simple FIFO)
      const firstKey = this.cache.keys().next().value
      this.cache.delete(firstKey)
    }
    
    this.cache.set(key, result)
  }

  /**
   * Clear cache to free memory
   */
  clearCache(): void {
    this.cache.clear()
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; limit: number } {
    return {
      size: this.cache.size,
      limit: this.CACHE_SIZE_LIMIT
    }
  }
}

// Export singleton instance
export const optimizedSentimentAnalyzer = new OptimizedSentimentAnalyzer()
