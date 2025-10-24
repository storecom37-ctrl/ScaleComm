'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Brain, 
  RefreshCw, 
  BarChart3, 
  MessageSquare, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Users,
  Star
} from 'lucide-react'
// import { BusinessInsightsDashboard } from './business-insights-dashboard'
import { RatingDistribution } from './rating-distribution'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface SentimentPeriodData {
  total: number
  positive: number
  negative: number
  neutral: number
  percentages: {
    positive: number
    negative: number
    neutral: number
  }
  averageScore: number
}

interface SentimentAnalytics {
  entityId: string
  entityType: 'brand' | 'store'
  lastAnalyzed: Date
  overallSentiment: 'positive' | 'negative' | 'neutral'
  overallConfidence: number
  overallScore: number
  overallTrend: 'improving' | 'declining' | 'stable' | 'new'
  periods: {
    '7d': SentimentPeriodData
    '30d': SentimentPeriodData
    '60d': SentimentPeriodData
    '90d': SentimentPeriodData
  }
  topPositiveThemes: string[]
  topNegativeThemes: string[]
  recommendations: string[]
  totalReviewsAnalyzed: number
  lastReviewDate?: Date
  processingStats?: {
    totalReviews: number
    processedInThisRun: number
    remainingToProcess: number
    processingComplete: boolean
    lastProcessedAt: Date
  }
}

interface SentimentDashboardProps {
  brandId?: string
  storeId?: string
  type: 'brand' | 'store'
}

export function SentimentDashboard({ brandId, storeId, type }: SentimentDashboardProps) {
  const [analytics, setAnalytics] = useState<SentimentAnalytics | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '60d' | '90d'>('30d')
  const [analysisDays, setAnalysisDays] = useState<number>(30) // Analysis period in days
  const [progress, setProgress] = useState(0)
  const [statusMessage, setStatusMessage] = useState('')
  const [ratingStats, setRatingStats] = useState<{
    totalReviews: number
    averageRating: number
    ratingDistribution: { 1: number; 2: number; 3: number; 4: number; 5: number }
  } | null>(null)

  const fetchAnalytics = async (force = false, retryCount = 0) => {
    // Check if we have the required ID
    if (!brandId && !storeId) {
      console.warn('No brandId or storeId provided for sentiment analytics')
      setAnalytics(null)
      return
    }

    setIsLoading(true)
    setProgress(0)
    setStatusMessage(retryCount > 0 ? `Retrying analysis (attempt ${retryCount + 1})...` : 'Initializing analysis...')
    
    // Declare variables at function scope
    let timeoutId: NodeJS.Timeout | undefined
    let progressInterval: NodeJS.Timeout | undefined
    
    try {
      const params = new URLSearchParams()
      if (brandId && type === 'brand') params.append('brandId', brandId)
      if (storeId && type === 'store') params.append('storeId', storeId)
      params.append('type', type)
      params.append('days', analysisDays.toString())
      if (force) params.append('force', 'true')

      setStatusMessage('Fetching data from server...')
      setProgress(20)

      // Add timeout to prevent hanging - increased to 5 minutes for large datasets
      const controller = new AbortController()
      timeoutId = setTimeout(() => {
        controller.abort()
      }, 300000) // 5 minute timeout

      setStatusMessage('Processing sentiment analysis... This may take several minutes for large datasets.')
      setProgress(40)
      
      // Add progress simulation for long-running operations
      progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev < 70) {
            setStatusMessage(`Processing sentiment analysis... ${Math.round(prev)}% complete`)
            return prev + 1
          }
          return prev
        })
      }, 1000)

      const response = await fetch(`/api/analytics/sentiment?${params.toString()}`, {
        signal: controller.signal
      })
      
      if (timeoutId) clearTimeout(timeoutId)
      if (progressInterval) clearInterval(progressInterval)
      setProgress(80)
      setStatusMessage('Finalizing results...')
      
      const result = await response.json()
      
      if (result.success) {
        setAnalytics(result.data)
        setProgress(100)
        setStatusMessage('Analysis complete!')
      } else {
        console.error('Failed to fetch analytics:', result.error)
        setAnalytics(null)
        setStatusMessage('Analysis failed: ' + (result.error || 'Unknown error'))
      }
    } catch (error: any) {
      console.error('Error fetching sentiment analytics:', error)
      
      // Clear intervals and timeouts
      if (timeoutId) clearTimeout(timeoutId)
      if (progressInterval) clearInterval(progressInterval)
      
      // Retry logic for network errors and timeouts
      if (retryCount < 2 && (error.name === 'AbortError' || (error.name === 'TypeError' && error.message.includes('fetch')))) {
        setTimeout(() => {
          fetchAnalytics(force, retryCount + 1)
        }, 2000 * (retryCount + 1)) // Exponential backoff
        return
      }
      
      if (error.name === 'AbortError') {
        setStatusMessage('Analysis timed out - the dataset is large and needs more time. Please try again or contact support.')
      } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
        setStatusMessage('Network error - please check your connection and try again')
      } else {
        setStatusMessage('Error: ' + (error.message || 'Unknown error occurred'))
      }
      setAnalytics(null)
    } finally {
      setIsLoading(false)
      setTimeout(() => {
        setProgress(0)
        setStatusMessage('')
      }, 2000) // Clear progress after 2 seconds
    }
  }

  const fetchRatingStatistics = async () => {
    if (!brandId && !storeId) return
    try {
      const params = new URLSearchParams()
      if (brandId && type === 'brand') params.append('brandId', brandId)
      if (storeId && type === 'store') params.append('storeId', storeId)
      params.append('limit', '1')
      const res = await fetch(`/api/reviews?${params.toString()}`)
      const json = await res.json()
      if (json?.success && json?.metadata?.statistics) {
        const s = json.metadata.statistics
        setRatingStats({
          totalReviews: s.totalReviews || 0,
          averageRating: s.averageRating || 0,
          ratingDistribution: s.ratingDistribution || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
        })
      }
    } catch (e) {
      setRatingStats(null)
    }
  }


  const [monthlySeries, setMonthlySeries] = useState<any[]>([])

  const getMonthlyData = () => monthlySeries

  const fetchMonthlySeries = async () => {
    if (!brandId && !storeId) return
    const params = new URLSearchParams()
    if (brandId && type === 'brand') params.append('brandId', brandId)
    if (storeId && type === 'store') params.append('storeId', storeId)
    try {
      const res = await fetch(`/api/analytics/sentiment/monthly?${params.toString()}`)
      const json = await res.json()
      if (json?.success) setMonthlySeries(json.data)
      else setMonthlySeries([])
    } catch {
      setMonthlySeries([])
    }
  }

  const MonthlySentimentChart = ({ data }: { data: any[] }) => {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line 
            type="monotone" 
            dataKey="positive" 
            stroke="#10b981" 
            strokeWidth={2}
            name="Positive"
          />
          <Line 
            type="monotone" 
            dataKey="negative" 
            stroke="#ef4444" 
            strokeWidth={2}
            name="Negative"
          />
        </LineChart>
      </ResponsiveContainer>
    )
  }

  const handleAnalyze = async () => {
    setIsAnalyzing(true)
    try {
      await fetchAnalytics(true)
    } finally {
      setIsAnalyzing(false)
    }
  }

  useEffect(() => {
    fetchAnalytics()
    fetchMonthlySeries()
    fetchRatingStatistics()
  }, [brandId, storeId, type])

  if (!brandId && !storeId) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <AlertTriangle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground">Please select a brand or store to view sentiment analytics</p>
        </div>
      </div>
    )
  }

  if (isLoading && !analytics) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-2">Processing Sentiment Analytics</h3>
          <p className="text-muted-foreground mb-4">
            {statusMessage || 'Analyzing reviews and generating insights...'}
          </p>
          {progress > 0 && (
            <div className="w-full max-w-md">
              <div className="flex justify-between text-sm text-muted-foreground mb-1">
                <span>Progress</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
          <p className="text-sm text-muted-foreground mt-4">
            This may take a few minutes for large datasets...
          </p>
        </div>
      </div>
    )
  }


  if (!analytics) {
    return (
      <div className="text-center p-8">
        <Brain className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-semibold mb-2">No Sentiment Data Available</h3>
        <p className="text-muted-foreground mb-4">
          No reviews have been analyzed yet. Click the button below to start analysis.
        </p>
        <Button onClick={handleAnalyze} disabled={isAnalyzing}>
          {isAnalyzing ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Brain className="h-4 w-4 mr-2" />
              Analyze Sentiment
            </>
          )}
        </Button>
      </div>
    )
  }

  const currentPeriod = analytics.periods[selectedPeriod]
  const trendIcon = analytics.overallTrend === 'improving' ? TrendingUp : 
                   analytics.overallTrend === 'declining' ? TrendingDown : Minus
  const trendColor = analytics.overallTrend === 'improving' ? 'text-positive' :
                     analytics.overallTrend === 'declining' ? 'text-negative' : 'text-gray-600'

  return (
    <div className="space-y-6">
      {/* Rating Distribution and Monthly Trends Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RatingDistribution
          totalReviews={ratingStats?.totalReviews || 0}
          averageRating={ratingStats?.averageRating || 0}
          ratingDistribution={ratingStats?.ratingDistribution || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }}
        />
        
        <Card>
          <CardHeader>
            <CardTitle>Monthly Sentiment Analysis</CardTitle>
            <CardDescription>
              Track sentiment trends over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              <MonthlySentimentChart data={getMonthlyData()} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Sentiment Analytics</h2>
          <p className="text-muted-foreground">
            Comprehensive sentiment analysis for your {type}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchAnalytics()}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={handleAnalyze}
            disabled={isAnalyzing}
          >
            {isAnalyzing ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Brain className="h-4 w-4 mr-2" />
                Re-analyze
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overall Sentiment</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold capitalize ${analytics.overallSentiment === 'positive' ? 'text-green-600' : analytics.overallSentiment === 'neutral' ? 'text-yellow-600' : 'text-red-600'}`}>{analytics.overallSentiment}</div>
            <p className="text-xs text-muted-foreground">
              Confidence: {(analytics.overallConfidence * 100).toFixed(1)}%
            </p>
            <div className="flex items-center mt-2">
              {React.createElement(trendIcon, { className: `h-4 w-4 mr-1 ${trendColor}` })}
              <span className={`text-sm ${trendColor}`}>
                {analytics.overallTrend}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Positive Reviews</CardTitle>
            <CheckCircle className="h-4 w-4 text-positive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {currentPeriod.percentages.positive.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {currentPeriod.positive} of {currentPeriod.total} reviews
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Neutral Reviews</CardTitle>
            <Minus className="h-4 w-4 text-neutral" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {currentPeriod.percentages.neutral.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {currentPeriod.neutral} of {currentPeriod.total} reviews
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Negative Reviews</CardTitle>
            <AlertTriangle className="h-4 w-4 text-negative" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {currentPeriod.percentages.negative.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {currentPeriod.negative} of {currentPeriod.total} reviews
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Reviews</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalReviewsAnalyzed}</div>
            <p className="text-xs text-muted-foreground">
              Reviews analyzed in the last {analysisDays} days
            </p>
          </CardContent>
        </Card>
      </div>

      

      {/* Main Content Tabs */}
      <Tabs defaultValue="themes" className="space-y-4">
        <TabsList>
          <TabsTrigger value="themes">Themes</TabsTrigger>
          <TabsTrigger value="review-analysis">Review Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="themes" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Positive Themes */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Positive Themes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {analytics.topPositiveThemes.length > 0 ? (
                    analytics.topPositiveThemes.map((theme, index) => (
                      <Badge key={index} variant="secondary" className="mr-2 mb-2">
                        {theme}
                      </Badge>
                    ))
                  ) : (
                    <p className="text-muted-foreground">No positive themes identified</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Negative Themes */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  Negative Themes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {analytics.topNegativeThemes.length > 0 ? (
                    analytics.topNegativeThemes.map((theme, index) => (
                      <Badge key={index} variant="destructive" className="mr-2 mb-2">
                        {theme}
                      </Badge>
                    ))
                  ) : (
                    <p className="text-muted-foreground">No negative themes identified</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>



        <TabsContent value="review-analysis" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Review Analysis</CardTitle>
              <p className="text-sm text-muted-foreground">
                Detailed analysis of individual reviews and sentiment patterns
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Review Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {analytics?.totalReviewsAnalyzed || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">Total Reviews</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {analytics?.overallConfidence ? (analytics.overallConfidence * 100).toFixed(1) : 0}%
                    </div>
                    <div className="text-sm text-muted-foreground">Confidence</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">
                      {analytics?.overallScore ? (analytics.overallScore * 100).toFixed(1) : 0}%
                    </div>
                    <div className="text-sm text-muted-foreground">Overall Score</div>
                  </div>
                </div>

                {/* Recent Reviews */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Recent Review Analysis</h3>
                  <div className="space-y-3">
                    {[
                      { text: "Great food and excellent service!", sentiment: "positive", score: 0.9 },
                      { text: "Food was okay but service was slow", sentiment: "neutral", score: 0.3 },
                      { text: "Terrible experience, will not return", sentiment: "negative", score: -0.8 },
                      { text: "Amazing place with friendly staff", sentiment: "positive", score: 0.95 },
                      { text: "Average food, nothing special", sentiment: "neutral", score: 0.1 }
                    ].map((review, index) => (
                      <div key={index} className="p-4 border rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <p className="text-sm">{review.text}</p>
                          <Badge variant={review.sentiment === 'positive' ? 'default' : review.sentiment === 'negative' ? 'destructive' : 'secondary'}>
                            {review.sentiment}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Score: {review.score > 0 ? '+' : ''}{review.score.toFixed(2)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
