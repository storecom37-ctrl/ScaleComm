import { useState, useCallback } from 'react'
import useSWR from 'swr'

interface SentimentData {
  sentiment: 'positive' | 'negative' | 'neutral'
  confidence: number
  score: number
  method: 'rule-based' | 'ai' | 'hybrid'
  reasoning?: string
  analyzedAt?: Date
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

interface AnalyzeSentimentResponse {
  success: boolean
  data?: {
    review: any
    sentiment: SentimentData
  }
  error?: string
}

interface BatchAnalyzeResponse {
  success: boolean
  data?: {
    reviews: any[]
    statistics: SentimentStats
    analyzedCount: number
  }
  error?: string
}

// Fetcher function for SWR
const fetcher = (url: string) => fetch(url).then(res => res.json())

export function useSentimentAnalysis(reviewId: string) {
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  // Fetch existing sentiment analysis
  const { data, error, isLoading, mutate } = useSWR(
    reviewId ? `/api/reviews/sentiment?reviewId=${reviewId}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      refreshInterval: 0
    }
  )

  // Analyze sentiment for a single review
  const analyzeSentiment = useCallback(async (reviewId: string) => {
    setIsAnalyzing(true)
    try {
      const response = await fetch(`/api/reviews/sentiment?reviewId=${reviewId}`, {
        method: 'GET'
      })
      
      const result: AnalyzeSentimentResponse = await response.json()
      
      if (result.success) {
        // Revalidate the data
        mutate()
        return result.data
      } else {
        throw new Error(result.error || 'Failed to analyze sentiment')
      }
    } catch (error) {
      console.error('Sentiment analysis error:', error)
      throw error
    } finally {
      setIsAnalyzing(false)
    }
  }, [mutate])

  return {
    sentimentData: data?.success ? data.data?.sentiment : null,
    isLoading: isLoading || isAnalyzing,
    error: error || (data?.success === false ? data.error : null),
    analyzeSentiment,
    isAnalyzing
  }
}

export function useBatchSentimentAnalysis() {
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  // Analyze sentiment for multiple reviews
  const analyzeBatch = useCallback(async (reviewIds: string[]) => {
    setIsAnalyzing(true)
    try {
      const response = await fetch('/api/reviews/sentiment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          reviewIds,
          batchSize: 10
        })
      })
      
      const result: BatchAnalyzeResponse = await response.json()
      
      if (result.success) {
        return result.data
      } else {
        throw new Error(result.error || 'Failed to analyze sentiment batch')
      }
    } catch (error) {
      console.error('Batch sentiment analysis error:', error)
      throw error
    } finally {
      setIsAnalyzing(false)
    }
  }, [])

  return {
    analyzeBatch,
    isAnalyzing
  }
}

export function useSentimentStats(reviewIds: string[]) {
  const { data, error, isLoading, mutate } = useSWR(
    reviewIds.length > 0 ? `/api/reviews/sentiment?reviewIds=${reviewIds.join(',')}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      refreshInterval: 0
    }
  )

  return {
    stats: data?.success ? data.data?.statistics : null,
    isLoading,
    error: error || (data?.success === false ? data.error : null),
    refresh: mutate
  }
}
