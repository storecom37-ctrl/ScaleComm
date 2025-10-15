"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useGmbStore } from "@/lib/stores/gmb-store"
import { useGmbSync } from "@/lib/hooks/use-gmb-sync"
import { useGmbAuth } from "@/lib/hooks/use-gmb-auth"
import { useGmbData, useGmbLocations, useReviews, useBrands, useStores } from "@/lib/hooks/use-gmb-data"
import { BrandSelector } from "@/components/dashboard/brand-selector"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { 
  Star, 
  Search, 
  Filter, 
  MoreHorizontal,
  Reply,
  Flag,
  Eye,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  X,
  Download,
  Settings,
  TrendingUp,
  TrendingDown,
  Minus,
  Brain,
  BarChart3
} from "lucide-react"
import { ReviewReplyModal } from "@/components/dashboard/review-reply-modal"
import { useAuth } from "@/lib/hooks/use-auth"
import { SentimentDashboard } from "@/components/dashboard/sentiment-dashboard"
import { BusinessInsightsDashboard } from "@/components/dashboard/business-insights-dashboard"
import { KeywordAnalytics } from "@/components/dashboard/keyword-analytics"

export default function ReviewsPage() {
  const { user, hasPermission } = useAuth()
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(50)
  
  // Filter state
  const [searchTerm, setSearchTerm] = useState("")
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [ratingFilter, setRatingFilter] = useState("all")
  const [storeFilter, setStoreFilter] = useState("all")
  const [dateRangeFilter, setDateRangeFilter] = useState("all")
  const [startDate, setStartDate] = useState<string>("")
  const [endDate, setEndDate] = useState<string>("")
  const [responseTimeFilter, setResponseTimeFilter] = useState("all")
  const [platformFilter, setPlatformFilter] = useState("all")
  
  // Selection state
  const [selectedBrandId, setSelectedBrandId] = useState<string>("")
  const [viewType, setViewType] = useState<'brand' | 'store' | 'all'>('all')
  
  // View state
  const [currentView, setCurrentView] = useState<'main' | 'replied' | 'sentiment' | 'business-insights' | 'keyword-analytics'>('main')
  
  // Bulk selection state
  const [selectedReviews, setSelectedReviews] = useState<Set<string>>(new Set())
  const [showBulkActions, setShowBulkActions] = useState(false)
  
  // UI state
  const [showFilters, setShowFilters] = useState(false)
  const [sortBy, setSortBy] = useState<'date' | 'rating' | 'customer'>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  
  // Reply modal state
  const [replyModalOpen, setReplyModalOpen] = useState(false)
  const [selectedReviewForReply, setSelectedReviewForReply] = useState<any>(null)
  
  // Bulk reply state
  const [bulkReplyModalOpen, setBulkReplyModalOpen] = useState(false)
  const [bulkReplyComment, setBulkReplyComment] = useState("")
  
  // Sentiment analytics state
  const [showSentimentAnalytics, setShowSentimentAnalytics] = useState(false)
  
  // Get GMB data from database only (no localStorage fallback)
  const {
    isConnected: dbConnected,
    isLoading: dbLoading,
    refreshAll
  } = useGmbData()

  // Get stores for all accessible accounts (use stores instead of GMB locations for filtering)
  const {
    stores: accountStores,
    isLoading: storesLoading,
    error: storesError
  } = useStores({
    brandId: selectedBrandId && selectedBrandId !== "all" ? selectedBrandId : undefined,
    limit: 1000, // Get all stores
    page: 1
  })

  // Get brands for all accessible accounts
  const {
    brands: accountBrands,
    isLoading: brandsLoading,
    error: brandsError
  } = useBrands()

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 300)
    
    return () => clearTimeout(timer)
  }, [searchTerm])

  // Get reviews with proper server-side pagination and filtering
  const {
    reviews: dbReviews,
    isLoading: reviewsLoading,
    totalCount: reviewsTotalCount,
    pagination: reviewsPagination,
    metadata: reviewsMetadata,
    error: reviewsError,
    refresh: refreshReviews
  } = useReviews({
    brandId: selectedBrandId && selectedBrandId !== "all" ? selectedBrandId : undefined,
    storeId: storeFilter !== "all" ? storeFilter : undefined, // Server-side store filtering
    hasResponse: currentView === 'main' ? false : currentView === 'replied' ? true : undefined, // Server-side replied/unresponded filter
    rating: ratingFilter !== 'all' ? parseInt(ratingFilter) : undefined, // Server-side rating filter
    search: debouncedSearchTerm.trim() || undefined, // Server-side search with debouncing
    status: statusFilter !== 'all' ? statusFilter : 'active', // Server-side status filtering
    viewType: viewType,
    limit: itemsPerPage, // Use actual page size
    skip: (currentPage - 1) * itemsPerPage // Proper pagination offset
  })
  
  // Get sync state from store (for UI controls only)
  const { isSyncing, reviewsApiAvailable, reviewsApiError, debugState } = useGmbStore()
  
  // Analytics state - now handled by tabs
  
  // Use account-specific stores and database reviews
  const finalStores = accountStores || []
  const finalReviews = dbReviews || []
  const finalIsConnected = dbConnected
  
  // Enhanced loading and error states
  const isLoading = reviewsLoading || storesLoading || brandsLoading
  const hasError = reviewsError || storesError || brandsError
  const isDataEmpty = !isLoading && !hasError && finalReviews.length === 0
  
  const { syncGmbData } = useGmbSync()
  const { getStoredTokens } = useGmbAuth()

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1)
    clearSelection()
  }, [debouncedSearchTerm, ratingFilter, statusFilter, storeFilter, selectedBrandId, viewType, dateRangeFilter, responseTimeFilter, platformFilter, sortBy, sortOrder])

  // Initialize filters on mount
  useEffect(() => {
    setStoreFilter("all")
    setSelectedBrandId("")
    setViewType('all')
    clearSelection()
  }, [])

  // Reset store filter when brand changes
  useEffect(() => {
    setStoreFilter("all")
    clearSelection()
  }, [selectedBrandId])
    
  // Handle manual sync
  const handleSync = async () => {
    const tokens = await getStoredTokens()
    if (tokens) {
      await syncGmbData(tokens)
      // Refresh database data after sync
      setTimeout(() => {
        refreshAll()
      }, 2000)
    }
  }
  
  // Transform GMB reviews to match expected format
  const gmbReviews = useMemo(() => {
    return finalReviews.map((review: any, index: number) => {
      const createDate = review.createTime || review.gmbCreateTime
      const storeInfo = review.storeId || {}
      const brandInfo = review.brandId || {}
      
      // Handle address formatting - split into two lines and make shorter
      let addressLine1 = '' // Street address
      let addressLine2 = '' // City, State, Postal
      
      if (storeInfo.address) {
        if (typeof storeInfo.address === 'string') {
          const parts = storeInfo.address.split(',').map((p: string) => p.trim())
          addressLine1 = parts[0] || ''
          addressLine2 = parts.slice(1, 3).join(', ')
        } else if (typeof storeInfo.address === 'object' && storeInfo.address.line1) {
          const parts = storeInfo.address.line1.split(',').map((p: string) => p.trim())
          // First part is street address
          addressLine1 = parts[0] || ''
          // Get city and state (skip long area names, take last 2-3 parts)
          addressLine2 = parts.slice(-2).join(', ')
        }
      } else if (review.locationAddress) {
        if (typeof review.locationAddress === 'string') {
          const parts = review.locationAddress.split(',').map((p: string) => p.trim())
          addressLine1 = parts[0] || ''
          addressLine2 = parts.slice(1, 3).join(', ')
        } else if (typeof review.locationAddress === 'object' && review.locationAddress.line1) {
          const parts = review.locationAddress.line1.split(',').map((p: string) => p.trim())
          // First part is street address
          addressLine1 = parts[0] || ''
          // Get city and state (skip long area names, take last 2-3 parts)
          addressLine2 = parts.slice(-2).join(', ')
        }
      }
      
      // Truncate if too long
      if (addressLine1.length > 50) {
        addressLine1 = addressLine1.substring(0, 47) + '...'
      }
      if (addressLine2.length > 40) {
        addressLine2 = addressLine2.substring(0, 37) + '...'
      }
      
      return {
        id: review._id || index + 1,
        customer: review.reviewer?.displayName || 'Anonymous',
        store: storeInfo.name || review.locationName || 'Unknown Location',
        rating: review.starRating || 0,
        review: review.comment || 'No comment provided',
        date: createDate ? new Date(createDate).toLocaleDateString() : new Date().toLocaleDateString(),
        fullDate: createDate ? new Date(createDate) : new Date(),
        status: "Published", // Default status for GMB reviews
        responded: review.hasResponse || false,
        platform: "Google My Business",
        // Additional fields from API
        addressLine1: addressLine1,
        addressLine2: addressLine2,
        brandName: brandInfo.name || review.brandName,
        processingTime: review.processingTime,
        // Store ID for filtering
        storeId: review.storeId, // Keep the original storeId (can be object or string)
        // Reply information
        reply: review.response || null,
        replyDate: review.response?.responseTime ? new Date(review.response.responseTime).toLocaleDateString() : null,
        replyFullDate: review.response?.responseTime ? new Date(review.response.responseTime) : null,
        // For sorting and filtering
        customerLower: (review.reviewer?.displayName || 'Anonymous').toLowerCase(),
        reviewLower: (review.comment || '').toLowerCase()
      }
    })
  }, [finalReviews])
  

  // Client-side sorting and date filtering only (main filters are server-side)
  const filteredAndSortedReviews = useMemo(() => {
    let filtered = gmbReviews

    // Most filtering is now done on the server-side (view, rating, search, store)
    // Only status and date range filters remain client-side for now

    // Apply status filter (client-side only for non-standard statuses)
    if (statusFilter !== 'all') {
      filtered = filtered.filter((review: any) => {
        switch (statusFilter) {
          case 'published':
            return review.status === 'Published'
          case 'review':
            return review.status === 'Under Review'
          case 'flagged':
            return review.status === 'Flagged'
          case 'responded':
            return review.responded
          case 'unresponded':
            return !review.responded
          default:
            return true
        }
      })
    }

    // Apply date range filter (client-side for predefined ranges, custom dates handled server-side)
    if (dateRangeFilter !== 'all' && dateRangeFilter !== 'custom') {
      const now = new Date()
      const daysAgo = (days: number) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
      
      filtered = filtered.filter((review: any) => {
        const reviewDate = review.fullDate
        switch (dateRangeFilter) {
          case 'today':
            return reviewDate.toDateString() === now.toDateString()
          case 'week':
            return reviewDate >= daysAgo(7)
          case 'month':
            return reviewDate >= daysAgo(30)
          case 'quarter':
            return reviewDate >= daysAgo(90)
          default:
            return true
        }
      })
    }

    // Apply response time filter (client-side)
    if (responseTimeFilter !== 'all') {
      filtered = filtered.filter((review: any) => {
        if (!review.responded) {
          return responseTimeFilter === 'no-response'
        }
        
        if (review.reply && review.replyFullDate) {
          const responseTime = review.replyFullDate.getTime() - review.fullDate.getTime()
          const hours = responseTime / (1000 * 60 * 60)
          
          switch (responseTimeFilter) {
            case 'fast':
              return hours < 24
            case 'medium':
              return hours >= 24 && hours <= 72
            case 'slow':
              return hours > 72
            default:
              return true
          }
        }
        
        return responseTimeFilter === 'no-response'
      })
    }

    // Apply platform filter (client-side)
    if (platformFilter !== 'all') {
      filtered = filtered.filter((review: any) => {
        const platform = review.platform?.toLowerCase() || ''
        switch (platformFilter) {
          case 'google':
            return platform.includes('google')
          case 'facebook':
            return platform.includes('facebook')
          case 'yelp':
            return platform.includes('yelp')
          case 'tripadvisor':
            return platform.includes('tripadvisor')
          default:
            return true
        }
      })
    }

    // Apply sorting
    filtered.sort((a: any, b: any) => {
      let comparison = 0
      switch (sortBy) {
        case 'date':
          comparison = a.fullDate.getTime() - b.fullDate.getTime()
          break
        case 'rating':
          comparison = a.rating - b.rating
          break
        case 'customer':
          comparison = a.customer.localeCompare(b.customer)
          break
        default:
          comparison = 0
      }
      return sortOrder === 'desc' ? -comparison : comparison
    })

    return filtered
  }, [gmbReviews, currentView, searchTerm, ratingFilter, statusFilter, dateRangeFilter, responseTimeFilter, platformFilter, sortBy, sortOrder])

  // Get real statistics from API metadata (based on all reviews matching the query, not just current page)
  const averageRating = reviewsMetadata?.statistics?.averageRating || 0
  const thisMonthReviews = reviewsMetadata?.statistics?.thisMonthReviews || 0
  const lastMonthReviews = reviewsMetadata?.statistics?.lastMonthReviews || 0
  const ratingDistribution = reviewsMetadata?.statistics?.ratingDistribution || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  
  // Calculate response rate from current page for display
  const currentPageReviews = filteredAndSortedReviews
  const responseRate = currentPageReviews.length > 0
    ? (currentPageReviews.filter((review: any) => review.responded).length / currentPageReviews.length) * 100
    : 0

  // Use server-side pagination data
  // The API already returns paginated results, so we use them directly
  const paginatedReviews = filteredAndSortedReviews
  
  // Use server-provided total count for accurate pagination
  const totalCount = reviewsTotalCount || filteredAndSortedReviews.length
  const totalPages = Math.ceil(totalCount / itemsPerPage)
  
  // Bulk selection handlers
  const handleSelectAll = () => {
    if (selectedReviews.size === paginatedReviews.length) {
      setSelectedReviews(new Set<string>())
      setShowBulkActions(false)
    } else {
      const newSelection = new Set<string>(paginatedReviews.map((review: any) => review.id))
      setSelectedReviews(newSelection)
      setShowBulkActions(true)
    }
  }
  
  const handleSelectReview = (reviewId: string) => {
    const newSelection = new Set(selectedReviews)
    if (newSelection.has(reviewId)) {
      newSelection.delete(reviewId)
    } else {
      newSelection.add(reviewId)
    }
    setSelectedReviews(newSelection)
    setShowBulkActions(newSelection.size > 0)
  }
  
  const clearSelection = () => {
    setSelectedReviews(new Set<string>())
    setShowBulkActions(false)
  }

  // Clear all filters
  const clearAllFilters = useCallback(() => {
    setSearchTerm("")
    setDebouncedSearchTerm("")
    setStatusFilter("all")
    setRatingFilter("all")
    setStoreFilter("all")
    setDateRangeFilter("all")
    setStartDate("")
    setEndDate("")
    setResponseTimeFilter("all")
    setPlatformFilter("all")
    setSortBy('date')
    setSortOrder('desc')
    setCurrentPage(1)
    clearSelection()
  }, [])

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return (
      searchTerm !== "" ||
      statusFilter !== "all" ||
      ratingFilter !== "all" ||
      storeFilter !== "all" ||
      dateRangeFilter !== "all" ||
      startDate !== "" ||
      endDate !== "" ||
      responseTimeFilter !== "all" ||
      platformFilter !== "all" ||
      sortBy !== "date" ||
      sortOrder !== "desc"
    )
  }, [searchTerm, statusFilter, ratingFilter, storeFilter, dateRangeFilter, startDate, endDate, responseTimeFilter, platformFilter, sortBy, sortOrder])
  
  // Bulk action handlers
  const handleBulkReply = () => {
    setBulkReplyModalOpen(true)
  }

  const handleBulkReplySubmit = async () => {
    if (!bulkReplyComment.trim()) {
      alert("Please enter a reply comment")
      return
    }

    const selectedReviewsData = filteredAndSortedReviews.filter((review: any) => 
      selectedReviews.has(review.id) && !review.responded
    )

    if (selectedReviewsData.length === 0) {
      alert("No unresponded reviews selected")
      return
    }

    let successCount = 0
    let errorCount = 0

    for (const review of selectedReviewsData) {
      try {
        const success = await handlePostReply(review.id, bulkReplyComment.trim())
        if (success) {
          successCount++
        } else {
          errorCount++
        }
      } catch (error) {
        console.error(`Error replying to review ${review.id}:`, error)
        errorCount++
      }
    }

    if (successCount > 0) {
      alert(`Successfully replied to ${successCount} review${successCount !== 1 ? 's' : ''}`)
    }
    if (errorCount > 0) {
      alert(`Failed to reply to ${errorCount} review${errorCount !== 1 ? 's' : ''}`)
    }

    setBulkReplyModalOpen(false)
    setBulkReplyComment("")
    clearSelection()
  }

  // Analytics functions - now handled by tabs
  
  const handleBulkExport = () => {
    const selectedReviewsData = filteredAndSortedReviews.filter((review: any) => 
      selectedReviews.has(review.id)
    )
    console.log('Export reviews:', selectedReviewsData)
    // TODO: Implement export functionality
  }
  
  const handleBulkFlag = () => {
    console.log('Bulk flag reviews:', Array.from(selectedReviews))
    // TODO: Implement bulk flag functionality
  }

  // Reply functionality
  const handleReplyToReview = (review: any) => {
    setSelectedReviewForReply(review)
    setReplyModalOpen(true)
  }

  const handlePostReply = async (reviewId: string, comment: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/gmb/reviews/${reviewId}/reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ comment }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to post reply')
      }

      if (data.success) {
        // Refresh the reviews data to show the updated response status
        refreshReviews()
        return true
      } else {
        throw new Error(data.error || 'Failed to post reply')
      }
    } catch (error) {
      console.error('Error posting reply:', error)
      throw error
    }
  }

  const closeReplyModal = () => {
    setReplyModalOpen(false)
    setSelectedReviewForReply(null)
  }

  const renderStars = (rating: number) => {
    return (
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
            }`}
          />
        ))}
      </div>
    )
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Published":
        return <Badge className="bg-green-100 text-green-800">Published</Badge>
      case "Under Review":
        return <Badge variant="secondary">Under Review</Badge>
      case "Flagged":
        return <Badge variant="destructive">Flagged</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reviews</h1>
          <p className="text-muted-foreground">Manage customer reviews across all platforms and stores</p>
        </div>
        <div className="flex items-center gap-2">
          {finalIsConnected && (
            <Button 
              onClick={handleSync} 
              disabled={isSyncing}
              variant="outline" 
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Syncing...' : 'Sync Reviews'}
            </Button>
          )}
          <Button 
            onClick={() => setShowFilters(!showFilters)}
            variant="outline" 
            className="flex items-center gap-2"
          >
            <Filter className="h-4 w-4" />
            {showFilters ? 'Hide' : 'Show'} Filters
          </Button>
          <Button className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Global Brand and Store Selectors */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filter by Brand & Store</CardTitle>
          <CardDescription>
            Select a brand and store to view analytics and reviews
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="brand-filter">Brand</Label>
              <BrandSelector
                selectedBrandId={selectedBrandId}
                onBrandChange={setSelectedBrandId}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="store-filter">Store</Label>
              <Select 
                value={storeFilter} 
                onValueChange={(value) => {
                  setStoreFilter(value)
                  if (value !== 'all') {
                    setViewType('store')
                  }
                }}
                disabled={storesLoading}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={
                    storesLoading ? "Loading stores..." :
                    finalStores.length === 0 ? "No stores found" :
                    "Select store"
                  } />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    All Stores ({finalStores.length})
                  </SelectItem>
                  {finalStores.map((store: any) => (
                    <SelectItem key={store._id} value={store._id.toString()}>
                      <div className="flex flex-col">
                        <span className="font-medium">{store.name}</span>
                        <span className="text-sm text-muted-foreground">
                          {store.address?.line1 || store.address || 'No address'}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* View Navigation Tabs */}
      <div className="flex space-x-1 bg-muted p-1 rounded-lg w-fit">
        <Button
          variant={currentView === 'main' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setCurrentView('main')}
          className="flex items-center gap-2"
        >
          <AlertCircle className="h-4 w-4" />
          Unresponded Reviews
          {currentView === 'main' && totalCount > 0 && (
            <Badge variant="secondary" className="ml-1">
              {totalCount}
            </Badge>
          )}
        </Button>
        <Button
          variant={currentView === 'replied' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setCurrentView('replied')}
          className="flex items-center gap-2"
        >
          <CheckCircle className="h-4 w-4" />
          Replied Reviews
          {currentView === 'replied' && totalCount > 0 && (
            <Badge variant="secondary" className="ml-1">
              {totalCount}
            </Badge>
          )}
        </Button>
        <Button
          variant={currentView === 'sentiment' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setCurrentView('sentiment')}
          className="flex items-center gap-2"
        >
          <Brain className="h-4 w-4" />
          Sentiment Analytics
        </Button>
        <Button
          variant={currentView === 'business-insights' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setCurrentView('business-insights')}
          className="flex items-center gap-2"
        >
          <BarChart3 className="h-4 w-4" />
          Business Insights
        </Button>
        <Button
          variant={currentView === 'keyword-analytics' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setCurrentView('keyword-analytics')}
          className="flex items-center gap-2"
        >
          <Search className="h-4 w-4" />
          Keyword Analytics
        </Button>
      </div>

      {/* Bulk Actions Bar */}
      {showBulkActions && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <span className="text-sm font-medium text-blue-900">
                  {selectedReviews.size} review{selectedReviews.size !== 1 ? 's' : ''} selected
                </span>
                <div className="flex items-center space-x-2">
                  {hasPermission('reply_review') && (
                    <Button size="sm" onClick={handleBulkReply} className="h-8">
                      <Reply className="h-3 w-3 mr-1" />
                      Bulk Reply
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={handleBulkExport} className="h-8">
                    <Download className="h-3 w-3 mr-1" />
                    Export
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleBulkFlag} className="h-8 text-red-600 hover:text-red-700">
                    <Flag className="h-3 w-3 mr-1" />
                    Flag
                  </Button>
                </div>
              </div>
              <Button size="sm" variant="ghost" onClick={clearSelection} className="h-8">
                <X className="h-3 w-3 mr-1" />
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Reviews</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCount}</div>
            <p className="text-xs text-muted-foreground">
              {isLoading ? "Loading..." :
               hasError ? "Error loading" :
               isDataEmpty ? "No reviews found" : 
               `Total matching your filters${(selectedBrandId && selectedBrandId !== 'all') || storeFilter !== 'all' ? ' (filtered)' : ''}`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averageRating.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">
              {totalCount > 0 
                ? (averageRating >= 4.5 ? "Excellent performance" : 
                   averageRating >= 4 ? "Very good" : 
                   averageRating >= 3 ? "Good" : 
                   averageRating >= 2 ? "Needs improvement" : "Critical attention needed")
                : "No reviews yet"}
            </p>
          </CardContent>
        </Card>

        {/* <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Response Rate</CardTitle>
            <Reply className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{responseRate.toFixed(0)}%</div>
            <p className="text-xs text-muted-foreground">
              {responseRate >= 80 ? "Excellent" : 
               responseRate >= 60 ? "Good" : 
               responseRate >= 40 ? "Fair" : "Needs improvement"}
            </p>
          </CardContent>
        </Card> */}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <Badge className="bg-blue-100 text-blue-800">New</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{thisMonthReviews}</div>
            <div className="flex items-center gap-2">
              <p className="text-xs text-muted-foreground">
                {new Date().toLocaleString('default', { month: 'long' })} reviews
              </p>
              {lastMonthReviews > 0 && (
                <div className="flex items-center gap-1">
                  {thisMonthReviews > lastMonthReviews ? (
                    <>
                      <TrendingUp className="h-3 w-3 text-green-600" />
                      <span className="text-xs text-green-600">
                        +{Math.round(((thisMonthReviews - lastMonthReviews) / lastMonthReviews) * 100)}%
                      </span>
                    </>
                  ) : thisMonthReviews < lastMonthReviews ? (
                    <>
                      <TrendingDown className="h-3 w-3 text-red-600" />
                      <span className="text-xs text-red-600">
                        {Math.round(((thisMonthReviews - lastMonthReviews) / lastMonthReviews) * 100)}%
                      </span>
                    </>
                  ) : (
                    <>
                      <Minus className="h-3 w-3 text-gray-600" />
                      <span className="text-xs text-gray-600">0%</span>
                    </>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

            {/* Sentiment Analytics Card */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Sentiment Analytics</CardTitle>
                <Brain className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-2xl font-bold">--</div>
                  <p className="text-xs text-muted-foreground">
                    Click to view comprehensive sentiment analysis
                  </p>
                </div>
              </CardContent>
            </Card>
      </div>

      {/* Main Content - Only show for main views */}
      {(currentView === 'main' || currentView === 'replied') && (
        <>
          {/* Advanced Filters */}
          {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span>Advanced Filters</span>
                {hasActiveFilters && (
                  <Badge variant="secondary" className="text-xs">
                    {[
                      searchTerm && "Search",
                      statusFilter !== "all" && "Status",
                      ratingFilter !== "all" && "Rating",
                      storeFilter !== "all" && "Store",
                      dateRangeFilter !== "all" && "Date",
                      startDate && "Custom Date",
                      responseTimeFilter !== "all" && "Response Time",
                      platformFilter !== "all" && "Platform"
                    ].filter(Boolean).length} active
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                {hasActiveFilters && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={clearAllFilters}
                    className="text-xs"
                  >
                    Clear All
                  </Button>
                )}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setShowFilters(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardTitle>
            <CardDescription>
              Filter reviews by various criteria to find exactly what you're looking for
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {/* Search */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Search</label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search reviews..." 
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              {/* Rating Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Rating</label>
                <Select value={ratingFilter} onValueChange={setRatingFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Ratings" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Ratings</SelectItem>
                    <SelectItem value="5">
                      <div className="flex items-center">
                        {renderStars(5)}
                        <span className="ml-2">5 Stars</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="4">
                      <div className="flex items-center">
                        {renderStars(4)}
                        <span className="ml-2">4 Stars</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="3">
                      <div className="flex items-center">
                        {renderStars(3)}
                        <span className="ml-2">3 Stars</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="2">
                      <div className="flex items-center">
                        {renderStars(2)}
                        <span className="ml-2">2 Stars</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="1">
                      <div className="flex items-center">
                        {renderStars(1)}
                        <span className="ml-2">1 Star</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Status Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="review">Under Review</SelectItem>
                    <SelectItem value="flagged">Flagged</SelectItem>
                    <SelectItem value="responded">
                      <div className="flex items-center">
                        <CheckCircle className="h-3 w-3 mr-2 text-green-500" />
                        <span>Responded</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="unresponded">
                      <div className="flex items-center">
                        <AlertCircle className="h-3 w-3 mr-2 text-orange-500" />
                        <span>Not Responded</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Date Range Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Date Range</label>
                <Select value={dateRangeFilter} onValueChange={(value) => {
                  setDateRangeFilter(value)
                  if (value !== 'custom') {
                    setStartDate("")
                    setEndDate("")
                  }
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Time" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">Last 7 days</SelectItem>
                    <SelectItem value="month">Last 30 days</SelectItem>
                    <SelectItem value="quarter">Last 90 days</SelectItem>
                    <SelectItem value="custom">Custom Range</SelectItem>
                  </SelectContent>
                </Select>
                {dateRangeFilter === 'custom' && (
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div>
                      <label className="text-xs text-muted-foreground">Start Date</label>
                      <Input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="h-8"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">End Date</label>
                      <Input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="h-8"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Advanced Filters Row */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mt-4">
              {/* Response Time Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Response Time</label>
                <Select value={responseTimeFilter} onValueChange={setResponseTimeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Response Times" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Response Times</SelectItem>
                    <SelectItem value="fast">
                      <div className="flex items-center">
                        <CheckCircle className="h-3 w-3 mr-2 text-green-500" />
                        <span>Fast (&lt; 24h)</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="medium">
                      <div className="flex items-center">
                        <AlertCircle className="h-3 w-3 mr-2 text-yellow-500" />
                        <span>Medium (1-3 days)</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="slow">
                      <div className="flex items-center">
                        <X className="h-3 w-3 mr-2 text-red-500" />
                        <span>Slow (&gt; 3 days)</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="no-response">
                      <div className="flex items-center">
                        <Minus className="h-3 w-3 mr-2 text-gray-500" />
                        <span>No Response</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Platform Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Platform</label>
                <Select value={platformFilter} onValueChange={setPlatformFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Platforms" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Platforms</SelectItem>
                    <SelectItem value="google">
                      <div className="flex items-center">
                        <div className="w-3 h-3 mr-2 bg-blue-500 rounded-sm"></div>
                        <span>Google My Business</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="facebook">Facebook</SelectItem>
                    <SelectItem value="yelp">Yelp</SelectItem>
                    <SelectItem value="tripadvisor">TripAdvisor</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Additional Filters Placeholder */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Review Length</label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="All Lengths" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Lengths</SelectItem>
                    <SelectItem value="short">Short (&lt; 50 chars)</SelectItem>
                    <SelectItem value="medium">Medium (50-200 chars)</SelectItem>
                    <SelectItem value="long">Long (&gt; 200 chars)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Sentiment Filter Placeholder */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Sentiment</label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="All Sentiments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sentiments</SelectItem>
                    <SelectItem value="positive">Positive</SelectItem>
                    <SelectItem value="neutral">Neutral</SelectItem>
                    <SelectItem value="negative">Negative</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Sort Options */}
            <div className="mt-4 flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium">Sort by:</label>
                <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date">Date</SelectItem>
                    <SelectItem value="rating">Rating</SelectItem>
                    <SelectItem value="customer">Customer</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                >
                  {sortOrder === 'asc' ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {/* Filter Presets */}
            <div className="mt-6 pt-4 border-t">
              <div className="space-y-3">
                <label className="text-sm font-medium">Quick Filters</label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setRatingFilter("1")
                      setStatusFilter("all")
                      setDateRangeFilter("all")
                      setResponseTimeFilter("all")
                      setPlatformFilter("all")
                      setSearchTerm("")
                    }}
                    className="text-red-600 hover:text-red-700"
                  >
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Low Ratings (1★)
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setRatingFilter("5")
                      setStatusFilter("all")
                      setDateRangeFilter("all")
                      setResponseTimeFilter("all")
                      setPlatformFilter("all")
                      setSearchTerm("")
                    }}
                    className="text-green-600 hover:text-green-700"
                  >
                    <Star className="h-3 w-3 mr-1 fill-current" />
                    High Ratings (5★)
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setStatusFilter("unresponded")
                      setRatingFilter("all")
                      setDateRangeFilter("all")
                      setResponseTimeFilter("no-response")
                      setPlatformFilter("all")
                      setSearchTerm("")
                    }}
                    className="text-orange-600 hover:text-orange-700"
                  >
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Needs Response
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setDateRangeFilter("week")
                      setRatingFilter("all")
                      setStatusFilter("all")
                      setResponseTimeFilter("all")
                      setPlatformFilter("all")
                      setSearchTerm("")
                    }}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    <MessageSquare className="h-3 w-3 mr-1" />
                    Recent Reviews
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setResponseTimeFilter("fast")
                      setRatingFilter("all")
                      setStatusFilter("all")
                      setDateRangeFilter("all")
                      setPlatformFilter("all")
                      setSearchTerm("")
                    }}
                    className="text-green-600 hover:text-green-700"
                  >
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Fast Responses
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setPlatformFilter("google")
                      setRatingFilter("all")
                      setStatusFilter("all")
                      setDateRangeFilter("all")
                      setResponseTimeFilter("all")
                      setSearchTerm("")
                    }}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    <div className="w-3 h-3 mr-1 bg-blue-500 rounded-sm"></div>
                    Google Reviews
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setRatingFilter("all")
                      setStatusFilter("all")
                      setDateRangeFilter("all")
                      setResponseTimeFilter("all")
                      setPlatformFilter("all")
                      setSearchTerm("")
                    }}
                    className="text-gray-600 hover:text-gray-700"
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Reset Filters
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Brand and Store Selectors */}
      <Card>
        <CardHeader>
          <CardTitle>Reviews Management</CardTitle>
          <CardDescription>
            {isLoading
              ? "Loading reviews..."
              : hasError
                ? "Error loading reviews"
                : isDataEmpty
                  ? "No reviews found"
                  : `Showing ${totalCount} reviews from all stores${searchTerm || statusFilter !== 'all' || ratingFilter !== 'all' || dateRangeFilter !== 'all' ? ' (filtered)' : ''}`
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col space-y-4 md:flex-row md:items-center md:space-y-0 md:space-x-4">
            {/* Brand Selector */}
            <div className="flex-1">
                <BrandSelector 
                selectedBrandId={selectedBrandId}
                onBrandChange={setSelectedBrandId}
                allowAll={true}
              />
            </div>
            
            {/* Store Selector */}
            <div className="flex-1">
            <Select 
              value={storeFilter} 
              onValueChange={(value) => {
                setStoreFilter(value)
                if (value !== 'all') {
                    setViewType('store')
                }
              }}
              disabled={storesLoading}
            >
                <SelectTrigger className="w-full">
                <SelectValue placeholder={
                  storesLoading ? "Loading stores..." :
                  finalStores.length === 0 ? "No stores found" :
                  "Select store"
                } />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                    All Stores ({finalStores.length})
                </SelectItem>
                {finalStores.map((store: any) => (
                  <SelectItem key={store._id} value={store._id.toString()}>
                    <div className="flex flex-col">
                      <span className="font-medium">{store.name}</span>
                      {store.address && (
                        <span className="text-xs text-muted-foreground">
                          {typeof store.address === 'string' ? store.address : store.address.line1 || ''}
                        </span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            </div>
          </div>

          {/* Reviews Table */}
          <div className="mt-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center space-y-3">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                  <p className="text-muted-foreground">Loading reviews...</p>
                </div>
              </div>
            ) : hasError ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center space-y-3">
                  <AlertCircle className="h-8 w-8 mx-auto text-red-500" />
                  <p className="text-red-600">Error loading reviews: {hasError}</p>
                  <Button onClick={() => refreshReviews()} variant="outline">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Retry
                  </Button>
                </div>
              </div>
            ) : isDataEmpty ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center space-y-3">
                  <MessageSquare className="h-8 w-8 mx-auto text-muted-foreground" />
                  <p className="text-muted-foreground">No reviews found</p>
                </div>
              </div>
            ) : (
              <Table>
              <TableHeader>
                <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedReviews.size === paginatedReviews.length && paginatedReviews.length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Store</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Review</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Platform</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedReviews.map((review: any) => (
                    <TableRow key={review.id} className={selectedReviews.has(review.id) ? "bg-blue-50" : ""}>
                      <TableCell>
                        <Checkbox
                          checked={selectedReviews.has(review.id)}
                          onCheckedChange={() => handleSelectReview(review.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center space-x-2">
                          <span>{review.customer}</span>
                          {review.responded && (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{review.store}</span>
                          {review.addressLine1 && (
                            <span className="text-xs text-muted-foreground">{review.addressLine1}</span>
                          )}
                          {review.addressLine2 && (
                            <span className="text-xs text-muted-foreground">{review.addressLine2}</span>
                          )}
                          {review.brandName && (
                            <span className="text-xs text-blue-600 font-medium">{review.brandName}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          {renderStars(review.rating)}
                          <span className="text-sm text-muted-foreground">({review.rating})</span>
                        </div>
                      </TableCell>
                    <TableCell className="max-w-xs">
                      <p className="truncate" title={review.review}>
                        {review.review}
                      </p>
                    </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span>{review.date}</span>
                          <span className="text-xs text-muted-foreground">
                            {Math.floor((Date.now() - review.fullDate.getTime()) / (1000 * 60 * 60 * 24))} days ago
                          </span>
                        </div>
                      </TableCell>
                    <TableCell>{getStatusBadge(review.status)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{review.platform}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem>
                            <Eye className="mr-2 h-4 w-4" />
                            View Full Review
                          </DropdownMenuItem>
                          {currentView === 'main' && hasPermission('reply_review') && (
                            <DropdownMenuItem 
                              onClick={() => handleReplyToReview(review)}
                            >
                              <Reply className="mr-2 h-4 w-4" />
                              Reply
                            </DropdownMenuItem>
                          )}
                          {currentView === 'replied' && (
                            <DropdownMenuItem>
                              <CheckCircle className="mr-2 h-4 w-4" />
                              View Reply Details
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-red-600">
                            <Flag className="mr-2 h-4 w-4" />
                            Flag Review
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              </Table>
            )}

            {/* Pagination */}
            {!isDataEmpty && (
            <div className="flex items-center justify-between space-x-2 py-4">
              <div className="flex items-center space-x-2">
                <p className="text-sm text-muted-foreground">
                    Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount} reviews
                    {(responseTimeFilter !== 'all' || platformFilter !== 'all') && (
                    <span className="ml-2 text-xs text-blue-600">
                        (client-side filtered)
                    </span>
                  )}
                </p>
                  {selectedReviews.size > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {selectedReviews.size} selected
                    </Badge>
                  )}
              </div>
              
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-2">
                  <p className="text-sm text-muted-foreground">Rows per page:</p>
                  <Select value={itemsPerPage.toString()} onValueChange={(value: string) => {
                    setItemsPerPage(Number(value))
                    setCurrentPage(1)
                  }}>
                    <SelectTrigger className="h-8 w-[70px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent side="top">
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                      <SelectItem value="200">200</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  
                  <div className="flex items-center space-x-1">
                    <span className="text-sm text-muted-foreground">
                      Page {currentPage} of {totalPages}
                    </span>
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Replied Reviews Detailed View */}
      {currentView === 'replied' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Replied Reviews - Complete Details
            </CardTitle>
            <CardDescription>
              Detailed view of all reviews that have been responded to
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {paginatedReviews.map((review: any) => (
                <div key={review.id} className="border rounded-lg p-6 space-y-4">
                  {/* Review Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        {renderStars(review.rating)}
                        <span className="text-sm text-muted-foreground">({review.rating})</span>
                      </div>
                      <div>
                        <h3 className="font-semibold">{review.customer}</h3>
                        <p className="text-sm text-muted-foreground">{review.store}</p>
                        {review.addressLine1 && (
                          <p className="text-xs text-muted-foreground">{review.addressLine1}</p>
                        )}
                        {review.addressLine2 && (
                          <p className="text-xs text-muted-foreground">{review.addressLine2}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{review.date}</p>
                      <p className="text-xs text-muted-foreground">
                        {Math.floor((Date.now() - review.fullDate.getTime()) / (1000 * 60 * 60 * 24))} days ago
                      </p>
                    </div>
                  </div>

                  {/* Review Content */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-sm text-gray-700 mb-2">Customer Review:</h4>
                    <p className="text-gray-900">{review.review}</p>
                  </div>

                  {/* Reply Content */}
                  {review.reply && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-start space-x-3">
                        <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <h4 className="font-medium text-sm text-green-800 mb-2">Business Reply:</h4>
                          <p className="text-green-900 mb-3">{review.reply.comment}</p>
                          <div className="flex items-center space-x-4 text-xs text-green-600">
                            <span>Replied on: {review.replyDate}</span>
                            <span>•</span>
                            <span>By: {review.reply.respondedBy || 'Manager'}</span>
                            <span>•</span>
                            <span>Platform: {review.platform}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline">{review.platform}</Badge>
                      <Badge className="bg-green-100 text-green-800">Responded</Badge>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-2" />
                        View Full
                      </Button>
                      <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                        <Flag className="h-4 w-4 mr-2" />
                        Flag
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
        </>
      )}

      {/* Reply Modal */}
      {selectedReviewForReply && (
        <ReviewReplyModal
          isOpen={replyModalOpen}
          onClose={closeReplyModal}
          review={selectedReviewForReply}
          onReply={handlePostReply}
        />
      )}

      {/* Bulk Reply Modal */}
      <Dialog open={bulkReplyModalOpen} onOpenChange={setBulkReplyModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Reply className="h-5 w-5" />
              Bulk Reply to Reviews
            </DialogTitle>
            <DialogDescription>
              Send the same reply to {selectedReviews.size} selected review{selectedReviews.size !== 1 ? 's' : ''}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bulk-reply-comment" className="text-sm font-medium">
                Reply Message
              </Label>
              <Textarea
                id="bulk-reply-comment"
                placeholder="Thank you for your feedback! We appreciate your business..."
                value={bulkReplyComment}
                onChange={(e) => setBulkReplyComment(e.target.value)}
                className="min-h-[100px] resize-none"
                maxLength={1000}
              />
              <div className="text-xs text-gray-500 text-right">
                {bulkReplyComment.length}/1000 characters
              </div>
            </div>

            <div className="p-3 bg-yellow-50 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> This will send the same reply to all selected reviews. 
                Only unresponded reviews will be replied to.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setBulkReplyModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleBulkReplySubmit}
              disabled={!bulkReplyComment.trim()}
              className="min-w-[120px]"
            >
              Send Bulk Reply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>




      {/* Sentiment Analytics Tab */}
      {currentView === 'sentiment' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Sentiment Analytics Dashboard
            </CardTitle>
            <CardDescription>
              Comprehensive sentiment analysis and insights for your brand
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SentimentDashboard
              brandId={selectedBrandId && selectedBrandId !== '' ? selectedBrandId : undefined}
              storeId={storeFilter !== 'all' ? storeFilter : undefined}
              type={storeFilter !== 'all' ? 'store' : 'brand'}
            />
          </CardContent>
        </Card>
      )}

      {/* Business Insights Tab */}
      {currentView === 'business-insights' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Business Insights Dashboard
            </CardTitle>
            <CardDescription>
              AI-powered business insights including keyword cloud, complaints, and product feedback
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BusinessInsightsDashboard
              brandId={selectedBrandId && selectedBrandId !== '' ? selectedBrandId : undefined}
              storeId={storeFilter !== 'all' ? storeFilter : undefined}
              type={storeFilter !== 'all' ? 'store' : 'brand'}
              analysisDays={30}
            />
          </CardContent>
        </Card>
      )}

      {/* Keyword Analytics Tab */}
      {currentView === 'keyword-analytics' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Keyword Analytics
            </CardTitle>
            <CardDescription>
              Analyze keywords and phrases from customer reviews
            </CardDescription>
          </CardHeader>
          <CardContent>
            <KeywordAnalytics
              locationId={storeFilter !== 'all' ? storeFilter : undefined}
              title="Keyword Analytics"
              description="Search performance and keyword insights"
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
