"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle, 
  Target,
  Star,
  MessageSquare,
  Phone,
  Globe,
  MapPin,
  FileText,
  Lightbulb,
  BarChart3
} from "lucide-react"
import { ScoringDetails } from "@/lib/utils/scoring"

interface ScoringInsightsProps {
  scoringDetails: ScoringDetails
  isLoading?: boolean
}

export function ScoringInsights({ scoringDetails, isLoading }: ScoringInsightsProps) {
  const { breakdown, recommendations, keyRatios, interpretation } = scoringDetails
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            Scoring Insights & Recommendations
          </CardTitle>
          <CardDescription>Analyzing your performance data...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
            <div className="space-y-2">
              <div className="h-3 bg-gray-200 rounded"></div>
              <div className="h-3 bg-gray-200 rounded w-5/6"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Identify strengths and weaknesses
  const strengths = []
  const weaknesses = []
  
  if (breakdown.reviewsScore >= 80) {
    strengths.push("Strong review performance")
  } else if (breakdown.reviewsScore < 60) {
    weaknesses.push("Review management needs improvement")
  }
  
  if (breakdown.performanceScore >= 80) {
    strengths.push("Excellent engagement metrics")
  } else if (breakdown.performanceScore < 60) {
    weaknesses.push("Low conversion rates")
  }
  
  if (breakdown.profileScore >= 80) {
    strengths.push("Complete profile information")
  } else if (breakdown.profileScore < 60) {
    weaknesses.push("Incomplete profile setup")
  }
  
  if (keyRatios.responseRate >= 80) {
    strengths.push("Active review responses")
  } else if (keyRatios.responseRate < 50) {
    weaknesses.push("Poor review response rate")
  }

  // Priority recommendations based on scoring
  const priorityRecommendations = recommendations.slice(0, 5)
  
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Performance Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Performance Analysis
          </CardTitle>
          <CardDescription>Key insights from your visibility score</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Overall Assessment */}
          <div className="p-4 bg-muted rounded-lg">
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <Target className="h-4 w-4" />
              Overall Assessment
            </h4>
            <p className="text-sm text-muted-foreground">{interpretation}</p>
          </div>

          {/* Strengths */}
          {strengths.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-semibold text-green-700 flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Strengths
              </h4>
              <div className="space-y-1">
                {strengths.map((strength, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>{strength}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Weaknesses */}
          {weaknesses.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-semibold text-red-700 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Areas for Improvement
              </h4>
              <div className="space-y-1">
                {weaknesses.map((weakness, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    <span>{weakness}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Plan */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            Priority Action Plan
          </CardTitle>
          <CardDescription>Focus areas for maximum impact</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Key Ratios */}
          <div className="space-y-3">
            <h4 className="font-semibold">Current Performance Ratios</h4>
            <div className="grid gap-2">
              <div className="flex items-center justify-between p-2 bg-muted rounded">
                <div className="flex items-center gap-2">
                  <Phone className="h-3 w-3" />
                  <span className="text-xs">Call Rate</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium">{keyRatios.callRate.toFixed(1)}%</span>
                  {keyRatios.callRate >= 2 ? (
                    <CheckCircle className="h-3 w-3 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-3 w-3 text-yellow-500" />
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between p-2 bg-muted rounded">
                <div className="flex items-center gap-2">
                  <Globe className="h-3 w-3" />
                  <span className="text-xs">Website Rate</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium">{keyRatios.websiteRate.toFixed(1)}%</span>
                  {keyRatios.websiteRate >= 3 ? (
                    <CheckCircle className="h-3 w-3 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-3 w-3 text-yellow-500" />
                  )}
                </div>
              </div>
              {/* <div className="flex items-center justify-between p-2 bg-muted rounded">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-3 w-3" />
                  <span className="text-xs">Response Rate</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium">{keyRatios.responseRate.toFixed(1)}%</span>
                  {keyRatios.responseRate >= 80 ? (
                    <CheckCircle className="h-3 w-3 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-3 w-3 text-yellow-500" />
                  )}
                </div>
              </div> */}
            </div>
          </div>

          {/* Priority Recommendations */}
          <div className="space-y-3">
            <h4 className="font-semibold">Priority Actions</h4>
            <div className="space-y-2">
              {priorityRecommendations.map((recommendation, index) => (
                <div key={index} className="flex items-start gap-2 p-2 bg-blue-50 rounded text-sm">
                  <div className="flex-shrink-0 w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                    {index + 1}
                  </div>
                  <span className="text-blue-800">{recommendation}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="pt-4 border-t">
            <h4 className="font-semibold mb-3">Quick Actions</h4>
            <div className="space-y-2">
              <Button variant="outline" size="sm" className="w-full justify-start">
                <MessageSquare className="h-4 w-4 mr-2" />
                Respond to Reviews
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start">
                <FileText className="h-4 w-4 mr-2" />
                Create New Post
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start">
                <Star className="h-4 w-4 mr-2" />
                Request Reviews
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
