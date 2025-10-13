"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { AnalyticsCard } from "@/components/dashboard/analytics-card"
import { StorePerformanceTable } from "@/components/dashboard/store-performance-table"
import { useAccessibleStoreWisePerformanceData } from "@/lib/hooks/use-accessible-performance-data"
import { 
  BarChart3, 
  Eye, 
  MousePointer, 
  Phone, 
  Globe, 
  TrendingUp,
  Filter,
  Download,
  RefreshCw,
  Store,
  Target,
  Activity
} from "lucide-react"

export default function PerformancePage() {
  const [selectedPeriod, setSelectedPeriod] = useState<string>("30")
  const [viewMode, setViewMode] = useState<"overall" | "storewise">("storewise")

  // Memoize filters to prevent infinite re-renders
  const performanceFilters = useMemo(() => ({
    days: parseInt(selectedPeriod),
    status: "active"
  }), [selectedPeriod])

  // Use the accessible store-wise performance data hook
  const {
    data: performanceData,
    storeWiseData,
    aggregated: aggregatedMetrics,
    isLoading,
    error,
    hasGmbAccess,
    refresh
  } = useAccessibleStoreWisePerformanceData(performanceFilters)

  // Handle period change
  const handlePeriodChange = (value: string) => {
    setSelectedPeriod(value)
  }

  // Calculate derived metrics
  const engagementRate = aggregatedMetrics?.totalViews > 0 
    ? ((aggregatedMetrics.totalCallClicks + aggregatedMetrics.totalWebsiteClicks) / aggregatedMetrics.totalViews) * 100
    : 0

  const callConversionRate = aggregatedMetrics?.totalViews > 0 
    ? (aggregatedMetrics.totalCallClicks / aggregatedMetrics.totalViews) * 100
    : 0

  const websiteConversionRate = aggregatedMetrics?.totalViews > 0 
    ? (aggregatedMetrics.totalWebsiteClicks / aggregatedMetrics.totalViews) * 100
    : 0


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Performance Analytics</h1>
          <p className="text-muted-foreground">
            Track and analyze your store performance metrics from database
          </p>
        </div>
        <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
          <Button variant="outline" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export Data
          </Button>
          <Button variant="outline" className="flex items-center gap-2" onClick={refresh}>
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters & View Options
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>View Mode</Label>
              <Select value={viewMode} onValueChange={(value: "overall" | "storewise") => setViewMode(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="overall">Overall Performance</SelectItem>
                  <SelectItem value="storewise">Store-wise Performance</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Time Period</Label>
              <Select value={selectedPeriod} onValueChange={handlePeriodChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                  <SelectItem value="365">Last year</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Data Status</Label>
              <div className="text-sm text-muted-foreground">
                {performanceData?.length || 0} records found
                {!hasGmbAccess && (
                  <div className="text-amber-600 text-xs mt-1 font-medium">
                    ⚠️ Connect GMB to view performance data
                  </div>
                )}
                {error && <div className="text-red-500 text-xs mt-1">Error: {error}</div>}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Overall Performance Metrics */}
      {viewMode === "overall" && (
        <>
          {/* Key Metrics Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <AnalyticsCard
              title="Total Views"
              value={aggregatedMetrics?.totalViews?.toLocaleString() || "0"}
              description="Total profile views"
              icon={Eye}
            />
            <AnalyticsCard
              title="Total Actions"
              value={aggregatedMetrics?.totalActions?.toLocaleString() || "0"}
              description="All user interactions"
              icon={MousePointer}
            />
            <AnalyticsCard
              title="Call Clicks"
              value={aggregatedMetrics?.totalCallClicks?.toLocaleString() || "0"}
              description="Phone number clicks"
              icon={Phone}
            />
            <AnalyticsCard
              title="Website Clicks"
              value={aggregatedMetrics?.totalWebsiteClicks?.toLocaleString() || "0"}
              description="Website visits"
              icon={Globe}
            />
          </div>

          {/* Conversion Metrics */}
          <div className="grid gap-4 md:grid-cols-3">
            <AnalyticsCard
              title="Call Conversion Rate"
              value={`${callConversionRate.toFixed(2)}%`}
              description="Calls per view"
              icon={TrendingUp}
            />
            <AnalyticsCard
              title="Engagement Rate"
              value={`${engagementRate.toFixed(2)}%`}
              description="Overall engagement"
              icon={Activity}
            />
          </div>

          {/* Performance Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Performance Breakdown
              </CardTitle>
              <CardDescription>
                Detailed metrics across all stores
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {callConversionRate.toFixed(1)}%
                    </div>
                    <div className="text-sm text-muted-foreground">Call Conversion</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {websiteConversionRate.toFixed(1)}%
                    </div>
                    <div className="text-sm text-muted-foreground">Website Conversion</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">
                      {engagementRate.toFixed(2)}%
                    </div>
                    <div className="text-sm text-muted-foreground">Overall Engagement</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Store Performance Table */}
      {viewMode === "storewise" && (
        <StorePerformanceTable 
          days={parseInt(selectedPeriod)}
          status="active"
          showFilters={false}
          limit={100}
        />
      )}

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center space-x-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Loading performance data...</span>
          </div>
        </div>
      )}

      {!isLoading && (!performanceData || performanceData.length === 0) && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {!hasGmbAccess ? "GMB Connection Required" : "No Performance Data"}
            </h3>
            <p className="text-muted-foreground text-center max-w-md">
              {!hasGmbAccess 
                ? "Connect your Google My Business account to view performance data for your stores. Only data from accessible GMB accounts will be displayed."
                : "No performance data found for the selected filters. Try adjusting your time period or sync your GMB data."
              }
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}