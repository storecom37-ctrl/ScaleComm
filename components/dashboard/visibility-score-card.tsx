"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { 
  Star, 
  TrendingUp, 
  Eye, 
  Phone, 
  Globe, 
  MapPin, 
  MessageSquare,
  FileText,
  AlertTriangle,
  CheckCircle,
  Target,
  BarChart3
} from "lucide-react"
import { ScoringDetails, ScoringBreakdown } from "@/lib/utils/scoring"

interface VisibilityScoreCardProps {
  scoringDetails: ScoringDetails
  isLoading?: boolean
}

export function VisibilityScoreCard({ scoringDetails, isLoading }: VisibilityScoreCardProps) {
  const { breakdown, grade, interpretation, recommendations, keyRatios } = scoringDetails
  const maxScore = 100
  const totalGap = Math.max(0, maxScore - breakdown.totalScore)
  
  const getGradeColor = (grade: string) => {
    switch (grade.charAt(0)) {
      case 'A': return 'text-green-600 bg-green-50 border-green-200'
      case 'B': return 'text-blue-600 bg-blue-50 border-blue-200'
      case 'C': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'D': return 'text-orange-600 bg-orange-50 border-orange-200'
      case 'F': return 'text-red-600 bg-red-50 border-red-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600'
    if (score >= 80) return 'text-blue-600'
    if (score >= 70) return 'text-yellow-600'
    if (score >= 60) return 'text-orange-600'
    return 'text-red-600'
  }

  const getProgressColor = (score: number) => {
    if (score >= 90) return 'bg-green-500'
    if (score >= 80) return 'bg-blue-500'
    if (score >= 70) return 'bg-yellow-500'
    if (score >= 60) return 'bg-orange-500'
    return 'bg-red-500'
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Local Visibility Score
          </CardTitle>
          <CardDescription>Calculating your business visibility score...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="space-y-2">
              <div className="h-3 bg-gray-200 rounded"></div>
              <div className="h-3 bg-gray-200 rounded w-5/6"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Local Visibility Score
            </CardTitle>
            <CardDescription>Comprehensive performance evaluation</CardDescription>
          </div>
          <Badge className={`text-lg px-4 py-2 ${getGradeColor(grade)}`}>
            {grade}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Score */}
        <div className="text-center space-y-2">
          <div className={`text-4xl font-bold ${getScoreColor(breakdown.totalScore)}`}>
            {breakdown.totalScore}/100
          </div>
          <Progress 
            value={breakdown.totalScore} 
            className="h-3"
          />
          <div className="text-xs text-muted-foreground">
            Gap to 100: <span className="font-medium text-foreground">{totalGap}</span>
          </div>
          <p className="text-sm text-muted-foreground">{interpretation}</p>
        </div>

        {/* Component Breakdown */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Reviews & Rating (30%) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-yellow-500" />
                <span className="text-sm font-medium">Reviews & Rating</span>
              </div>
              <span className={`text-sm font-semibold ${getScoreColor(breakdown.reviewsScore)}`}>
                {breakdown.reviewsScore}/100
              </span>
            </div>
            <Progress value={breakdown.reviewsScore} className="h-2" />
            <div className="text-[10px] text-muted-foreground">Gap: {Math.max(0, maxScore - breakdown.reviewsScore)}</div>
          </div>

          {/* Performance Engagement (40%) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium">Performance</span>
              </div>
              <span className={`text-sm font-semibold ${getScoreColor(breakdown.performanceScore)}`}>
                {breakdown.performanceScore}/100
              </span>
            </div>
            <Progress value={breakdown.performanceScore} className="h-2" />
            <div className="text-[10px] text-muted-foreground">Gap: {Math.max(0, maxScore - breakdown.performanceScore)}</div>
          </div>

          {/* Profile Activity (20%) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">Profile Activity</span>
              </div>
              <span className={`text-sm font-semibold ${getScoreColor(breakdown.profileScore)}`}>
                {breakdown.profileScore}/100
              </span>
            </div>
            <Progress value={breakdown.profileScore} className="h-2" />
            <div className="text-[10px] text-muted-foreground">Gap: {Math.max(0, maxScore - breakdown.profileScore)}</div>
          </div>

          {/* Competitive Context (10%) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-purple-500" />
                <span className="text-sm font-medium">Market Position</span>
              </div>
              <span className={`text-sm font-semibold ${getScoreColor(breakdown.competitiveScore)}`}>
                {breakdown.competitiveScore}/100
              </span>
            </div>
            <Progress value={breakdown.competitiveScore} className="h-2" />
            <div className="text-[10px] text-muted-foreground">Gap: {Math.max(0, maxScore - breakdown.competitiveScore)}</div>
          </div>
        </div>

        {/* Key Ratios */}
        <div className="space-y-3">
          {/* <h4 className="text-sm font-semibold flex items-center gap-2">
            <Target className="h-4 w-4" />
            Key Performance Ratios
          </h4> */}
          <div className="grid gap-3 md:grid-cols-2">
            <div className="flex items-center justify-between p-2 bg-muted rounded">
              <div className="flex items-center gap-2">
                <Phone className="h-3 w-3" />
                <span className="text-xs">Call Rate</span>
              </div>
              <span className="text-xs font-medium">{keyRatios.callRate.toFixed(1)}%</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-muted rounded">
              <div className="flex items-center gap-2">
                <Globe className="h-3 w-3" />
                <span className="text-xs">Website Rate</span>
              </div>
              <span className="text-xs font-medium">{keyRatios.websiteRate.toFixed(1)}%</span>
            </div>
            {/* <div className="flex items-center justify-between p-2 bg-muted rounded">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-3 w-3" />
                <span className="text-xs">Response Rate</span>
              </div>
              <span className="text-xs font-medium">{keyRatios.responseRate.toFixed(1)}%</span>
            </div> */}
          </div>
        </div>

        {/* Recommendations */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Recommendations
          </h4>
          <div className="space-y-2">
            {recommendations.slice(0, 3).map((recommendation, index) => (
              <div key={index} className="flex items-start gap-2 p-2 bg-blue-50 rounded text-sm">
                <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <span className="text-blue-800">{recommendation}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
