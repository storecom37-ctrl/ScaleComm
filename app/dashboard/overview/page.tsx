"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AnalyticsCard } from "@/components/dashboard/analytics-card"
import { LocationFilter } from "@/components/dashboard/location-filter"
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
import { RatingReviewsSection } from "@/components/dashboard/rating-reviews-section"
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
  Navigation,
  MapPin,
  Calendar,
  Filter,
  Building2,
  Users,
  MousePointerClick,
  Navigation as NavigationIcon
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
    locations: dbLocations,
    reviews: dbReviews,
    posts: dbPosts,
    refreshAll
  } = useGmbData()
  
  // Get sync functionality and state
  const { syncGmbData, isSyncing } = useGmbSync()
  const { getStoredTokens } = useGmbAuth()

  // Get accessible performance data with simplified filtering
  const {
    data: performanceData,
    aggregated: filteredPerformanceData,
    isLoading: performanceLoading,
    hasGmbAccess: performanceAccess
  } = useAccessibleStoreWisePerformanceData({
    days: selectedDays,
    status: 'active',
    limit: 1000,
    storeId: selectedStores.includes("all") ? "all" : selectedStores[0] || "all"
  })

  // Get location performance data for scoring
  const { data: locationPerformanceData } = useLocationPerformanceData({
    days: selectedDays,
    status: 'active'
  })

  // Calculate total locations
  const totalLocations = filteredStores.length

  // Determine if we have a connection and data
  const finalIsConnected =  totalLocations > 0

  // Get final data arrays
  const finalLocations = dbLocations || []
  const finalReviews = dbReviews || []
  const finalPosts = dbPosts || []

  // Create insights object from performance data for scoring
  const insightsFromPerformance = Object.keys(locationPerformanceData).reduce((acc: any, locationId: string) => {
    const locationPerf = locationPerformanceData[locationId]
    acc[locationId] = {
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
    <div className="min-h-screen bg-gray-50">
      {/* Modern Header Section */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Local Store Analytics Dashboard</h1>
              <p className="text-gray-600 mt-2">
                Welcome back, here's a look at your store's performance.
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <DateRangeFilter
                selectedDays={selectedDays}
                onDaysChange={handleDaysChange}
                onClear={handleClearFilter}
                className="w-full sm:w-auto"
              />
              <Button variant="outline" className="flex items-center space-x-2">
                <Filter className="h-4 w-4" />
                <span>Store Filter</span>
              </Button>
              <GmbConnectButton />
              <Button
                onClick={handleSync}
                disabled={isSyncing}
                className="bg-[#4285F4] hover:bg-[#3367D6] text-white flex items-center space-x-2"
              >
                <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 py-8 space-y-8">
        {/* Store Filter */}
        <LocationFilter />

        {/* Key Metrics - Modern Card Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
          {/* Total Locations */}
          <div className="flex flex-col justify-around bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <div>
              <p className="text-sm font-medium text-gray-600 flex items-center">
                <Building2 className="h-4 w-4 mr-2" />
                Total Locations
              </p>
              <p className="text-2xl font-bold text-[#4285F4] mt-2">
                {finalIsConnected ? totalLocations : "—"}
              </p>
            </div>
          </div>

          {/* Total Views */}
          <div className="flex flex-col justify-around bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <p className="text-sm font-medium text-gray-600 flex items-center">
              <Eye className="h-4 w-4 mr-2" />
              Total Views
            </p>
            <p className="text-2xl font-bold  mt-2 text-[#4285F4]">
              {performanceAccess && !performanceLoading && filteredPerformanceData ?
                (filteredPerformanceData.totalViews > 0 ? formatLargeNumber(filteredPerformanceData.totalViews) : "0") :
                "—"}
            </p>
          </div>

          {/* Website Clicks */}
          <div className="flex flex-col justify-around bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <p className="text-sm font-medium text-gray-600 flex items-center">
              <MousePointerClick className="h-4 w-4 mr-2" />
              Website Clicks
            </p>
            <p className="text-2xl font-bold text-[#4285F4] mt-2">
              {performanceAccess && !performanceLoading && filteredPerformanceData ?
                (filteredPerformanceData.totalWebsiteClicks > 0 ? formatLargeNumber(filteredPerformanceData.totalWebsiteClicks) : "0") :
                "—"}
            </p>
          </div>

          {/* Call Clicks */}
          <div className="flex flex-col justify-around bg-white rounded-lg p-6 shadow-sm border border-gray-200">

            <p className="text-sm font-medium text-gray-600 flex items-center">
              <Phone className="h-4 w-4 mr-2" />
              Call Clicks
            </p>
            <p className="text-2xl font-bold text-[#4285F4] mt-2">
              {performanceAccess && !performanceLoading && filteredPerformanceData ?
                (filteredPerformanceData.totalCallClicks > 0 ? formatLargeNumber(filteredPerformanceData.totalCallClicks) : "0") :
                "—"}
            </p>
          </div>

          {/* Direction Requests */}
          <div className="flex flex-col justify-around bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <p className="text-sm font-medium text-gray-600 flex items-center">
              <NavigationIcon className="h-4 w-4 mr-2" />
              Direction Requests
            </p>
            <p className="text-2xl font-bold text-[#4285F4] mt-2">
              {performanceAccess && !performanceLoading && filteredPerformanceData ?
                (filteredPerformanceData.totalDirectionRequests > 0 ? formatLargeNumber(filteredPerformanceData.totalDirectionRequests) : "0") :
                "—"}
            </p>
          </div>

          {/* Total Actions */}
          <div className="flex flex-col justify-around bg-white rounded-lg p-6 shadow-sm border border-gray-200">

            <p className="text-sm font-medium text-gray-600 flex items-center">
              <TrendingUp className="h-4 w-4 mr-2" />
              Total Actions
            </p>
            <p className="text-2xl font-bold text-[#4285F4] mt-2">
              {performanceAccess && !performanceLoading && filteredPerformanceData ?
                (filteredPerformanceData.totalCallClicks + filteredPerformanceData.totalWebsiteClicks + filteredPerformanceData.totalDirectionRequests > 0 ?
                  formatLargeNumber(filteredPerformanceData.totalCallClicks + filteredPerformanceData.totalWebsiteClicks + filteredPerformanceData.totalDirectionRequests) : "0") :
                "—"}
            </p>
          </div>
        </div>

        {/* Impression Analytics */}
        <ImpressionAnalytics 
          accountId={dbAccount?.id || "all"} 
          locationId="all" 
        />

        {/* Rating & Reviews Analytics */}
        <RatingReviewsSection 
          brandId="all"
          storeId="all"
        />

        {/* Engagement Metrics */}
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <BarChart3 className="h-5 w-5 mr-2" />
            Engagement Metrics
          </h3>
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
              title="Total Engagement Rate"
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
        </div>

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

        {/* Recent Activity */}
        <div className="grid gap-6 md:grid-cols-2">
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Recent Reviews</h3>
            <p className="text-sm text-gray-600 mb-4">Latest customer feedback</p>
            <div className="space-y-4">
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
                          {location && (
                            <span className="text-xs text-blue-600">
                              {location.name}
                            </span>
                          )}
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
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Top Performing Locations</h3>
            <p className="text-sm text-gray-600 mb-4">Top 5 locations ranked by visibility score</p>
            <div className="space-y-4">
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
                            <span>{metrics.recentReviews} recent</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="text-right">
                            <div className="text-lg font-bold">{breakdown.totalScore}</div>
                            <div className="text-xs text-muted-foreground">Score</div>
                          </div>
                          <Badge variant="outline" className="text-xs">
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
            </div>
          </div>
        </div>

        {/* Global Sync Status */}
        <GlobalSyncStatus />
      </div>
    </div>
  )
}