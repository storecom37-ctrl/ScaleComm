"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { 
  Store, 
  Eye, 
  Phone, 
  Globe, 
  MousePointer, 
  TrendingUp, 
  Search,
  Filter,
  Download,
  RefreshCw,
  BarChart3,
  Target,
  Calendar,
  MapPin,
  Loader2
} from "lucide-react"
import { useAccessibleStoreWisePerformanceData } from "@/lib/hooks/use-accessible-performance-data"
import { formatLargeNumber, formatPercentage } from "@/lib/utils"

interface StorePerformanceTableProps {
  days?: number
  dateRange?: number // 7, 30, 90, 180 days
  startDate?: string
  endDate?: string
  status?: string
  brandId?: string
  accountId?: string
  showFilters?: boolean
  limit?: number
  storeIds?: string[]
}

export function StorePerformanceTable({ 
  days = 30, 
  dateRange,
  startDate,
  endDate,
  status = 'active', 
  brandId,
  accountId,
  showFilters = true,
  limit = 50,
  storeIds
}: StorePerformanceTableProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<string>(days.toString())
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState<"views" | "engagement" | "calls" | "website">("views")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")

  // Use the accessible store-wise performance data hook
  const {
    data: performanceData,
    storeWiseData,
    aggregated: aggregatedMetrics,
    isLoading,
    error,
    hasGmbAccess,
    refresh
  } = useAccessibleStoreWisePerformanceData({
    days: parseInt(selectedPeriod), // Prioritize days parameter
    status,
    brandId,
    accountId,
    limit
  })


  console.log("storeWiseData", storeWiseData);

  // Filter and sort store data
  const filteredStores = Object.values(storeWiseData || {})
    .filter((storeData: any) => {
      // Filter by selected stores first
      if (storeIds && storeIds.length > 0 && !storeIds.includes("all")) {
        if (!storeIds.includes(storeData.store?._id)) {
          return false
        }
      }
      
      // Then filter by search term
      if (!searchTerm) return true
      const searchLower = searchTerm.toLowerCase()
      return (
        storeData.store?.name?.toLowerCase().includes(searchLower) ||
        storeData.store?.address?.toLowerCase().includes(searchLower) ||
        storeData.brand?.name?.toLowerCase().includes(searchLower) ||
        storeData.store?.city?.toLowerCase().includes(searchLower)
      )
    })
    .sort((a: any, b: any) => {
      let aValue = 0
      let bValue = 0
      
      switch (sortBy) {
        case "views":
          aValue = a.metrics?.totalViews || 0
          bValue = b.metrics?.totalViews || 0
          break
        case "engagement":
          aValue = a.metrics?.engagementRate || 0
          bValue = b.metrics?.engagementRate || 0
          break
        case "calls":
          aValue = a.metrics?.totalCallClicks || 0
          bValue = b.metrics?.totalCallClicks || 0
          break
        case "website":
          aValue = a.metrics?.totalWebsiteClicks || 0
          bValue = b.metrics?.totalWebsiteClicks || 0
          break
      }
      
      return sortOrder === "desc" ? bValue - aValue : aValue - bValue
    })

  // Format numbers with proper handling of large values
  const formatNumber = (num: number | null | undefined) => {
    return formatLargeNumber(num, { compact: true, maxLength: 8 })
  }

  // Format percentage with proper handling
  const formatPercentageValue = (num: number | null | undefined) => {
    return formatPercentage(num, 1, "0%")
  }

  // Format address object into shorter, two-line format
  const formatAddressTwoLines = (address: any) => {
    if (!address) return { line1: "Address not available", line2: "" }
    
    // Handle string address
    if (typeof address === 'string') {
      const parts = address.split(',').map(p => p.trim()).filter(p => p && p !== 'Unknown' && p !== '00000')
      
      if (parts.length <= 2) {
        return { line1: parts[0] || '', line2: parts[1] || '' }
      }
      
      // For long addresses, create shorter, more concise format
      // First line: Building/street info (first 2 parts max)
      const streetParts = parts.slice(0, 2)
      const street = streetParts.join(', ')
      
      // Second line: City, State, Postal (last 3 meaningful parts)
      const locationParts = parts.slice(-3).filter(p => p && p !== 'IN')
      const location = locationParts.join(', ')
      
      return { line1: street, line2: location }
    }
    
    // Handle object address - shorter format
    // First line: Just main street address
    const line1 = address.line1 || "Address not available"
    
    // Second line: City, State, Postal only (no line2, no locality)
    const cityParts = []
    if (address.city) cityParts.push(address.city)
    if (address.state) cityParts.push(address.state)
    if (address.postalCode) cityParts.push(address.postalCode)
    
    return {
      line1: line1,
      line2: cityParts.length > 0 ? cityParts.join(', ') : ""
    }
  }

  // Get performance grade based on engagement rate
  const getPerformanceGrade = (engagementRate: number) => {
    if (engagementRate >= 5) return { grade: "A", color: "text-green-600", bgColor: "bg-green-100" }
    if (engagementRate >= 3) return { grade: "B", color: "text-blue-600", bgColor: "bg-blue-100" }
    if (engagementRate >= 1) return { grade: "C", color: "text-yellow-600", bgColor: "bg-yellow-100" }
    return { grade: "D", color: "text-red-600", bgColor: "bg-red-100" }
  }

  // Handle sort change
  const handleSortChange = (newSortBy: string) => {
    if (sortBy === newSortBy) {
      setSortOrder(sortOrder === "desc" ? "asc" : "desc")
    } else {
      setSortBy(newSortBy as any)
      setSortOrder("desc")
    }
  }

  if (!hasGmbAccess) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Store className="h-5 w-5" />
            Store Performance Data
          </CardTitle>
          <CardDescription>Connect your GMB account to view store performance data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Store className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              Please connect your Google My Business account to view store performance analytics
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Store className="h-5 w-5" />
            Store Performance Data
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Target className="h-8 w-8 text-red-600" />
            </div>
            <p className="text-sm text-red-600 mb-4">Error loading performance data</p>
            <Button onClick={refresh} variant="outline" className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Stores</CardTitle>
            <Store className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  <span className="text-muted-foreground">Loading...</span>
                </div>
              ) : (
                aggregatedMetrics?.totalStores || 0
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Active stores with data
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
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  <span className="text-muted-foreground">Loading...</span>
                </div>
              ) : (
                formatNumber(aggregatedMetrics?.totalViews || 0)
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Last {selectedPeriod} days
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
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  <span className="text-muted-foreground">Loading...</span>
                </div>
              ) : (
                formatNumber(aggregatedMetrics?.totalActions || 0)
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Calls + Website
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
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  <span className="text-muted-foreground">Loading...</span>
                </div>
              ) : (
                formatPercentage(aggregatedMetrics?.overallEngagementRate || 0)
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Overall engagement rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Controls */}
      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters & Controls
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 items-center">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
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
              </div>
              
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search stores..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-[200px]"
                />
              </div>
              
              <Button onClick={refresh} variant="outline" size="sm" className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Store Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Store className="h-5 w-5" />
              Store Performance Data
            </div>
            <Badge variant="secondary">
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  <span className="text-muted-foreground">Loading...</span>
                </div>
              ) : (
                `Top ${Math.min(10, filteredStores.length)} of ${filteredStores.length} stores`
              )}
            </Badge>
          </CardTitle>
          <CardDescription>
            Performance metrics for the last {selectedPeriod} days
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Loading store performance data...</p>
            </div>
          ) : filteredStores.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Store className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                {searchTerm ? "No stores found matching your search" : "No performance data available"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Store</TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSortChange("views")}
                    >
                      <div className="flex items-center gap-1">
                        Views
                        {sortBy === "views" && (
                          <span className="text-xs">{sortOrder === "desc" ? "↓" : "↑"}</span>
                        )}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSortChange("engagement")}
                    >
                      <div className="flex items-center gap-1">
                        Engagement
                        {sortBy === "engagement" && (
                          <span className="text-xs">{sortOrder === "desc" ? "↓" : "↑"}</span>
                        )}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSortChange("calls")}
                    >
                      <div className="flex items-center gap-1">
                        <Phone className="h-4 w-4" />
                        Calls
                        {sortBy === "calls" && (
                          <span className="text-xs">{sortOrder === "desc" ? "↓" : "↑"}</span>
                        )}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSortChange("website")}
                    >
                      <div className="flex items-center gap-1">
                        <Globe className="h-4 w-4" />
                        Website
                        {sortBy === "website" && (
                          <span className="text-xs">{sortOrder === "desc" ? "↓" : "↑"}</span>
                        )}
                      </div>
                    </TableHead>
                    <TableHead>Performance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStores.slice(0, 10).map((storeData: any) => {
                    const metrics = storeData.metrics || {}
                    const store = storeData.store || {}
                    const brand = storeData.brand || {}
                    const performance = getPerformanceGrade(metrics.engagementRate || 0)
                    const addressLines = formatAddressTwoLines(store.address)
                    
                    return (
                      <TableRow key={storeData.storeId}>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium">{store.name || "Unknown Store"}</div>
                            <div className="flex items-start gap-1 text-xs text-muted-foreground">
                              <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0" />
                              <div className="flex flex-col">
                                <span>{addressLines.line1}</span>
                              </div>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {brand.name || "Unknown Brand"}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{formatNumber(metrics.totalViews || 0)}</div>
                          <div className="text-xs text-muted-foreground">
                            {formatPercentageValue(metrics.callConversionRate || 0)} call rate
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{formatPercentageValue(metrics.engagementRate || 0)}</div>
                          <div className="text-xs text-muted-foreground">
                            {formatNumber(metrics.totalActions || 0)} total actions
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{formatNumber(metrics.totalCallClicks || 0)}</div>
                          <div className="text-xs text-muted-foreground">
                            {formatPercentageValue(metrics.callConversionRate || 0)} conversion
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{formatNumber(metrics.totalWebsiteClicks || 0)}</div>
                          <div className="text-xs text-muted-foreground">
                            {formatPercentageValue(metrics.websiteConversionRate || 0)} conversion
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge className={`text-xs ${performance.bgColor} ${performance.color}`}>
                              {performance.grade}
                            </Badge>
                            <span className={`text-sm font-medium ${performance.color}`}>
                              {formatPercentage(metrics.engagementRate || 0)}
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
