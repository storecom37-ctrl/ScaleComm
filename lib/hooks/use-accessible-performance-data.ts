"use client"

import useSWR from 'swr'
import { useGmbAuth } from './use-gmb-auth'
import { PerformanceData, AggregatedMetrics, PerformanceFilters } from './use-performance-data'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

interface UseAccessiblePerformanceDataReturn {
  data: PerformanceData[]
  aggregated: AggregatedMetrics
  isLoading: boolean
  error: string | null
  totalCount: number
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
  fetchData: (filters?: PerformanceFilters) => Promise<void>
  refresh: () => Promise<void>
  uniqueStores: Array<{ _id: string; name: string; address?: string; city?: string }>
  uniqueBrands: Array<{ _id: string; name: string; slug: string }>
  hasGmbAccess: boolean
  accessMessage?: string
}

/**
 * Custom hook for fetching performance data with GMB access control using SWR
 * Only shows performance data for stores that the user has access to through their GMB account
 */
export function useAccessiblePerformanceData(filters: PerformanceFilters = {}): UseAccessiblePerformanceDataReturn {
  const { isConnected } = useGmbAuth()
  const hasGmbAccess = isConnected

  // Build URL parameters like the keywords API
  const params = new URLSearchParams()
  if (filters.status) params.append('status', filters.status)
  if (filters.storeId && filters.storeId !== 'all') params.append('storeId', filters.storeId)
  if (filters.brandId && filters.brandId !== 'all') params.append('brandId', filters.brandId)
  if (filters.accountId) params.append('accountId', filters.accountId)
  if (filters.periodType) params.append('periodType', filters.periodType)
  if (filters.limit) params.append('limit', filters.limit.toString())
  else params.append('limit', '100')

  // Handle date filtering - prioritize days parameter
  if (filters.days) {
    params.append('days', filters.days.toString())
  } else if (filters.startDate && filters.endDate) {
    params.append('startDate', filters.startDate)
    params.append('endDate', filters.endDate)
  } else if (filters.dateRange) {
    params.append('dateRange', filters.dateRange.toString())
  }

  // Use SWR for data fetching - always fetch data
  const { data, error, isLoading, mutate } = useSWR(
    `/api/performance?${params.toString()}`,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      refreshInterval: 0,
      errorRetryCount: 3,
      errorRetryInterval: 2000,
      shouldRetryOnError: (error) => {
        return error?.status !== 404
      }
    }
  )

  // Get unique stores and brands from current data
  const performanceData: PerformanceData[] = data?.success ? data.data : []
  const uniqueStores: Array<{ _id: string; name: string; address?: string; city?: string }> = Array.from(
    new Map(performanceData.map((item: any) => [item.storeId?._id, item.storeId])).values()
  ).filter(Boolean)

  const uniqueBrands: Array<{ _id: string; name: string; slug: string }> = Array.from(
    new Map(performanceData.map((item: any) => [item.brandId?._id, item.brandId])).values()
  ).filter(Boolean)

  return {
    data: performanceData,
    aggregated: data?.success ? data.aggregated : {
      totalViews: 0,
      totalActions: 0,
      totalCallClicks: 0,
      totalWebsiteClicks: 0,
      totalDirectionRequests: 0,
      averageConversionRate: 0,
      averageClickThroughRate: 0
    },
    isLoading: isLoading || (data?.loading === true),
    error: error || (data?.success === false ? data.error : null),
    totalCount: data?.success ? data.totalCount : 0,
    pagination: data?.success ? data.pagination : {
      page: 1,
      limit: 100,
      total: 0,
      pages: 0
    },
    fetchData: async (newFilters?: PerformanceFilters) => {
      // For SWR, we'll trigger a revalidation
      mutate()
    },
    refresh: mutate,
    uniqueStores,
    uniqueBrands,
    hasGmbAccess: true, // Always show data now
    accessMessage: data?.message
  }
}

/**
 * Hook for fetching store-wise performance analytics with access control using SWR
 */
export function useAccessibleStoreWisePerformanceData(filters: PerformanceFilters = {}) {
  const { isConnected } = useGmbAuth()
  
  // Build URL parameters like the keywords API
  const params = new URLSearchParams()
  if (filters.status) params.append('status', filters.status)
  if (filters.storeId && filters.storeId !== 'all') params.append('storeId', filters.storeId)
  if (filters.brandId && filters.brandId !== 'all') params.append('brandId', filters.brandId)
  if (filters.accountId) params.append('accountId', filters.accountId)
  if (filters.days) params.append('days', filters.days.toString())
  if (filters.startDate && filters.endDate) {
    params.append('startDate', filters.startDate)
    params.append('endDate', filters.endDate)
  }
  if (filters.dateRange) params.append('dateRange', filters.dateRange.toString())
  if (filters.limit) params.append('limit', filters.limit.toString())
  else params.append('limit', '1000') // Default limit like before

  // Use SWR for data fetching - only fetch data if GMB is connected
  const apiUrl = `/api/performance/store-wise?${params.toString()}`
  
  
  
  const { data, error, isLoading, mutate } = useSWR(
    apiUrl, // Always fetch data, regardless of GMB connection
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      refreshInterval: 0,
      errorRetryCount: 3,
      errorRetryInterval: 2000,
      shouldRetryOnError: (error) => {
        // Retry on network errors but not on 404s
        return error?.status !== 404
      }
    }
  )

  return {
    data: data?.success ? data.data : [],
    storeWiseData: data?.success ? data.storeWiseData : {},
    aggregated: data?.success ? data.aggregated : {
      totalViews: 0,
      totalActions: 0,
      totalCallClicks: 0,
      totalWebsiteClicks: 0,
      totalDirectionRequests: 0,
      totalStores: 0,
      totalDataPoints: 0
    },
    isLoading: isLoading || (data?.loading === true),
    error: error || (data?.success === false ? data.error : null),
    hasGmbAccess: isConnected,
    refresh: mutate
  }
}

