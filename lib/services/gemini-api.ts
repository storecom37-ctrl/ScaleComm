import { GoogleGenerativeAI } from '@google/generative-ai'

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export interface SentimentResult {
  sentiment: 'positive' | 'negative' | 'neutral'
  confidence: number
  score: number
  method: 'rule-based' | 'ai' | 'hybrid'
  reasoning: string
}

export interface BusinessInsights {
  keywordCloud: Array<{
    word: string
    frequency: number
    sentiment: 'positive' | 'negative' | 'neutral'
    category: 'product' | 'service' | 'ambiance' | 'value' | 'general'
  }>
  topComplaints: Array<{
    complaint: string
    frequency: number
    sentiment: 'negative'
  }>
  productFeedback: Array<{
    feedback: string
    frequency: number
    sentiment: 'positive' | 'negative' | 'neutral'
  }>
  aiRecommendations: string[]
}

export class GeminiSentimentAnalyzer {
  private model: any
  private lastCallTime: number = 0
  private readonly RATE_LIMIT_MS = 200 // 200ms between calls
  private failureCount: number = 0
  private readonly MAX_FAILURES = 3
  private circuitBreakerOpen: boolean = false
  private circuitBreakerResetTime: number = 0
  private readonly CIRCUIT_BREAKER_TIMEOUT = 60000 // 1 minute

  constructor() {
    if (!process.env.GEMINI_API_KEY) {
      console.warn('⚠️ GEMINI_API_KEY not configured, using rule-based analysis only')
      return
    }
    
    try {
      this.model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })
      console.log('✅ Gemini API initialized for sentiment analysis')
    } catch (error) {
      console.warn('⚠️ Failed to initialize Gemini API:', error)
    }
  }

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

    // Try AI analysis first if available
    if (this.model && !this.circuitBreakerOpen) {
      try {
        // Check circuit breaker
        if (this.circuitBreakerOpen) {
          const now = Date.now()
          if (now - this.circuitBreakerResetTime > this.CIRCUIT_BREAKER_TIMEOUT) {
            console.log('Circuit breaker reset - attempting AI analysis again')
            this.circuitBreakerOpen = false
            this.failureCount = 0
          } else {
            console.log('Circuit breaker open - using rule-based analysis')
            return this.analyzeWithRules(text)
          }
        }

        // Rate limiting
        const now = Date.now()
        const timeSinceLastCall = now - this.lastCallTime
        if (timeSinceLastCall < this.RATE_LIMIT_MS) {
          const waitTime = this.RATE_LIMIT_MS - timeSinceLastCall
          console.log(`Rate limiting: waiting ${waitTime}ms before next API call`)
          await new Promise(resolve => setTimeout(resolve, waitTime))
        }
        this.lastCallTime = Date.now()

        // Add timeout to prevent hanging
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Analysis timeout')), 10000) // 10 second timeout
        })
        
        const analysisPromise = this.analyzeWithAI(text)
        
        const result = await Promise.race([analysisPromise, timeoutPromise])
        
        // Reset failure count on success
        this.failureCount = 0
        return result
        
      } catch (error) {
        console.warn('AI analysis failed, using rule-based:', error)
        
        // Increment failure count and check circuit breaker
        this.failureCount++
        if (this.failureCount >= this.MAX_FAILURES) {
          this.circuitBreakerOpen = true
          this.circuitBreakerResetTime = Date.now()
          console.log('Circuit breaker opened due to repeated failures')
        }
        
        // Return rule-based result as fallback
        return this.analyzeWithRules(text)
      }
    }

    // Fallback to rule-based analysis
    return this.analyzeWithRules(text)
  }

  private async analyzeWithAI(text: string): Promise<SentimentResult> {
    const prompt = `Analyze sentiment of: "${text}"
    
    Return ONLY this JSON format:
    {"sentiment": "positive", "confidence": 0.8, "score": 0.7, "reasoning": "brief explanation"}
    
    Rules:
    - sentiment: "positive", "negative", or "neutral"
    - confidence: 0.0 to 1.0
    - score: -1.0 to 1.0
    - reasoning: short explanation
    - JSON only, no other text`

    const result = await this.model.generateContent(prompt)
    const response = await result.response
    const textResponse = response.text()

    try {
      // Clean the response - remove markdown code blocks if present
      let cleanResponse = textResponse.trim()
      
      // Remove markdown code blocks
      if (cleanResponse.startsWith('```json') && cleanResponse.endsWith('```')) {
        cleanResponse = cleanResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '')
      } else if (cleanResponse.startsWith('```') && cleanResponse.endsWith('```')) {
        cleanResponse = cleanResponse.replace(/^```\s*/, '').replace(/\s*```$/, '')
      }
      
      // Try to parse as JSON
      const parsed = JSON.parse(cleanResponse)
      return {
        sentiment: parsed.sentiment || 'neutral',
        confidence: Math.min(Math.max(parsed.confidence || 0.5, 0), 1),
        score: Math.min(Math.max(parsed.score || 0, -1), 1),
        method: 'ai',
        reasoning: parsed.reasoning || 'AI analysis'
      }
    } catch (parseError) {
      console.warn('Failed to parse Gemini response as JSON, attempting regex fallback:', textResponse)
      
      // Fallback to regex parsing if JSON fails
      const sentimentMatch = textResponse.match(/\b(positive|negative|neutral)\b/i)
      const sentiment = sentimentMatch ? sentimentMatch[1].toLowerCase() : 'neutral'
      
      // Extract confidence from text if available
      const confidenceMatch = textResponse.match(/(\d+(?:\.\d+)?)%?/g)
      const confidence = confidenceMatch ? Math.min(Math.max(parseFloat(confidenceMatch[0]) / 100, 0), 1) : 0.5
      
      return {
        sentiment: sentiment as 'positive' | 'negative' | 'neutral',
        confidence,
        score: sentiment === 'positive' ? 0.7 : sentiment === 'negative' ? -0.7 : 0,
        method: 'ai',
        reasoning: textResponse.substring(0, 200) // Truncate reasoning
      }
    }
  }

  private analyzeWithRules(text: string): SentimentResult {
    const lowerText = text.toLowerCase()
    
    // Positive indicators
    const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'love', 'perfect', 'best', 'awesome', 'outstanding', 'brilliant', 'superb', 'delicious', 'fresh', 'clean', 'friendly', 'helpful', 'fast', 'quick', 'easy', 'convenient', 'affordable', 'cheap', 'value', 'recommend', 'satisfied', 'happy', 'pleased']
    
    // Negative indicators
    const negativeWords = ['bad', 'terrible', 'awful', 'horrible', 'worst', 'hate', 'disappointed', 'disgusting', 'dirty', 'slow', 'rude', 'expensive', 'overpriced', 'waste', 'regret', 'avoid', 'complaint', 'problem', 'issue', 'wrong', 'broken', 'poor', 'unacceptable', 'frustrated', 'angry', 'upset']
    
    let positiveScore = 0
    let negativeScore = 0
    
    // Count positive and negative words
    positiveWords.forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi')
      const matches = lowerText.match(regex)
      if (matches) positiveScore += matches.length
    })
    
    negativeWords.forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi')
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

  async generateBusinessInsights(reviews: string[]): Promise<BusinessInsights> {
    if (!this.model || reviews.length === 0) {
      return {
        keywordCloud: [],
        topComplaints: [],
        productFeedback: [],
        aiRecommendations: []
      }
    }

    try {
      const prompt = `
      Analyze these customer reviews and extract business insights. Respond with a JSON object containing:
      
      keywordCloud: Array of objects with {word, frequency, sentiment, category}
      topComplaints: Array of objects with {complaint, frequency, sentiment: "negative"}
      productFeedback: Array of objects with {feedback, frequency, sentiment}
      aiRecommendations: Array of strings with actionable recommendations
      
      Reviews: ${reviews.slice(0, 50).join(' | ')}
      
      Respond with only the JSON object.
      `

      const result = await this.model.generateContent(prompt)
      const response = await result.response
      const textResponse = response.text()

      return JSON.parse(textResponse)
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
export const geminiAnalyzer = new GeminiSentimentAnalyzer()
