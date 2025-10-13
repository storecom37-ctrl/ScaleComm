"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { StorePerformanceTable } from "@/components/dashboard/store-performance-table"
import { useAccessibleStoreWisePerformanceData } from "@/lib/hooks/use-accessible-performance-data"
import { 
  Store, 
  Eye, 
  Phone, 
  Globe, 
  MousePointer, 
  TrendingUp,
  Calendar,
  BarChart3,
  Download,
  RefreshCw
} from "lucide-react"

export default function StoresPerformancePage() {
  const [selectedPeriod, setSelectedPeriod] = useState<string>("30")
  const [selectedBrand, setSelectedBrand] = useState<string>("all")

  // Get performance data for summary cards
  const {
    aggregated: aggregatedMetrics,
    isLoading,
    hasGmbAccess,
    refresh
  } = useAccessibleStoreWisePerformanceData({
    days: parseInt(selectedPeriod),
    status: 'active'
  })

  // Format numbers
  const formatNumber = (num: number) => num.toLocaleString()
  const formatPercentage = (num: number) => `${num.toFixed(1)}%`

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Store Performance Analytics</h1>
          <p className="text-muted-foreground">
            Comprehensive performance metrics and analytics for all your stores
          </p>
        </div>
        <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={refresh} variant="outline" className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {hasGmbAccess && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Stores</CardTitle>
              <Store className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? "..." : aggregatedMetrics?.totalStores || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Active stores with performance data
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Views</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? "..." : formatNumber(aggregatedMetrics?.totalViews || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                Profile views in last {selectedPeriod} days
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Actions</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? "..." : formatNumber(aggregatedMetrics?.totalActions || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                Calls + Website + Directions
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Engagement</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? "..." : formatPercentage(aggregatedMetrics?.overallEngagementRate || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                Overall engagement rate
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Performance Breakdown Cards */}
      {hasGmbAccess && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Call Clicks</CardTitle>
              <Phone className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? "..." : formatNumber(aggregatedMetrics?.totalCallClicks || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                {formatPercentage(aggregatedMetrics?.overallCallConversionRate || 0)} conversion rate
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Website Clicks</CardTitle>
              <Globe className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? "..." : formatNumber(aggregatedMetrics?.totalWebsiteClicks || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                {formatPercentage(aggregatedMetrics?.overallWebsiteConversionRate || 0)} conversion rate
              </p>
            </CardContent>
          </Card>
          
        </div>
      )}

      {/* Store Performance Table */}
      <StorePerformanceTable 
        days={parseInt(selectedPeriod)}
        status="active"
        showFilters={true}
        limit={100}
      />

      {/* Data Quality Information */}
      {hasGmbAccess && aggregatedMetrics && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Data Quality & Coverage
            </CardTitle>
            <CardDescription>
              Information about the performance data quality and coverage
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <div className="text-sm font-medium">Data Points</div>
                <div className="text-2xl font-bold">{formatNumber(aggregatedMetrics.totalDataPoints || 0)}</div>
                <div className="text-xs text-muted-foreground">Total performance records</div>
              </div>
              
              <div className="space-y-2">
                <div className="text-sm font-medium">Date Range</div>
                <div className="text-lg font-semibold">Last {selectedPeriod} days</div>
                <div className="text-xs text-muted-foreground">Reporting period</div>
              </div>
              
              <div className="space-y-2">
                <div className="text-sm font-medium">Coverage</div>
                <div className="text-2xl font-bold">
                  {aggregatedMetrics.totalStores > 0 ? 
                    formatPercentage((aggregatedMetrics.totalDataPoints / aggregatedMetrics.totalStores) || 0) : 
                    "0%"
                  }
                </div>
                <div className="text-xs text-muted-foreground">Data points per store</div>
              </div>
              
              <div className="space-y-2">
                <div className="text-sm font-medium">Status</div>
                <Badge variant="secondary" className="text-sm">
                  Active Stores
                </Badge>
                <div className="text-xs text-muted-foreground">Current filter applied</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}


