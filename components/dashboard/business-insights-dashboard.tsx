'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  Star,
  Tag,
  Lightbulb,
  Cloud,
  Target
} from 'lucide-react'

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

interface BusinessInsightsDashboardProps {
  brandId?: string
  storeId?: string
  type: 'brand' | 'store'
  analysisDays?: number
}

export function BusinessInsightsDashboard({ brandId, storeId, type, analysisDays = 30 }: BusinessInsightsDashboardProps) {
  const [insights, setInsights] = useState<BusinessInsights | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const fetchInsights = async () => {
    // Check if we have the required ID
    if (!brandId && !storeId) {
      console.warn('No brandId or storeId provided for business insights')
      return
    }

    setIsLoading(true)
    try {
    const params = new URLSearchParams()
    if (brandId && type === 'brand') params.append('brandId', brandId)
    if (storeId && type === 'store') params.append('storeId', storeId)
    params.append('type', type)
    params.append('days', analysisDays.toString())

      const response = await fetch(`/api/analytics/business-insights?${params.toString()}`)
      const result = await response.json()
      
      if (result.success) {
        setInsights(result.data)
      } else {
        console.error('Failed to fetch business insights:', result.error)
      }
    } catch (error) {
      console.error('Error fetching business insights:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchInsights()
  }, [brandId, storeId, type])

  if (isLoading && !insights) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin mr-2" />
        <span>Generating business insights...</span>
      </div>
    )
  }

  if (!insights) {
    return (
      <div className="text-center p-8">
        <Brain className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-semibold mb-2">No Business Insights Available</h3>
        <p className="text-muted-foreground mb-4">
          No reviews found to generate insights. Please sync some reviews first.
        </p>
        <Button onClick={fetchInsights} disabled={isLoading}>
          {isLoading ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Brain className="h-4 w-4 mr-2" />
              Generate Insights
            </>
          )}
        </Button>
      </div>
    )
  }

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'text-green-600 bg-green-100'
      case 'negative': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'text-red-600 bg-red-100'
      case 'medium': return 'text-yellow-600 bg-yellow-100'
      default: return 'text-green-600 bg-green-100'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Business Insights Dashboard</h2>
          <p className="text-muted-foreground">
            AI-powered insights and analytics for your {type}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchInsights}
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="keyword-cloud" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="keyword-cloud">Keyword Cloud</TabsTrigger>
          <TabsTrigger value="complaints">Top Complaints</TabsTrigger>
          <TabsTrigger value="product-feedback">Product Feedback</TabsTrigger>
          <TabsTrigger value="recommendations">AI Recommendations</TabsTrigger>
        </TabsList>

        {/* Keyword Cloud Tab */}
        <TabsContent value="keyword-cloud" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cloud className="h-5 w-5" />
                Keyword Cloud
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Most frequent words in reviews with sentiment analysis
              </p>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {insights.keywordCloud.map((keyword, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className={`${getSentimentColor(keyword.sentiment)} hover:opacity-80 cursor-pointer`}
                    title={`Category: ${keyword.category} | Frequency: ${keyword.frequency}`}
                  >
                    {keyword.word} ({keyword.frequency})
                  </Badge>
                ))}
              </div>
              {insights.keywordCloud.length === 0 && (
                <p className="text-muted-foreground text-center py-4">
                  No keywords found in reviews
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Top Complaints Tab */}
        <TabsContent value="complaints" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                Top Complaints
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Aggregated issues from negative reviews
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {insights.topComplaints.map((complaint, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge
                        variant="destructive"
                        className={getSeverityColor(complaint.severity)}
                      >
                        {complaint.severity}
                      </Badge>
                      <span className="font-medium">{complaint.complaint}</span>
                      <Badge variant="outline">{complaint.category}</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {complaint.frequency} occurrence{complaint.frequency !== 1 ? 's' : ''}
                    </div>
                  </div>
                ))}
                {insights.topComplaints.length === 0 && (
                  <p className="text-muted-foreground text-center py-4">
                    No complaints identified in reviews
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Product Feedback Tab */}
        <TabsContent value="product-feedback" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tag className="h-5 w-5" />
                Product Feedback
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Common tags related to products and food quality
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(
                  insights.productFeedback.reduce((acc, feedback) => {
                    if (!acc[feedback.category]) acc[feedback.category] = []
                    acc[feedback.category].push(feedback)
                    return acc
                  }, {} as Record<string, ProductFeedback[]>)
                ).map(([category, feedbacks]) => (
                  <div key={category} className="space-y-2">
                    <h4 className="font-medium capitalize">{category.replace('_', ' ')}</h4>
                    <div className="flex flex-wrap gap-2">
                      {feedbacks.map((feedback, index) => (
                        <Badge
                          key={index}
                          variant="secondary"
                          className={`${getSentimentColor(feedback.sentiment)} hover:opacity-80`}
                          title={`Frequency: ${feedback.frequency}`}
                        >
                          {feedback.tag} ({feedback.frequency})
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              {insights.productFeedback.length === 0 && (
                <p className="text-muted-foreground text-center py-4">
                  No product feedback found in reviews
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Recommendations Tab */}
        <TabsContent value="recommendations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-yellow-600" />
                AI-Powered Recommendations
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Actionable insights generated by AI analysis
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {insights.aiRecommendations.map((recommendation, index) => (
                  <div key={index} className="flex items-start gap-3 p-4 border rounded-lg bg-blue-50">
                    <Target className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="font-medium">{recommendation}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Sentiment Trend Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Sentiment Trend
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Sentiment distribution over different time periods
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {insights.sentimentTrend.map((trend, index) => (
              <div key={index} className="text-center p-4 border rounded-lg">
                <div className="text-sm font-medium mb-2">{trend.period}</div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-green-600">Positive</span>
                    <span>{trend.positive}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">Neutral</span>
                    <span>{trend.neutral}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-red-600">Negative</span>
                    <span>{trend.negative}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}


