"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AnalyticsCard } from "@/components/dashboard/analytics-card"
import { LocationFilter } from "@/components/dashboard/location-filter"
// import { ImprovedGmbConnectButton } from "@/components/dashboard/improved-gmb-connect-button"
import { GmbConnectButton } from "@/components/dashboard/gmb-connect-button"
import { useGmbSync } from "@/lib/hooks/use-gmb-sync"
import { useGmbAuth } from "@/lib/hooks/use-gmb-auth"
import { useGmbData } from "@/lib/hooks/use-gmb-data"
import { useStores } from "@/lib/hooks/use-stores"
import { useGmbStore } from "@/lib/stores/gmb-store"
import { useAccessibleStoreWisePerformanceData } from "@/lib/hooks/use-accessible-performance-data"
import { useLocationPerformanceData } from "@/lib/hooks/use-location-performance-data"
import { VisibilityScoreCard } from "@/components/dashboard/visibility-score-card"
import { LocationScoringTable } from "@/components/dashboard/location-scoring-table"
import { KeywordAnalyticsCards } from "@/components/dashboard/keyword-analytics-cards"
import { KeywordPerformanceTable } from "@/components/dashboard/keyword-performance-table"
import { StorePerformanceTable } from "@/components/dashboard/store-performance-table"
import { ImpressionAnalytics } from "@/components/dashboard/impression-analytics"
import GlobalSyncStatus from "@/components/dashboard/global-sync-status"
import { calculateVisibilityScore, extractMetricsFromGmbData, ScoringMetrics } from "@/lib/utils/scoring"
import { formatLargeNumber, formatPercentage } from "@/lib/utils"
import { 
  Star, 
  MessageSquare, 
  MousePointer, 
  Eye, 
  TrendingUp, 
  Phone, 
  Globe, 
  RefreshCw,
  BarChart3,
  Target,
  CheckCircle,
  Navigation
} from "lucide-react"
import { DateRangeFilter } from "@/components/dashboard/date-range-filter"

export default function OverviewPage() {
  // Date range filter state - using selected days
  const [selectedDays, setSelectedDays] = useState<number>(30)

  // Debug logging for date range state
  

  // Get filter state from global store
  const { selectedStores } = useGmbStore()

  // Date range filter handlers
  const handleDaysChange = (days: number) => {
    setSelectedDays(days)
  }

  const handleClearFilter = () => {
    setSelectedDays(30) // Reset to default 30 days
  }

  // Convert selected days to start/end dates for API calls
  const getDateRange = () => {
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - selectedDays)
    
    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    }
  }

  const { startDate, endDate } = getDateRange()

  // Fetch stores from API (same as stores page)
  const { stores, isLoading: storesLoading, refresh: refreshStores, totalStores } = useStores({
    status: 'active',
    limit: 10000 // Fetch all stores linked to the account
  })

  // Filter stores based on selected stores
  const filteredStores = selectedStores.includes("all") 
    ? stores 
    : stores.filter((store: any) => selectedStores.includes(store._id))

  const {
    isConnected: dbConnected,
    isLoading: dbLoading,
    account: dbAccount,
    reviews: dbReviews,
    posts: dbPosts,
    refreshAll
  } = useGmbData()
  
  // Get sync functionality and state
  const { syncGmbData, isSyncing } = useGmbSync()
  const { getStoredTokens } = useGmbAuth()
  
  // Get accessible performance data with simplified filtering
  const performanceFilters = {
    days: selectedDays, // Use selected days only
    status: 'active'
  }
  
  
  
  const {
    aggregated: performanceAggregated,
    isLoading: performanceLoading,
    hasGmbAccess: performanceAccess,
    error: performanceError
  } = useAccessibleStoreWisePerformanceData(performanceFilters)
  
  // Get location-specific performance data with simplified filtering
  const locationFilters = {
    days: selectedDays, // Use selected days only
    status: 'active'
  }
  
  
  
  const {
    data: locationPerformanceData,
    isLoading: locationPerformanceLoading,
    error: locationPerformanceError
  } = useLocationPerformanceData(locationFilters)
  
  
  // Use filtered stores from API and reviews/posts from database
  const finalAccount = dbAccount
  const finalLocations = filteredStores.map((store: any) => ({
    id: store.gmbLocationId || store._id,
    _id: store._id,
    name: store.name,
    address: store.address,
    phoneNumber: store.phone,
    websiteUrl: store.socialMedia?.website,
    categories: [store.primaryCategory],
    verified: store.status === 'active'
  }))
  
  // Filter reviews and posts based on selected stores
  const filteredStoreIds = filteredStores.map((store: any) => store.gmbLocationId || store._id)
  const finalReviews = (dbReviews || []).filter((review: any) => 
    filteredStoreIds.includes(review.locationId)
  )
  const finalPosts = (dbPosts || []).filter((post: any) => 
    filteredStoreIds.includes(post.locationId)
  )
  const finalIsConnected = dbConnected

  const totalLocations = filteredStores.length
  const totalReviews = finalReviews.length
  const averageRating = finalReviews.length > 0 
    ? finalReviews.reduce((sum: number, review: any) => sum + review.starRating, 0) / finalReviews.length 
    : 0
  const totalPosts = finalPosts.length
  
  // Filter performance data based on selected stores
  const filteredPerformanceData = performanceAggregated ? {
    totalViews: selectedStores.includes("all") 
      ? performanceAggregated.totalViews 
      : finalLocations.reduce((sum: number, location: any) => {
          const locationPerf = locationPerformanceData[location.id] || {}
          return sum + (locationPerf.totalViews || 0)
        }, 0),
    totalCallClicks: selectedStores.includes("all") 
      ? performanceAggregated.totalCallClicks 
      : finalLocations.reduce((sum: number, location: any) => {
          const locationPerf = locationPerformanceData[location.id] || {}
          return sum + (locationPerf.totalCallClicks || 0)
        }, 0),
    totalWebsiteClicks: selectedStores.includes("all") 
      ? performanceAggregated.totalWebsiteClicks 
      : finalLocations.reduce((sum: number, location: any) => {
          const locationPerf = locationPerformanceData[location.id] || {}
          return sum + (locationPerf.totalWebsiteClicks || 0)
        }, 0),
    totalDirectionRequests: selectedStores.includes("all") 
      ? performanceAggregated.totalDirectionRequests 
      : finalLocations.reduce((sum: number, location: any) => {
          const locationPerf = locationPerformanceData[location.id] || {}
          return sum + (locationPerf.totalDirectionRequests || 0)
        }, 0),
  } : null
  
  // Use performance data from database instead of insights from localStorage
  const totalInsights = filteredPerformanceData?.totalViews || 0
  
  // Create insights object from performance data for compatibility with scoring function
  const insightsFromPerformance = finalLocations.reduce((acc: any, location: any) => {
    const locationPerf = locationPerformanceData[location.id] || {}
    acc[location.id] = {
      views: locationPerf.totalViews || 0,
      callClicks: locationPerf.totalCallClicks || 0,
      websiteClicks: locationPerf.totalWebsiteClicks || 0,
    }
    return acc
  }, {})
  
  // Calculate visibility scores with proper data validation using performance data
  const overallMetrics = extractMetricsFromGmbData(finalLocations, finalReviews, finalPosts, insightsFromPerformance)
  const overallScoringDetails = calculateVisibilityScore(overallMetrics)
  
  
  // Calculate location-wise scores using actual location-specific performance data
  const locationScoringData = finalLocations.map((location: any) => {
    const locationReviews = finalReviews.filter((review: any) => review.locationId === location.id)
    const locationPosts = finalPosts.filter((post: any) => post.locationId === location.id)
    
    // Get location-specific performance data
    const locationPerfData = locationPerformanceData[location.id] || {}
    const locationInsights = {
      views: locationPerfData.totalViews || 0,
      callClicks: locationPerfData.totalCallClicks || 0,
      websiteClicks: locationPerfData.totalWebsiteClicks || 0,
    }
    
    // Calculate location-specific metrics
    const locationMetrics: ScoringMetrics = {
      averageRating: locationReviews.length > 0 
        ? locationReviews.reduce((sum: number, review: any) => sum + review.starRating, 0) / locationReviews.length 
        : 0,
      totalReviews: locationReviews.length,
      recentReviews: locationReviews.filter((review: any) => {
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        return new Date(review.createTime) >= thirtyDaysAgo
      }).length,
      responseRate: locationReviews.length > 0 
        ? (locationReviews.filter((review: any) => review.reply).length / locationReviews.length) * 100 
        : 0,
      impressions: locationInsights.views,
      callClicks: locationInsights.callClicks,
      websiteClicks: locationInsights.websiteClicks,
      profilePhotos: 3, // Estimate
      recentPosts: locationPosts.filter((post: any) => {
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        return new Date(post.createTime) >= thirtyDaysAgo
      }).length,
      profileCompleteness: calculateLocationProfileCompleteness(location),
      qaActivity: 0
    }
    
    return {
      locationId: location.id,
      locationName: location.name,
      address: formatAddress(location.address),
      scoringDetails: calculateVisibilityScore(locationMetrics),
      metrics: locationMetrics
    }
  })
  
  // Helper function to calculate profile completeness for a single location
  function calculateLocationProfileCompleteness(location: any): number {
    let score = 0
    if (location.name) score += 20
    if (location.address) score += 20
    if (location.phoneNumber) score += 20
    if (location.websiteUrl) score += 20
    if (location.categories && location.categories.length > 0) score += 20
    return score
  }

  // Helper function to format address object into readable string
  function formatAddress(address: any): string {
    if (!address) return "Address not available"
    if (typeof address === 'string') return address
    
    const parts = []
    if (address.line1) parts.push(address.line1)
    if (address.line2) parts.push(address.line2)
    if (address.locality) parts.push(address.locality)
    if (address.city) parts.push(address.city)
    if (address.state) parts.push(address.state)
    if (address.postalCode) parts.push(address.postalCode)
    
    return parts.length > 0 ? parts.join(', ') : "Address not available"
  }
  
  // Handle sync button click
  const handleSync = async () => {
    const tokens = await getStoredTokens()
    if (tokens) {
      await syncGmbData(tokens)
      // Refresh database data after sync
      setTimeout(() => {
        refreshAll()
        refreshStores()
      }, 2000) // Wait 2 seconds for database to be updated
    }
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Local Store Analytics Dashboard</h1>
        </div>
        <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
          <DateRangeFilter
            selectedDays={selectedDays}
            onDaysChange={handleDaysChange}
            onClear={handleClearFilter}
            className="w-full sm:w-auto"
          />
          <GmbConnectButton compact />
          <Button variant="outline" className="flex items-center gap-2" onClick={() => {
            refreshAll()
            refreshStores()
          }}>
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Store Filter */}
      <div className="grid gap-4 md:grid-cols-1">
        <LocationFilter />
      </div>

      {/* Key Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Key Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <AnalyticsCard
              title="Total Locations"
              value={finalIsConnected ? totalLocations.toString() : "—"}
              description={finalIsConnected ? (totalLocations > 0 ? "From database" : "No locations synced") : "Connect GMB to view data"}
              icon={MousePointer}
              isEmpty={!finalIsConnected || totalLocations === 0}
            />
            <AnalyticsCard
              title="Total Views"
              value={performanceAccess && !performanceLoading && filteredPerformanceData ? 
                (filteredPerformanceData.totalViews > 0 ? filteredPerformanceData.totalViews : 0) : 
                "—"
              }
              description={performanceAccess ? 
                (filteredPerformanceData && filteredPerformanceData.totalViews > 0 ? "From performance database" : "No performance data available") : 
                "Connect GMB to view data"
              }
              icon={Eye}
              isLoading={performanceLoading}
              isEmpty={!performanceAccess || (!performanceLoading && (!filteredPerformanceData || !filteredPerformanceData.totalViews || filteredPerformanceData.totalViews === 0))}
            />
            <AnalyticsCard
              title="Website Clicks"
              value={performanceAccess && !performanceLoading && filteredPerformanceData ? 
                (filteredPerformanceData.totalWebsiteClicks > 0 ? filteredPerformanceData.totalWebsiteClicks : 0) : 
                "—"
              }
              description={performanceAccess ? 
                (filteredPerformanceData && filteredPerformanceData.totalWebsiteClicks > 0 ? "From performance database" : "No website clicks data available") : 
                "Connect GMB to view data"
              }
              icon={Globe}
              isLoading={performanceLoading}
              isEmpty={!performanceAccess || (!performanceLoading && (!filteredPerformanceData || !filteredPerformanceData.totalWebsiteClicks || filteredPerformanceData.totalWebsiteClicks === 0))}
            />
            <AnalyticsCard
              title="Call Clicks"
              value={performanceAccess && !performanceLoading && filteredPerformanceData ? 
                (filteredPerformanceData.totalCallClicks > 0 ? filteredPerformanceData.totalCallClicks : 0) : 
                "—"
              }
              description={performanceAccess ? 
                (filteredPerformanceData && filteredPerformanceData.totalCallClicks > 0 ? "From performance database" : "No call data available") : 
                "Connect GMB to view data"
              }
              icon={Phone}
              isLoading={performanceLoading}
              isEmpty={!performanceAccess || (!performanceLoading && (!filteredPerformanceData || !filteredPerformanceData.totalCallClicks || filteredPerformanceData.totalCallClicks === 0))}
            />
            <AnalyticsCard
              title="Direction Requests"
              value={performanceAccess && !performanceLoading && filteredPerformanceData ? 
                (filteredPerformanceData.totalDirectionRequests > 0 ? filteredPerformanceData.totalDirectionRequests : 0) : 
                "—"
              }
              description={performanceAccess ? 
                (filteredPerformanceData && filteredPerformanceData.totalDirectionRequests > 0 ? "From performance database" : "No direction data available") : 
                "Connect GMB to view data"
              }
              icon={Navigation}
              isLoading={performanceLoading}
              isEmpty={!performanceAccess || (!performanceLoading && (!filteredPerformanceData || !filteredPerformanceData.totalDirectionRequests || filteredPerformanceData.totalDirectionRequests === 0))}
            />
            <AnalyticsCard
              title="Total Actions"
              value={performanceAccess && !performanceLoading && filteredPerformanceData ? 
                (filteredPerformanceData.totalCallClicks + filteredPerformanceData.totalWebsiteClicks + filteredPerformanceData.totalDirectionRequests > 0 ? 
                  (filteredPerformanceData.totalCallClicks + filteredPerformanceData.totalWebsiteClicks + filteredPerformanceData.totalDirectionRequests) : 0) : 
                "—"
              }
              description={performanceAccess ? 
                (filteredPerformanceData && (filteredPerformanceData.totalCallClicks + filteredPerformanceData.totalWebsiteClicks + filteredPerformanceData.totalDirectionRequests) > 0 ? "Calls + Website + Directions" : "No actions data available") : 
                "Connect GMB to view data"
              }
              icon={TrendingUp}
              isLoading={performanceLoading}
              isEmpty={!performanceAccess || (!performanceLoading && (!filteredPerformanceData || (filteredPerformanceData.totalCallClicks + filteredPerformanceData.totalWebsiteClicks + filteredPerformanceData.totalDirectionRequests) === 0))}
            />
          </div>
        </CardContent>
      </Card>

      {/* Impression Analytics */}
      {finalIsConnected && performanceAccess && filteredStores.length > 0 && (
        <ImpressionAnalytics 
          accountId={filteredStores[0]?.accountId || ''} 
          locationId={filteredStores[0]?.gmbLocationId || ''} 
        />
      )}

      {/* Engagement Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Engagement Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <AnalyticsCard
              title="Call Conversion Rate"
              value={performanceAccess && !performanceLoading && filteredPerformanceData ? 
                (filteredPerformanceData.totalViews > 0 ? 
                  formatPercentage((filteredPerformanceData.totalCallClicks / filteredPerformanceData.totalViews) * 100, 1, "0%")
                  : "0%"
                ) : "—"
              }
              description={performanceAccess ? "Calls per view (from database)" : "Connect GMB to view data"}
              icon={Phone}
              isLoading={performanceLoading}
              isEmpty={!performanceAccess || (!performanceLoading && (!filteredPerformanceData || !filteredPerformanceData.totalViews || filteredPerformanceData.totalViews === 0))}
            />
            <AnalyticsCard
              title="Website Conversion Rate"
              value={performanceAccess && !performanceLoading && filteredPerformanceData ? 
                (filteredPerformanceData.totalViews > 0 ? 
                  formatPercentage((filteredPerformanceData.totalWebsiteClicks / filteredPerformanceData.totalViews) * 100, 1, "0%")
                  : "0%"
                ) : "—"
              }
              description={performanceAccess ? "Website clicks per view (from database)" : "Connect GMB to view data"}
              icon={Globe}
              isLoading={performanceLoading}
              isEmpty={!performanceAccess || (!performanceLoading && (!filteredPerformanceData || !filteredPerformanceData.totalViews || filteredPerformanceData.totalViews === 0))}
            />
            <AnalyticsCard
              title="Direction Conversion Rate"
              value={performanceAccess && !performanceLoading && filteredPerformanceData ? 
                (filteredPerformanceData.totalViews > 0 ? 
                  formatPercentage((filteredPerformanceData.totalDirectionRequests / filteredPerformanceData.totalViews) * 100, 1, "0%")
                  : "0%"
                ) : "—"
              }
              description={performanceAccess ? "Directions per view (from database)" : "Connect GMB to view data"}
              icon={Navigation}
              isLoading={performanceLoading}
              isEmpty={!performanceAccess || (!performanceLoading && (!filteredPerformanceData || !filteredPerformanceData.totalViews || filteredPerformanceData.totalViews === 0))}
            />
            <AnalyticsCard
              title="Overall Engagement"
              value={performanceAccess && !performanceLoading && filteredPerformanceData ? 
                (filteredPerformanceData.totalViews > 0 ? 
                  formatPercentage(((filteredPerformanceData.totalCallClicks + filteredPerformanceData.totalWebsiteClicks + filteredPerformanceData.totalDirectionRequests) / filteredPerformanceData.totalViews) * 100, 1, "0%")
                  : "0%"
                ) : "—"
              }
              description={performanceAccess ? "Total engagement rate (from database)" : "Connect GMB to view data"}
              icon={TrendingUp}
              isLoading={performanceLoading}
              isEmpty={!performanceAccess || (!performanceLoading && (!filteredPerformanceData || !filteredPerformanceData.totalViews || filteredPerformanceData.totalViews === 0))}
            />
          </div>
        </CardContent>
      </Card>

      {/* Store Performance Data */}
      {finalIsConnected && (
        <StorePerformanceTable 
          days={selectedDays}
          status="active"
          showFilters={true}
          limit={5}
          storeIds={selectedStores.includes("all") ? undefined : selectedStores}
        />
      )}

      {/* Keyword Analytics */}
      {finalIsConnected && (
        <KeywordAnalyticsCards 
          limit={5}
        />
      )}

      {/* Location-wise Visibility Scores */}
      {finalIsConnected && locationScoringData  && (
        <LocationScoringTable 
          locations={locationScoringData} 
          isLoading={dbLoading}
        />
      )}


      {/* Scoring Insights & Recommendations */}
      {/* {finalIsConnected && overallScoringDetails && (
        <ScoringInsights 
          scoringDetails={overallScoringDetails} 
          isLoading={dbLoading}
        />
      )} */}

      {/* Recent Activity */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Reviews</CardTitle>
            <CardDescription>Latest customer feedback</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {finalIsConnected && finalReviews.length > 0 ? (
              finalReviews.slice(0, 3).map((review: any, i: number) => {
                const location = finalLocations.find((loc: any) => loc.id === review.locationId)
                return (
                  <div key={`review-${review.id}-${i}`} className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{review.reviewer.displayName}</p>
                      <p className="text-sm text-muted-foreground">
                        {review.comment || 'No comment provided'}
                      </p>
                      <div className="flex items-center mt-1 space-x-2">
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star 
                              key={star} 
                              className={`h-3 w-3 ${star <= review.starRating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} 
                            />
                          ))}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(review.createTime).toLocaleDateString()}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          • {location?.name || 'Unknown Location'}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="text-center py-8">
                <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <MessageSquare className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">
                  {finalIsConnected ? "No reviews available yet" : "Connect your GMB account to view reviews"}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Performing Locations</CardTitle>
            <CardDescription>Top 5 locations ranked by visibility score</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {finalIsConnected && finalLocations?.length > 0 ? (
              locationScoringData
                .sort((a : any, b : any) => b.scoringDetails.breakdown.totalScore - a.scoringDetails.breakdown.totalScore)
                .slice(0, 5)
                .map((location : any, i: number) => {
                  const { scoringDetails, metrics } = location
                  const { breakdown, grade } = scoringDetails
                  
                  return (
                    <div key={location.locationId} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{location.locationName}</p>
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                          <span className="flex items-center">
                            <Star className="h-3 w-3 mr-1 fill-yellow-400 text-yellow-400" />
                            {metrics.averageRating > 0 ? metrics.averageRating.toFixed(1) : 'No rating'}
                          </span>
                          <span>{metrics.totalReviews} reviews</span>
                          <span>{metrics.callClicks} calls</span>
                          <span className={`font-medium ${
                            grade.startsWith('A') ? 'text-green-600' :
                            grade.startsWith('B') ? 'text-blue-600' :
                            grade.startsWith('C') ? 'text-yellow-600' :
                            'text-red-600'
                          }`}>
                            {breakdown.totalScore}/100
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={`text-xs ${
                          grade.startsWith('A') ? 'bg-green-100 text-green-800' :
                          grade.startsWith('B') ? 'bg-blue-100 text-blue-800' :
                          grade.startsWith('C') ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {grade}
                        </Badge>
                        <Badge variant={i === 0 ? "default" : "secondary"}>
                          #{i + 1}
                        </Badge>
                      </div>
                    </div>
                  )
                })
            ) : (
              <div className="text-center py-8">
                <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <Target className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">
                  {finalIsConnected ? "No location data available yet" : "Connect your GMB account to view location performance"}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Global Sync Status */}
      <GlobalSyncStatus />
    </div>
  )
}
