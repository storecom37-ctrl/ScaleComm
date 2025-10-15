import { useState, useEffect } from 'react'
import useSWR from 'swr'

// Generic fetcher for API calls
const fetcher = (url: string) => fetch(url).then((res) => res.json())

// Hook to fetch brands from database
export function useBrands(accountId?: string) {
  const params = new URLSearchParams()
  if (accountId) params.append('accountId', accountId)
  
  const { data, error, isLoading, mutate } = useSWR(
    `/api/brands?${params.toString()}`,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      refreshInterval: 0
    }
  )
  
  return {
    brands: data?.success ? data.data : [],
    count: data?.count || 0,
    totalCount: data?.totalCount || 0,
    isLoading,
    error: error || (data?.success === false ? data.error : null),
    refresh: mutate
  }
}

// Hook to fetch GMB account data from database
export function useGmbAccount(email?: string, id?: string) {
  const params = new URLSearchParams()
  if (email) params.append('email', email)
  if (id) params.append('id', id)
  
  const { data, error, isLoading, mutate } = useSWR(
    `/api/gmb/data/account?${params.toString()}`,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      refreshInterval: 0 // Don't auto-refresh
    }
  )
  
  return {
    account: data?.success ? data.data : null,
    isLoading,
    error: error || (data?.success === false ? data.error : null),
    refresh: mutate
  }
}

// Hook to fetch GMB locations from database
export function useGmbLocations(accountId?: string) {
  const params = new URLSearchParams()
  if (accountId) params.append('accountId', accountId)
  
  // Always fetch locations, even without accountId, to get all available locations
  const { data, error, isLoading, mutate } = useSWR(
    `/api/gmb/data/locations?${params.toString()}`,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      refreshInterval: 0
    }
  )
  
  return {
    locations: data?.success ? data.data : [],
    count: data?.count || 0,
    isLoading,
    error: error || (data?.success === false ? data.error : null),
    refresh: mutate
  }
}

// Hook to fetch GMB reviews from database
export function useGmbReviews(options?: {
  accountId?: string
  locationId?: string
  storeId?: string
  brandId?: string
  viewType?: 'brand' | 'store' | 'all'
  limit?: number
  skip?: number
  status?: string
  rating?: string
  search?: string
}) {
  const params = new URLSearchParams()
  if (options?.accountId) params.append('accountId', options.accountId)
  if (options?.locationId) params.append('locationId', options.locationId)
  if (options?.storeId) params.append('storeId', options.storeId)
  if (options?.brandId) params.append('brandId', options.brandId)
  if (options?.viewType) params.append('viewType', options.viewType)
  if (options?.limit) params.append('limit', options.limit.toString())
  if (options?.skip) params.append('skip', options.skip.toString())
  if (options?.status) params.append('status', options.status)
  if (options?.rating) params.append('rating', options.rating)
  if (options?.search) params.append('search', options.search)
  
  const { data, error, isLoading, mutate } = useSWR(
    `/api/gmb/data/reviews?${params.toString()}`,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      refreshInterval: 0
    }
  )
  
  return {
    reviews: data?.success ? data.data : [],
    count: data?.count || 0,
    totalCount: data?.totalCount || 0,
    pagination: data?.pagination || null,
    accountId: data?.accountId || null,
    processingTime: data?.processingTime || 0,
    metadata: data?.metadata || null,
    isLoading: isLoading || (data?.loading === true),
    error: error || (data?.success === false ? data.error : null),
    refresh: mutate
  }
}

// Hook to fetch reviews using the simpler reviews API (supports brand/store filtering)
export function useReviews(options?: {
  accountId?: string
  storeId?: string
  brandId?: string
  viewType?: 'brand' | 'store' | 'all'
  limit?: number
  skip?: number
  status?: string
  hasResponse?: boolean
  rating?: number
  search?: string
}) {
  const params = new URLSearchParams()
  if (options?.accountId) params.append('accountId', options.accountId)
  if (options?.storeId) params.append('storeId', options.storeId)
  if (options?.brandId) params.append('brandId', options.brandId)
  if (options?.viewType) params.append('viewType', options.viewType)
  if (options?.limit) params.append('limit', options.limit.toString())
  if (options?.skip) params.append('skip', options.skip.toString())
  if (options?.status) params.append('status', options.status)
  if (options?.hasResponse !== undefined) params.append('hasResponse', options.hasResponse.toString())
  if (options?.rating) params.append('rating', options.rating.toString())
  if (options?.search) params.append('search', options.search)
  
  const { data, error, isLoading, mutate } = useSWR(
    `/api/reviews?${params.toString()}`,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      refreshInterval: 0
    }
  )
  
  return {
    reviews: data?.success ? data.data : [],
    count: data?.count || 0,
    totalCount: data?.totalCount || 0,
    pagination: data?.pagination || null,
    metadata: data?.metadata || null,
    isLoading,
    error: error || (data?.success === false ? data.error : null),
    refresh: mutate
  }
}

// Hook to fetch stores from database
export function useStores(options?: {
  accountId?: string
  brandId?: string
  search?: string
  status?: string
  limit?: number
  page?: number
}) {
  const params = new URLSearchParams()
  if (options?.accountId) params.append('accountId', options.accountId)
  if (options?.brandId) params.append('brandId', options.brandId)
  if (options?.search) params.append('search', options.search)
  if (options?.status) params.append('status', options.status)
  if (options?.limit) params.append('limit', options.limit.toString())
  if (options?.page) params.append('page', options.page.toString())
  
  const { data, error, isLoading, mutate } = useSWR(
    `/api/stores?${params.toString()}`,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      refreshInterval: 0
    }
  )
  
  return {
    stores: data?.success ? data.data : [],
    pagination: data?.pagination || null,
    isLoading,
    error: error || (data?.success === false ? data.error : null),
    refresh: mutate
  }
}

// Hook to fetch GMB posts from database
export function useGmbPosts(options?: {
  locationId?: string
  storeId?: string
  limit?: number
  skip?: number
  topicType?: string
  status?: string
  state?: string
  search?: string
}) {
  const params = new URLSearchParams()
  if (options?.locationId) params.append('locationId', options.locationId)
  if (options?.storeId) params.append('storeId', options.storeId)
  if (options?.limit) params.append('limit', options.limit.toString())
  if (options?.skip) params.append('skip', options.skip.toString())
  if (options?.topicType) params.append('topicType', options.topicType)
  if (options?.status) params.append('status', options.status)
  if (options?.state) params.append('state', options.state)
  if (options?.search) params.append('search', options.search)
  
  const { data, error, isLoading, mutate } = useSWR(
    `/api/gmb/data/posts?${params.toString()}`,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      refreshInterval: 0
    }
  )
  
  return {
    posts: data?.success ? data.data : [],
    count: data?.count || 0,
    totalCount: data?.totalCount || 0,
    pagination: data?.pagination || null,
    accountId: data?.accountId || null,
    processingTime: data?.processingTime || 0,
    isLoading: isLoading || (data?.loading === true),
    error: error || (data?.success === false ? data.error : null),
    refresh: mutate
  }
}

// Hook to fetch GMB statistics from database
export function useGmbStats(accountId?: string, locationId?: string) {
  const params = new URLSearchParams()
  if (accountId) params.append('accountId', accountId)
  if (locationId) params.append('locationId', locationId)
  
  const { data, error, isLoading, mutate } = useSWR(
    `/api/gmb/data/stats?${params.toString()}`,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      refreshInterval: 30000 // Refresh every 30 seconds for stats
    }
  )
  
  return {
    stats: data?.success ? data.data : null,
    overview: data?.success ? data.data.overview : null,
    reviewDistribution: data?.success ? data.data.reviewDistribution : null,
    monthlyTrends: data?.success ? data.data.monthlyTrends : null,
    isLoading,
    error: error || (data?.success === false ? data.error : null),
    refresh: mutate
  }
}

// Hook to get current user's email
export function useCurrentUser() {
  const { data, error, isLoading, mutate } = useSWR(
    '/api/auth/gmb/user',
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      refreshInterval: 0
    }
  )
  
  return {
    user: data?.success ? data.data : null,
    email: data?.success ? data.data.email : null,
    isLoading,
    error: error || (data?.success === false ? data.error : null),
    refresh: mutate
  }
}

// Combined hook that fetches all GMB data
export function useGmbData() {
  const [isConnected, setIsConnected] = useState(false)
  
  // Get current user's email first
  const { email: currentUserEmail, isLoading: userLoading } = useCurrentUser()
  
  // Fetch account using current user's email
  const accountQuery = useGmbAccount(currentUserEmail || undefined)
  const { account, isLoading: accountLoading } = accountQuery
  
  // Fetch locations immediately (don't wait for account)
  const locationsQuery = useGmbLocations()
  const { locations, isLoading: locationsLoading } = locationsQuery
  
  // Fetch reviews for all locations
  const reviewsQuery = useGmbReviews()
  const { reviews, isLoading: reviewsLoading } = reviewsQuery
  
  // Fetch posts for all locations
  const postsQuery = useGmbPosts()
  const { posts, isLoading: postsLoading } = postsQuery
  
  // Fetch overall stats
  const statsQuery = useGmbStats()
  const { stats, isLoading: statsLoading } = statsQuery
  
  // Update connection status based on account existence
  useEffect(() => {
    setIsConnected(!!account)
  }, [account])
  
  const isLoading = userLoading || accountLoading || locationsLoading || reviewsLoading || postsLoading || statsLoading
  
  // Refresh all data
  const refreshAll = async () => {
    await Promise.all([
      accountQuery.refresh(),
      locationsQuery.refresh(),
      reviewsQuery.refresh(),
      postsQuery.refresh(),
      statsQuery.refresh()
    ])
  }
  
  return {
    // Connection state
    isConnected,
    isLoading,
    
    // User info
    currentUserEmail,
    
    // Data
    account,
    locations: locations || [],
    reviews: reviews || [],
    posts: posts || [],
    stats,
    
    // Individual query states
    queries: {
      account: accountQuery,
      locations: locationsQuery,
      reviews: reviewsQuery,
      posts: postsQuery,
      stats: statsQuery
    },
    
    // Actions
    refreshAll,
    
    // Computed values
    totalLocations: locations?.length || 0,
    totalReviews: reviews?.length || 0,
    totalPosts: posts?.length || 0,
    averageRating: reviews?.length > 0 
      ? reviews.reduce((sum: number, review: any) => sum + review.starRating, 0) / reviews.length 
      : 0
  }
}
