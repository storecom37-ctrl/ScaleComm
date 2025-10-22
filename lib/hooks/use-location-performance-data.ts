"use client"

import useSWR from 'swr'
import { useGmbAuth } from './use-gmb-auth'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

interface LocationPerformanceData {
  locationId: string
  totalViews: number
  totalActions: number
  totalCallClicks: number
  totalWebsiteClicks: number
  totalDirectionRequests: number
  averageConversionRate: number
  dataPointsCount: number
}

interface UseLocationPerformanceDataReturn {
  data: Record<string, LocationPerformanceData>
  isLoading: boolean
  error: string | null
  refresh: () => Promise<void>
}

/**
 * Hook to fetch location-specific performance data
 */
export function useLocationPerformanceData(filters: {
  days?: number
  startDate?: string
  endDate?: string
  dateRange?: number
  status?: string
} = {}): UseLocationPerformanceDataReturn {
  const { isConnected } = useGmbAuth()
  
  // Build URL parameters
  const params = new URLSearchParams()
  if (filters.status) params.append('status', filters.status)
  
  // Handle date filtering - prioritize days parameter
  if (filters.days) {
    params.append('days', filters.days.toString())
  } else if (filters.startDate && filters.endDate) {
    params.append('startDate', filters.startDate)
    params.append('endDate', filters.endDate)
  }
  if (filters.dateRange) params.append('dateRange', filters.dateRange.toString())
  params.append('groupBy', 'store')

  // Use SWR for data fetching
  const apiUrl = `/api/performance/store-wise?${params.toString()}`
  console.log('🔍 useLocationPerformanceData - API URL:', apiUrl)
  console.log('🔍 useLocationPerformanceData - Filters:', filters)
  
  const { data, error, isLoading, mutate } = useSWR(
    isConnected ? apiUrl : null,
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

  // Transform data into location-specific format
  const locationData: Record<string, LocationPerformanceData> = {}
  if (data?.success && data.data) {
    data.data.forEach((item: any) => {
      if (item.store?.gmbLocationId) {
        locationData[item.store.gmbLocationId] = {
          locationId: item.store.gmbLocationId,
          totalViews: item.totalViews || 0,
          totalActions: item.totalActions || 0,
          totalCallClicks: item.totalCallClicks || 0,
          totalWebsiteClicks: item.totalWebsiteClicks || 0,
          totalDirectionRequests: item.totalDirectionRequests || 0,
          averageConversionRate: item.averageConversionRate || 0,
          dataPointsCount: item.dataPointsCount || 0
        }
      }
    })
  }

  return {
    data: locationData,
    isLoading: isLoading || (data?.loading === true),
    error: error || (data?.success === false ? data.error : null),
    refresh: mutate
  }
}
