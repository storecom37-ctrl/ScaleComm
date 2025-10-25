'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Star, TrendingUp, TrendingDown, MessageSquare, Calendar, Users } from 'lucide-react'
import { formatLargeNumber } from '@/lib/utils'
import { RatingChart } from './rating-chart'
import { SentimentChart } from './sentiment-chart'

interface RatingReviewsSectionProps {
  brandId?: string
  storeId?: string
}

interface ReviewData {
  _id: string
  reviewer: {
    displayName: string
    profilePhotoUrl?: string
  }
  starRating: number
  comment: string
  createTime: string
  reply?: {
    comment: string
    updateTime: string
  }
  locationId: string
  locationName?: string
}

interface ReviewSummary {
  total: number
  positive: number
  negative: number
  neutral: number
}

interface RatingStats {
  totalReviews: number
  averageRating: number
  ratingDistribution: {
    1: number
    2: number
    3: number
    4: number
    5: number
  }
  monthlySentiment: Array<{
    month: string
    positive: number
    negative: number
    neutral: number
    total: number
  }>
  reviewsLast7Days: ReviewSummary
  reviewsLast30Days: ReviewSummary
}

export function RatingReviewsSection({ brandId, storeId }: RatingReviewsSectionProps) {
  const [data, setData] = useState<RatingStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isMounted, setIsMounted] = useState(true)

  const fetchRatingData = async (retryCount = 0) => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      if (brandId && brandId !== 'all') params.append('brandId', brandId)
      if (storeId && storeId !== 'all') params.append('storeId', storeId)

      const url = `/api/analytics/rating-reviews?${params.toString()}`;
      // Create AbortController for timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => {
        console.log('⏰ Request timeout after 60 seconds')
        controller.abort()
      }, 60000) // 60 second timeout for large datasets

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-cache',
        signal: controller.signal
      })
      
      // Clear timeout if request completed successfully
      clearTimeout(timeoutId)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()
      if (isMounted) {
        setData(result)
      }
    } catch (err) {
      console.error('Error fetching rating data:', err)
      
      // Check if it's an AbortError (timeout or manual abort)
      if (err instanceof Error && err.name === 'AbortError') {
        console.log('🚫 Request was aborted')
        if (retryCount < 3) {
          console.log(`Retrying fetch after abort (attempt ${retryCount + 1}/3)...`)
          setTimeout(() => fetchRatingData(retryCount + 1), 1000 * (retryCount + 1))
          return
        } else {
          if (isMounted) {
            setError('Request timed out. Please try again.')
          }
          return
        }
      }
      
      // Retry logic for network errors
      if (retryCount < 3 && (
        err instanceof TypeError || 
        (err instanceof Error && (
          err.message.includes('Failed to fetch') || 
          err.message.includes('NetworkError')
        ))
      )) {
        setTimeout(() => fetchRatingData(retryCount + 1), 1000 * (retryCount + 1))
        return
      }

      // Set appropriate error message
      let errorMessage = 'Unknown error'
      if (err instanceof Error) {
        if (err.message.includes('Failed to fetch')) {
          errorMessage = 'Network error. Please check your connection and try again.'
        } else {
          errorMessage = err.message
        }
      }
      
      if (isMounted) {
        setError(errorMessage)
      }
    } finally {
      if (isMounted) {
        setLoading(false)
      }
    }
  }

  useEffect(() => {
    setIsMounted(true)
    fetchRatingData()
    
    return () => {
      setIsMounted(false)
    }
  }, [brandId, storeId])

  if (loading) {
    return (
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Rating & Reviews Analytics</h3>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Rating & Reviews Analytics</h3>
        <div className="text-center py-8">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="h-6 w-6 text-red-600" />
          </div>
          <h4 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Reviews</h4>
          <p className="text-sm text-gray-600 mb-4">{error}</p>
          <div className="space-y-2">
            <Button 
              onClick={() => fetchRatingData()} 
              variant="outline"
              className="text-sm mr-2"
            >
              Try Again
            </Button>
            <Button 
              onClick={() => window.location.reload()} 
              variant="outline"
              className="text-sm"
            >
              Refresh Page
            </Button>
          </div>
          <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
            <p className="text-xs text-yellow-800">
              <strong>Network Issue:</strong> If this persists, check your internet connection or try refreshing the page.
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Rating & Reviews Analytics</h3>
        <div className="text-center py-8">
          <p className="text-gray-500">No rating data available</p>
        </div>
      </div>
    )
  }

  const getRatingPercentage = (rating: number) => {
    return data.ratingDistribution[rating as keyof typeof data.ratingDistribution] || 0
  }


  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Rating Chart */}
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
        <RatingChart 
          ratingDistribution={data.ratingDistribution}
          totalReviews={data.totalReviews}
          averageRating={data.averageRating}
          reviewsLast7Days={data.reviewsLast7Days}
          reviewsLast30Days={data.reviewsLast30Days}
        />
      </div>

      {/* Monthly Sentiment Chart */}
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
        <SentimentChart monthlySentiment={data.monthlySentiment} />
      </div>
    </div>
  )
}
