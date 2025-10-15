"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  BarChart3,
  RefreshCw,
  Calendar,
  Target,
  AlertTriangle,
  CheckCircle,
  Brain,
  Clock
} from 'lucide-react'

interface SentimentAnalyticsProps {
  storeId?: string
  brandId?: string
  type: 'store' | 'brand'
}

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

export function SentimentAnalyticsCard({ storeId, brandId, type }: SentimentAnalyticsProps) {
  const [analytics, setAnalytics] = useState<SentimentAnalytics | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '60d' | '90d'>('30d')

  const fetchAnalytics = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (storeId) params.append('storeId', storeId)
      if (brandId) params.append('brandId', brandId)
      params.append('type', type)

      const response = await fetch(`/api/analytics/sentiment?${params.toString()}`)
      const result = await response.json()
      
      if (result.success) {
        setAnalytics(result.data)
      } else {
        console.error('Failed to fetch sentiment analytics:', result.error)
      }
    } catch (error) {
      console.error('Error fetching sentiment analytics:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalytics()
  }, [storeId, brandId, type])

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving':
        return <TrendingUp className="h-4 w-4 text-green-600" />
      case 'declining':
        return <TrendingDown className="h-4 w-4 text-red-600" />
      case 'stable':
        return <Minus className="h-4 w-4 text-gray-600" />
      default:
        return <Minus className="h-4 w-4 text-gray-400" />
    }
  }

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'improving':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'declining':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'stable':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      default:
        return 'bg-gray-100 text-gray-500 border-gray-200'
    }
  }

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Brain className="h-4 w-4" />
            Sentiment Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <RefreshCw className="h-4 w-4 animate-spin text-gray-400" />
            <span className="ml-2 text-sm text-gray-500">Analyzing sentiment...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!analytics) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Brain className="h-4 w-4" />
            Sentiment Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={fetchAnalytics} size="sm" className="w-full">
            <RefreshCw className="h-3 w-3 mr-2" />
            Load Sentiment Analytics
          </Button>
        </CardContent>
      </Card>
    )
  }

  const currentData = analytics.periods[selectedPeriod]

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Brain className="h-4 w-4" />
          Sentiment Analytics
          <Badge variant="outline" className="text-xs">
            {analytics.storeName || analytics.brandName}
          </Badge>
        </CardTitle>
        <CardDescription className="text-xs">
          Customer sentiment analysis over time
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Period Selector */}
        <div className="flex gap-1">
          {(['7d', '30d', '60d', '90d'] as const).map((period) => (
            <Button
              key={period}
              size="sm"
              variant={selectedPeriod === period ? "default" : "outline"}
              onClick={() => setSelectedPeriod(period)}
              className="text-xs"
            >
              {period}
            </Button>
          ))}
        </div>

        {/* Current Period Overview */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium">Last {selectedPeriod}</span>
            </div>
            <div className="flex items-center gap-2">
              {getTrendIcon(currentData.trend)}
              <Badge className={getTrendColor(currentData.trend)}>
                {currentData.trend}
              </Badge>
            </div>
          </div>

          {/* Sentiment Distribution */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-green-600" />
                Positive
              </span>
              <span>{currentData.sentiment.positive} ({currentData.percentages.positive.toFixed(1)}%)</span>
            </div>
            <Progress value={currentData.percentages.positive} className="h-2" />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="flex items-center gap-1">
                <Minus className="h-3 w-3 text-gray-600" />
                Neutral
              </span>
              <span>{currentData.sentiment.neutral} ({currentData.percentages.neutral.toFixed(1)}%)</span>
            </div>
            <Progress value={currentData.percentages.neutral} className="h-2" />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="flex items-center gap-1">
                <TrendingDown className="h-3 w-3 text-red-600" />
                Negative
              </span>
              <span>{currentData.sentiment.negative} ({currentData.percentages.negative.toFixed(1)}%)</span>
            </div>
            <Progress value={currentData.percentages.negative} className="h-2" />
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-2 gap-4 pt-2 border-t">
            <div>
              <div className="text-xs text-gray-500">Avg Score</div>
              <div className="text-sm font-medium">
                {currentData.averageScore > 0 ? '+' : ''}{currentData.averageScore.toFixed(2)}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Confidence</div>
              <div className="text-sm font-medium">
                {(currentData.averageConfidence * 100).toFixed(0)}%
              </div>
            </div>
          </div>

          {/* Key Insights */}
          {currentData.keyInsights.length > 0 && (
            <div className="pt-2 border-t">
              <div className="text-xs font-medium mb-2 flex items-center gap-1">
                <Target className="h-3 w-3" />
                Key Insights
              </div>
              <div className="space-y-1">
                {currentData.keyInsights.map((insight, index) => (
                  <div key={index} className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                    {insight}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Themes */}
          {(currentData.topPositiveThemes.length > 0 || currentData.topNegativeThemes.length > 0) && (
            <div className="pt-2 border-t">
              <div className="text-xs font-medium mb-2">Common Themes</div>
              <div className="grid grid-cols-2 gap-2">
                {currentData.topPositiveThemes.length > 0 && (
                  <div>
                    <div className="text-xs text-green-600 font-medium mb-1">Positive</div>
                    <div className="flex flex-wrap gap-1">
                      {currentData.topPositiveThemes.slice(0, 3).map((theme, index) => (
                        <Badge key={index} variant="outline" className="text-xs bg-green-50 text-green-700">
                          {theme}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {currentData.topNegativeThemes.length > 0 && (
                  <div>
                    <div className="text-xs text-red-600 font-medium mb-1">Negative</div>
                    <div className="flex flex-wrap gap-1">
                      {currentData.topNegativeThemes.slice(0, 3).map((theme, index) => (
                        <Badge key={index} variant="outline" className="text-xs bg-red-50 text-red-700">
                          {theme}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {analytics.recommendations.length > 0 && (
            <div className="pt-2 border-t">
              <div className="text-xs font-medium mb-2 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Recommendations
              </div>
              <div className="space-y-1">
                {analytics.recommendations.slice(0, 3).map((recommendation, index) => (
                  <div key={index} className="text-xs text-blue-600 bg-blue-50 p-2 rounded">
                    {recommendation}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Last Updated */}
          <div className="pt-2 border-t">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Last updated
              </div>
              <div>
                {new Date(analytics.lastUpdated).toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>

        {/* Refresh Button */}
        <Button 
          onClick={fetchAnalytics}
          disabled={isLoading}
          size="sm"
          variant="outline"
          className="w-full"
        >
          {isLoading ? (
            <>
              <RefreshCw className="h-3 w-3 mr-2 animate-spin" />
              Refreshing...
            </>
          ) : (
            <>
              <RefreshCw className="h-3 w-3 mr-2" />
              Refresh Analytics
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}

export function SentimentTrendCard({ analytics }: { analytics: SentimentAnalytics }) {
  const periods = ['7d', '30d', '60d', '90d'] as const

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'improving':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'declining':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'stable':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          Sentiment Trends
        </CardTitle>
        <CardDescription className="text-xs">
          Sentiment progression over time
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {periods.map((period) => {
          const data = analytics.periods[period]
          return (
            <div key={period} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Last {period}</span>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {data.totalReviews} reviews
                  </Badge>
                  <Badge className={getTrendColor(data.trend)}>
                    {data.trend}
                  </Badge>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="text-center">
                  <div className="text-green-600 font-medium">{data.percentages.positive.toFixed(0)}%</div>
                  <div className="text-gray-500">Positive</div>
                </div>
                <div className="text-center">
                  <div className="text-gray-600 font-medium">{data.percentages.neutral.toFixed(0)}%</div>
                  <div className="text-gray-500">Neutral</div>
                </div>
                <div className="text-center">
                  <div className="text-red-600 font-medium">{data.percentages.negative.toFixed(0)}%</div>
                  <div className="text-gray-500">Negative</div>
                </div>
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
