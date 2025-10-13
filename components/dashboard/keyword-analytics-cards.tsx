"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useKeywords } from "@/lib/hooks/use-keywords"
import { 
  Search, 
  TrendingUp, 
  Eye, 
  MousePointer, 
  Target,
  BarChart3,
  Zap
} from "lucide-react"
import { formatLargeNumber, formatPercentage } from "@/lib/utils"

interface KeywordAnalyticsCardsProps {
  locationId?: string
  limit?: number
}

export function KeywordAnalyticsCards({ locationId, limit = 5 }: KeywordAnalyticsCardsProps) {
  const { 
    keywords, 
    summary, 
    isLoading, 
    error 
  } = useKeywords({
    locationId,
    limit,
    sortBy: 'impressions',
    sortOrder: 'desc'
  })

  const formatNumber = (num: number) => {
    return formatLargeNumber(num, { compact: true, maxLength: 8 })
  }

  const formatPercentageValue = (num: number) => {
    return formatPercentage(num, 2, "0%")
  }

  const getPositionColor = (position: number) => {
    if (position <= 3) return "text-green-600"
    if (position <= 10) return "text-yellow-600"
    return "text-red-600"
  }

  const getCtrColor = (ctr: number) => {
    if (ctr >= 0.05) return "text-green-600"
    if (ctr >= 0.02) return "text-yellow-600"
    return "text-red-600"
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Keyword Analytics
          </CardTitle>
          <CardDescription>Search performance insights</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="h-6 w-6 text-yellow-600" />
            </div>
            <p className="text-sm text-muted-foreground mb-2">Unable to load keyword data</p>
            <p className="text-xs text-muted-foreground">This may be due to network connectivity issues or API rate limits</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Keyword Analytics
          </CardTitle>
          <CardDescription>Search performance insights</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-sm text-muted-foreground">Loading keywords...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!summary || summary.totalUniqueKeywords === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Keyword Analytics
          </CardTitle>
          <CardDescription>Search performance insights</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">No keyword data available</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Keywords</CardTitle>
            <Search className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalUniqueKeywords}</div>
            <p className="text-xs text-muted-foreground">
              Active search terms
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Impressions</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(summary.totalImpressions)}</div>
            <p className="text-xs text-muted-foreground">
              Search appearances
            </p>
          </CardContent>
        </Card>

        {/* <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clicks</CardTitle>
            <MousePointer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(summary.totalClicks)}</div>
            <p className="text-xs text-muted-foreground">
              User interactions
            </p>
          </CardContent>
        </Card> */}

        {/* <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Position</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getPositionColor(summary.avgPosition)}`}>
              {summary.avgPosition.toFixed(1)}
            </div>
            <p className="text-xs text-muted-foreground">
              Search ranking
            </p>
          </CardContent>
        </Card> */}
      </div>

      {/* Top Keywords */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Top Performing Keywords
          </CardTitle>
          <CardDescription>Keywords with highest impressions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {keywords.slice(0, limit).map((keyword, index) => (
              <div key={keyword.keyword} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-6 h-6 bg-primary text-primary-foreground rounded-full text-xs font-bold">
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-medium">{keyword.keyword}</div>
                    <div className="text-xs text-muted-foreground">
                      {keyword.monthlyData?.length || 0} months tracked
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <div className="text-right">
                    <div className="font-medium">{formatNumber(keyword.totalImpressions)}</div>
                    <div className="text-xs text-muted-foreground">impressions</div>
                  </div>
                  {/* <div className="text-right">
                    <div className="font-medium">{formatNumber(keyword.totalClicks)}</div>
                    <div className="text-xs text-muted-foreground">clicks</div>
                  </div>
                  <div className="text-right">
                    <div className={`font-medium ${getCtrColor(keyword.avgCtr)}`}>
                      {formatPercentageValue(keyword.avgCtr)}
                    </div>
                    <div className="text-xs text-muted-foreground">CTR</div>
                  </div>
                  <div className="text-right">
                    <div className={`font-medium ${getPositionColor(keyword.avgPosition)}`}>
                      {keyword.avgPosition.toFixed(1)}
                    </div>
                    <div className="text-xs text-muted-foreground">position</div>
                  </div> */}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Performance Insights */}
      {/* <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Performance Insights
          </CardTitle>
          <CardDescription>Key metrics and trends</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Overall CTR</span>
                <Badge variant={summary.avgCtr >= 0.05 ? "default" : summary.avgCtr >= 0.02 ? "secondary" : "destructive"}>
                  {formatPercentageValue(summary.avgCtr)}
                </Badge>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(summary.avgCtr * 2000, 100)}%` }}
                ></div>
              </div>
              <p className="text-xs text-muted-foreground">
                {summary.avgCtr >= 0.05 ? "Excellent CTR performance" : 
                 summary.avgCtr >= 0.02 ? "Good CTR performance" : 
                 "CTR needs improvement"}
              </p>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Avg Search Position</span>
                <Badge variant={summary.avgPosition <= 3 ? "default" : summary.avgPosition <= 10 ? "secondary" : "destructive"}>
                  {summary.avgPosition.toFixed(1)}
                </Badge>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${
                    summary.avgPosition <= 3 ? "bg-green-500" : 
                    summary.avgPosition <= 10 ? "bg-yellow-500" : "bg-red-500"
                  }`}
                  style={{ width: `${Math.max(100 - (summary.avgPosition * 10), 0)}%` }}
                ></div>
              </div>
              <p className="text-xs text-muted-foreground">
                {summary.avgPosition <= 3 ? "Excellent search visibility" : 
                 summary.avgPosition <= 10 ? "Good search visibility" : 
                 "Search visibility needs improvement"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card> */}
    </div>
  )
}
