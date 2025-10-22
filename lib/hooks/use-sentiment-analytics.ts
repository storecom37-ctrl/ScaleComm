import { useState, useCallback } from 'react'
import useSWR from 'swr'

interface AggregatedSentimentData {
  period: '7d' | '30d' | '60d' | '90d'
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

interface SentimentAnalytics {
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

// Fetcher function for SWR
const fetcher = (url: string) => fetch(url).then(res => res.json())

export function useSentimentAnalytics(storeId?: string, brandId?: string, type: 'store' | 'brand' = 'store') {
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  // Build query parameters
  const params = new URLSearchParams()
  if (storeId) params.append('storeId', storeId)
  if (brandId) params.append('brandId', brandId)
  params.append('type', type)

  const { data, error, isLoading, mutate } = useSWR(
    (storeId || brandId) ? `/api/analytics/sentiment?${params.toString()}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      refreshInterval: 0
    }
  )

  // Analyze sentiment for a specific store or brand
  const analyzeSentiment = useCallback(async (targetStoreId?: string, targetBrandId?: string) => {
    setIsAnalyzing(true)
    try {
      const analysisParams = new URLSearchParams()
      if (targetStoreId) analysisParams.append('storeId', targetStoreId)
      if (targetBrandId) analysisParams.append('brandId', targetBrandId)
      analysisParams.append('type', targetStoreId ? 'store' : 'brand')

      const response = await fetch(`/api/analytics/sentiment?${analysisParams.toString()}`)
      const result = await response.json()
      
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
    analytics: data?.success ? data.data : null,
    isLoading: isLoading || isAnalyzing,
    error: error || (data?.success === false ? data.error : null),
    analyzeSentiment,
    isAnalyzing
  }
}

export function useBatchSentimentAnalytics() {
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  // Analyze sentiment for multiple stores or brands
  const analyzeBatch = useCallback(async (storeIds?: string[], brandIds?: string[]) => {
    setIsAnalyzing(true)
    try {
      const response = await fetch('/api/analytics/sentiment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          storeIds,
          brandIds
        })
      })
      
      const result = await response.json()
      
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

export function useSentimentAnalyticsComparison(ids: string[], type: 'store' | 'brand' = 'store') {
  const [analytics, setAnalytics] = useState<SentimentAnalytics[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const fetchComparison = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/analytics/sentiment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          storeIds: type === 'store' ? ids : undefined,
          brandIds: type === 'brand' ? ids : undefined
        })
      })
      
      const result = await response.json()
      
      if (result.success) {
        setAnalytics(result.data)
        return result.data
      } else {
        throw new Error(result.error || 'Failed to fetch comparison data')
      }
    } catch (error) {
      console.error('Sentiment comparison error:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [ids, type])

  return {
    analytics,
    isLoading,
    fetchComparison
  }
}
