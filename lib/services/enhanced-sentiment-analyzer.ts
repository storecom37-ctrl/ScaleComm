/**
 * Enhanced Rule-Based Sentiment Analysis
 * 
 * Addresses key limitations:
 * - Single-word extraction → Multi-word N-gram extraction
 * - No sentiment integration → Sentiment-weighted aspect pairs
 * - Hardcoded industry rules → Industry-agnostic universal framework
 * - Basic complaint detection → Context-aware pattern recognition
 */

interface AspectPair {
  aspect: string
  sentiment: 'positive' | 'negative' | 'neutral'
  score: number
  frequency: number
  context: string
  category: string
}

interface NGram {
  phrase: string
  frequency: number
  sentiment: number
  posTags: string[]
  category: string
}

interface ComplaintPattern {
  pattern: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  frequency: number
  impact: string
  examples: string[]
}

interface EnhancedAnalysis {
  aspectPairs: AspectPair[]
  nGrams: NGram[]
  complaints: ComplaintPattern[]
  trendingIssues: string[]
  actionableInsights: string[]
}

export class EnhancedSentimentAnalyzer {
  private stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
    'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
    'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those'
  ])

  private negationWords = new Set([
    'not', 'no', 'never', 'none', 'nothing', 'nowhere', 'nobody', 'neither', 'nor',
    'hardly', 'scarcely', 'barely', 'rarely', 'seldom', 'barely', 'almost', 'nearly'
  ])

  private intensifiers = new Set([
    'very', 'extremely', 'incredibly', 'absolutely', 'completely', 'totally', 'entirely',
    'amazingly', 'exceptionally', 'outstandingly', 'terribly', 'awfully', 'horribly'
  ])

  private impactPhrases = new Set([
    'never coming back', 'waste of money', 'told my friends', 'complained to manager',
    'worst experience', 'terrible service', 'disappointing', 'regret', 'disappointed'
  ])

  // Universal categories that work across industries
  private universalCategories = {
    'Product Quality': ['quality', 'performance', 'functionality', 'reliability', 'durability'],
    'User Experience': ['ease', 'usability', 'interface', 'navigation', 'accessibility'],
    'Customer Service': ['service', 'support', 'response', 'help', 'assistance'],
    'Value Proposition': ['price', 'value', 'cost', 'worth', 'affordable', 'expensive'],
    'Environment': ['atmosphere', 'ambiance', 'cleanliness', 'comfort', 'space']
  }

  /**
   * Enhanced analysis that extracts meaningful phrases and context
   */
  async analyzeReviews(reviews: any[]): Promise<EnhancedAnalysis> {
    const allText = reviews.map(r => r.comment || r.review || '').join(' ')
    const sentences = this.splitIntoSentences(allText)
    
    // Extract N-grams with POS tagging
    const nGrams = this.extractNGrams(sentences)
    
    // Extract aspect-sentiment pairs
    const aspectPairs = this.extractAspectPairs(sentences)
    
    // Detect complaint patterns
    const complaints = this.detectComplaintPatterns(sentences)
    
    // Identify trending issues
    const trendingIssues = this.identifyTrendingIssues(reviews)
    
    // Generate actionable insights
    const actionableInsights = this.generateActionableInsights(aspectPairs, complaints)

    return {
      aspectPairs,
      nGrams,
      complaints,
      trendingIssues,
      actionableInsights
    }
  }

  /**
   * Extract meaningful N-grams (bigrams and trigrams) with POS tagging and deduplication
   */
  private extractNGrams(sentences: string[]): NGram[] {
    const nGramCounts = new Map<string, { count: number, sentiment: number, contexts: string[] }>()
    
    for (const sentence of sentences) {
      const words = this.tokenizeAndClean(sentence)
      const posTags = this.getPOSTags(words)
      
      // Extract bigrams
      for (let i = 0; i < words.length - 1; i++) {
        const bigram = `${words[i]} ${words[i + 1]}`
        if (this.isValidNGram([words[i], words[i + 1]], [posTags[i], posTags[i + 1]])) {
          const sentiment = this.calculatePhraseSentiment(bigram)
          this.updateNGramCount(nGramCounts, bigram, sentiment, sentence)
        }
      }
      
      // Extract trigrams
      for (let i = 0; i < words.length - 2; i++) {
        const trigram = `${words[i]} ${words[i + 1]} ${words[i + 2]}`
        if (this.isValidNGram([words[i], words[i + 1], words[i + 2]], [posTags[i], posTags[i + 1], posTags[i + 2]])) {
          const sentiment = this.calculatePhraseSentiment(trigram)
          this.updateNGramCount(nGramCounts, trigram, sentiment, sentence)
        }
      }
    }

    // Convert to NGram objects and apply deduplication logic
    const rawNGrams = Array.from(nGramCounts.entries())
      .filter(([_, data]) => data.count >= 5) // Minimum frequency threshold
      .map(([phrase, data]) => ({
        phrase,
        frequency: data.count,
        sentiment: data.sentiment / data.count, // Average sentiment
        posTags: this.getPOSTags(phrase.split(' ')),
        category: this.categorizePhrase(phrase)
      }))

    // Apply deduplication and filtering
    return this.deduplicateAndFilterNGrams(rawNGrams)
      .sort((a: NGram, b: NGram) => (b.frequency * Math.abs(b.sentiment)) - (a.frequency * Math.abs(a.sentiment)))
  }

  /**
   * Extract aspect-sentiment pairs for actionable insights
   */
  private extractAspectPairs(sentences: string[]): AspectPair[] {
    const aspectCounts = new Map<string, AspectPair>()
    
    for (const sentence of sentences) {
      const words = this.tokenizeAndClean(sentence)
      const posTags = this.getPOSTags(words)
      
      // Look for [adjective + noun] patterns
      for (let i = 0; i < words.length - 1; i++) {
        if (this.isAdjectiveNounPair(words[i], words[i + 1], posTags[i], posTags[i + 1])) {
          const aspect = words[i + 1] // The noun
          const sentiment = this.getWordSentiment(words[i]) // The adjective sentiment
          const phrase = `${words[i]} ${words[i + 1]}`
          
          // Skip generic aspects that don't provide actionable insights
          if (this.isGenericAspect(aspect)) {
            continue
          }
          
          const key = `${aspect}:${sentiment > 0 ? 'positive' : sentiment < 0 ? 'negative' : 'neutral'}`
          
          if (aspectCounts.has(key)) {
            const existing = aspectCounts.get(key)!
            existing.frequency++
            existing.score = (existing.score + sentiment) / 2
            existing.context = `${existing.context}; ${phrase}`
          } else {
            aspectCounts.set(key, {
              aspect,
              sentiment: sentiment > 0 ? 'positive' : sentiment < 0 ? 'negative' : 'neutral',
              score: sentiment,
              frequency: 1,
              context: phrase,
              category: this.categorizeAspect(aspect)
            })
          }
        }
      }
    }

    return Array.from(aspectCounts.values())
      .filter(pair => pair.frequency >= 3) // Minimum frequency
      .filter(pair => !this.isLowValueAspect(pair.aspect)) // Filter out low-value aspects
      .sort((a, b) => (b.frequency * Math.abs(b.score)) - (a.frequency * Math.abs(a.score)))
      .slice(0, 15) // Limit to top 15 most actionable aspects
  }

  /**
   * Detect complaint patterns with context and severity
   */
  private detectComplaintPatterns(sentences: string[]): ComplaintPattern[] {
    const patterns = new Map<string, ComplaintPattern>()
    
    for (const sentence of sentences) {
      const lowerSentence = sentence.toLowerCase()
      
      // Check for impact phrases (highest priority)
      for (const phrase of this.impactPhrases) {
        if (lowerSentence.includes(phrase)) {
          this.updateComplaintPattern(patterns, phrase, 'critical', sentence)
        }
      }
      
      // Check for negation patterns
      const negationPatterns = this.findNegationPatterns(sentence)
      for (const pattern of negationPatterns) {
        this.updateComplaintPattern(patterns, pattern, 'high', sentence)
      }
      
      // Check for comparative complaints
      const comparativePatterns = this.findComparativePatterns(sentence)
      for (const pattern of comparativePatterns) {
        this.updateComplaintPattern(patterns, pattern, 'medium', sentence)
      }
      
      // Check for emotional intensity
      const intensityPatterns = this.findIntensityPatterns(sentence)
      for (const pattern of intensityPatterns) {
        this.updateComplaintPattern(patterns, pattern, 'medium', sentence)
      }
    }

    return Array.from(patterns.values())
      .sort((a, b) => {
        const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 }
        return severityOrder[b.severity] - severityOrder[a.severity]
      })
  }

  /**
   * Identify trending issues over time
   */
  private identifyTrendingIssues(reviews: any[]): string[] {
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    
    const recentReviews = reviews.filter(r => {
      const reviewDate = new Date(r.date || r.createdAt || now)
      return reviewDate >= thirtyDaysAgo
    })
    
    const olderReviews = reviews.filter(r => {
      const reviewDate = new Date(r.date || r.createdAt || now)
      return reviewDate < thirtyDaysAgo
    })
    
    // Compare sentiment trends
    const recentSentiment = this.calculateAverageSentiment(recentReviews)
    const olderSentiment = this.calculateAverageSentiment(olderReviews)
    
    const trendingIssues: string[] = []
    
    if (recentSentiment < olderSentiment - 0.2) {
      trendingIssues.push("Overall sentiment declining over last 30 days")
    }
    
    // Check for specific aspect trends
    const recentAspects = this.extractAspectPairs(recentReviews.map(r => r.comment || r.review || ''))
    const olderAspects = this.extractAspectPairs(olderReviews.map(r => r.comment || r.review || ''))
    
    // Find aspects that are becoming more negative
    for (const recentAspect of recentAspects) {
      const olderAspect = olderAspects.find(a => a.aspect === recentAspect.aspect)
      if (olderAspect && recentAspect.score < olderAspect.score - 0.3) {
        trendingIssues.push(`${recentAspect.aspect} sentiment declining (${olderAspect.score.toFixed(2)} → ${recentAspect.score.toFixed(2)})`)
      }
    }
    
    return trendingIssues
  }

  /**
   * Generate actionable insights from analysis
   */
  private generateActionableInsights(aspectPairs: AspectPair[], complaints: ComplaintPattern[]): string[] {
    const insights: string[] = []
    
    // Top positive aspects to leverage
    const topPositive = aspectPairs
      .filter(p => p.sentiment === 'positive')
      .slice(0, 3)
    
    if (topPositive.length > 0) {
      insights.push(`Leverage strengths: ${topPositive.map(p => `${p.aspect} (${p.frequency} mentions)`).join(', ')}`)
    }
    
    // Top negative aspects to address
    const topNegative = aspectPairs
      .filter(p => p.sentiment === 'negative')
      .slice(0, 3)
    
    if (topNegative.length > 0) {
      insights.push(`Address concerns: ${topNegative.map(p => `${p.aspect} (${p.frequency} mentions)`).join(', ')}`)
    }
    
    // Critical complaints requiring immediate attention
    const criticalComplaints = complaints.filter(c => c.severity === 'critical')
    if (criticalComplaints.length > 0) {
      insights.push(`URGENT: ${criticalComplaints.length} critical complaint patterns detected`)
    }
    
    // High-frequency issues
    const highFrequencyIssues = complaints.filter(c => c.frequency >= 5)
    if (highFrequencyIssues.length > 0) {
      insights.push(`High-frequency issues: ${highFrequencyIssues.map(c => c.pattern).join(', ')}`)
    }
    
    return insights
  }

  // Helper methods
  private splitIntoSentences(text: string): string[] {
    return text.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 0)
  }

  private tokenizeAndClean(text: string): string[] {
    return text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 0 && !this.stopWords.has(word))
  }

  private getPOSTags(words: string[]): string[] {
    // Simplified POS tagging - in production, use spaCy or NLTK
    return words.map(word => {
      if (word.endsWith('ing')) return 'VBG'
      if (word.endsWith('ed')) return 'VBD'
      if (word.endsWith('ly')) return 'RB'
      if (word.endsWith('er') || word.endsWith('est')) return 'JJR'
      if (this.isAdjective(word)) return 'JJ'
      if (this.isNoun(word)) return 'NN'
      return 'UNKNOWN'
    })
  }

  private isAdjective(word: string): boolean {
    const adjectiveEndings = ['ful', 'ous', 'ive', 'able', 'ible', 'al', 'ic', 'ed', 'ing']
    return adjectiveEndings.some(ending => word.endsWith(ending)) || 
           ['good', 'bad', 'great', 'terrible', 'amazing', 'awful', 'excellent', 'poor'].includes(word)
  }

  private isNoun(word: string): boolean {
    const nounEndings = ['tion', 'sion', 'ness', 'ment', 'ity', 'ty', 'er', 'or']
    return nounEndings.some(ending => word.endsWith(ending)) ||
           ['food', 'service', 'staff', 'quality', 'price', 'value', 'experience'].includes(word)
  }

  private isValidNGram(words: string[], posTags: string[]): boolean {
    // Keep: [Adjective + Noun], [Noun + Noun], [Adverb + Adjective]
    // Filter: [Conjunction + Any], [Determiner + Any alone]
    if (words.length === 2) {
      return (posTags[0] === 'JJ' && posTags[1] === 'NN') ||
             (posTags[0] === 'NN' && posTags[1] === 'NN') ||
             (posTags[0] === 'RB' && posTags[1] === 'JJ')
    }
    return true // For trigrams, be more permissive
  }

  private calculatePhraseSentiment(phrase: string): number {
    const words = phrase.split(' ')
    let sentiment = 0
    let wordCount = 0
    
    for (const word of words) {
      const wordSentiment = this.getWordSentiment(word)
      if (wordSentiment !== 0) {
        sentiment += wordSentiment
        wordCount++
      }
    }
    
    return wordCount > 0 ? sentiment / wordCount : 0
  }

  private getWordSentiment(word: string): number {
    const positiveWords: { [key: string]: number } = {
      'excellent': 0.9, 'amazing': 0.9, 'outstanding': 0.9, 'fantastic': 0.9, 'wonderful': 0.8,
      'great': 0.8, 'good': 0.6, 'nice': 0.5, 'decent': 0.3, 'okay': 0.1,
      'delicious': 0.8, 'tasty': 0.7, 'fresh': 0.6, 'clean': 0.5, 'friendly': 0.7
    }
    
    const negativeWords: { [key: string]: number } = {
      'terrible': -0.9, 'awful': -0.9, 'horrible': -0.9, 'disgusting': -0.9, 'disappointing': -0.7,
      'bad': -0.6, 'poor': -0.7, 'slow': -0.5, 'dirty': -0.6, 'rude': -0.7,
      'cold': -0.4, 'stale': -0.6, 'overpriced': -0.6, 'unfriendly': -0.5
    }
    
    const lowerWord = word.toLowerCase()
    return positiveWords[lowerWord] || negativeWords[lowerWord] || 0
  }

  private updateNGramCount(counts: Map<string, any>, phrase: string, sentiment: number, context: string) {
    if (counts.has(phrase)) {
      const existing = counts.get(phrase)!
      existing.count++
      existing.sentiment += sentiment
      existing.contexts.push(context)
    } else {
      counts.set(phrase, { count: 1, sentiment, contexts: [context] })
    }
  }

  private isAdjectiveNounPair(word1: string, word2: string, pos1: string, pos2: string): boolean {
    return (pos1 === 'JJ' || this.isAdjective(word1)) && (pos2 === 'NN' || this.isNoun(word2))
  }

  private categorizePhrase(phrase: string): string {
    const lowerPhrase = phrase.toLowerCase()
    
    for (const [category, keywords] of Object.entries(this.universalCategories)) {
      if (keywords.some(keyword => lowerPhrase.includes(keyword))) {
        return category
      }
    }
    
    return 'General'
  }

  private categorizeAspect(aspect: string): string {
    return this.categorizePhrase(aspect)
  }

  private findNegationPatterns(sentence: string): string[] {
    const patterns: string[] = []
    const words = sentence.toLowerCase().split(/\s+/)
    
    for (let i = 0; i < words.length - 1; i++) {
      if (this.negationWords.has(words[i])) {
        patterns.push(`negation: ${words[i]} ${words[i + 1]}`)
      }
    }
    
    return patterns
  }

  private findComparativePatterns(sentence: string): string[] {
    const patterns: string[] = []
    const lowerSentence = sentence.toLowerCase()
    
    const comparativePhrases = [
      'worse than', 'better than', 'used to be', 'not as good', 'compared to',
      'instead of', 'rather than', 'prefer', 'choice between'
    ]
    
    for (const phrase of comparativePhrases) {
      if (lowerSentence.includes(phrase)) {
        patterns.push(`comparative: ${phrase}`)
      }
    }
    
    return patterns
  }

  private findIntensityPatterns(sentence: string): string[] {
    const patterns: string[] = []
    const words = sentence.toLowerCase().split(/\s+/)
    
    for (let i = 0; i < words.length - 1; i++) {
      if (this.intensifiers.has(words[i])) {
        patterns.push(`intensity: ${words[i]} ${words[i + 1]}`)
      }
    }
    
    return patterns
  }

  private updateComplaintPattern(patterns: Map<string, ComplaintPattern>, pattern: string, severity: 'low' | 'medium' | 'high' | 'critical', example: string) {
    if (patterns.has(pattern)) {
      const existing = patterns.get(pattern)!
      existing.frequency++
      existing.examples.push(example)
    } else {
      patterns.set(pattern, {
        pattern,
        severity,
        frequency: 1,
        impact: this.getImpactDescription(severity),
        examples: [example]
      })
    }
  }

  private getImpactDescription(severity: string): string {
    const descriptions = {
      'critical': 'Immediate action required - customer retention at risk',
      'high': 'High priority - affects customer satisfaction',
      'medium': 'Monitor closely - potential impact on reputation',
      'low': 'Track for trends - minor impact'
    }
    return descriptions[severity as keyof typeof descriptions] || 'Unknown impact'
  }

  private calculateAverageSentiment(reviews: any[]): number {
    if (reviews.length === 0) return 0
    
    let totalSentiment = 0
    for (const review of reviews) {
      const text = review.comment || review.review || ''
      totalSentiment += this.calculatePhraseSentiment(text)
    }
    
    return totalSentiment / reviews.length
  }

  /**
   * Deduplicate and filter N-grams to remove redundant patterns
   */
  private deduplicateAndFilterNGrams(ngrams: NGram[]): NGram[] {
    const filtered: NGram[] = []
    const seen = new Set<string>()
    
    // Sort by frequency and sentiment strength first
    const sorted = ngrams.sort((a, b) => (b.frequency * Math.abs(b.sentiment)) - (a.frequency * Math.abs(a.sentiment)))
    
    for (const ngram of sorted) {
      const normalized = this.normalizePhrase(ngram.phrase)
      
      // Skip if we've already seen this normalized phrase
      if (seen.has(normalized)) {
        continue
      }
      
      // Skip redundant patterns
      if (this.isRedundantPattern(ngram.phrase, filtered)) {
        continue
      }
      
      // Skip low-value patterns
      if (this.isLowValuePattern(ngram.phrase)) {
        continue
      }
      
      seen.add(normalized)
      filtered.push(ngram)
      
      // Limit to top 20 most meaningful phrases
      if (filtered.length >= 20) {
        break
      }
    }
    
    return filtered
  }

  /**
   * Normalize phrase for deduplication
   */
  private normalizePhrase(phrase: string): string {
    return phrase.toLowerCase()
      .replace(/\s+/g, ' ')
      .trim()
  }

  /**
   * Check if a phrase is redundant with existing phrases
   */
  private isRedundantPattern(phrase: string, existing: NGram[]): boolean {
    const normalized = this.normalizePhrase(phrase)
    const words = normalized.split(' ')
    
    // Check for exact word order variations
    for (const existingNGram of existing) {
      const existingWords = this.normalizePhrase(existingNGram.phrase).split(' ')
      
      // Check if it's the same words in different order
      if (words.length === existingWords.length && 
          words.every(word => existingWords.includes(word))) {
        return true
      }
      
      // Check for sub-phrases (e.g., "good food" vs "good food good")
      if (words.length > existingWords.length && 
          existingWords.every(word => words.includes(word))) {
        return true
      }
      
      // Check for super-phrases (e.g., "good food" vs "very good food")
      if (words.length < existingWords.length && 
          words.every(word => existingWords.includes(word))) {
        return true
      }
    }
    
    return false
  }

  /**
   * Check if a phrase is low-value (repetitive, generic, or unactionable)
   */
  private isLowValuePattern(phrase: string): boolean {
    const normalized = phrase.toLowerCase()
    
    // Skip repetitive patterns
    const words = normalized.split(' ')
    if (words.length > 1 && words[0] === words[words.length - 1]) {
      return true // e.g., "good food good"
    }
    
    // Skip generic patterns that don't provide actionable insights
    const genericPatterns = [
      'very good', 'really good', 'quite good', 'pretty good',
      'not bad', 'not good', 'so so', 'okay okay',
      'good good', 'nice nice', 'great great'
    ]
    
    if (genericPatterns.includes(normalized)) {
      return true
    }
    
    // Skip patterns that are too generic
    if (words.length === 2 && 
        (words[0] === words[1] || 
         (words[0] === 'good' && words[1] === 'good') ||
         (words[0] === 'nice' && words[1] === 'nice'))) {
      return true
    }
    
    return false
  }

  /**
   * Check if an aspect is generic and doesn't provide actionable insights
   */
  private isGenericAspect(aspect: string): boolean {
    const genericAspects = [
      'thing', 'stuff', 'place', 'time', 'way', 'part', 'bit', 'lot',
      'experience', 'visit', 'trip', 'day', 'night', 'moment',
      'everything', 'nothing', 'something', 'anything'
    ]
    
    return genericAspects.includes(aspect.toLowerCase())
  }

  /**
   * Check if an aspect is low-value for business insights
   */
  private isLowValueAspect(aspect: string): boolean {
    const lowValueAspects = [
      'price', 'cost', 'money', 'cheap', 'expensive', 'value',
      'location', 'place', 'area', 'spot', 'zone',
      'time', 'wait', 'delay', 'speed', 'quick', 'slow'
    ]
    
    return lowValueAspects.includes(aspect.toLowerCase())
  }
}
