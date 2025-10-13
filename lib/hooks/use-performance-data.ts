"use client"

import { useState, useEffect, useCallback } from 'react'

export interface PerformanceData {
  _id: string
  period: {
    startTime: string
    endTime: string
    periodType: string
  }
  storeId: {
    _id: string
    name: string
    address?: string
    city?: string
  }
  brandId: {
    _id: string
    name: string
    slug: string
  }
  accountId: string
  views: number
  actions: number
  callClicks: number
  websiteClicks: number
  photoViews: number
  queries: number
  businessMessages: number
  businessBookings: number
  businessFoodOrders: number
  clickThroughRate: number
  conversionRate: number
  createdAt: string
  updatedAt: string
  status: string
  source: string
}

export interface AggregatedMetrics {
  totalViews: number
  totalActions: number
  totalCallClicks: number
  totalWebsiteClicks: number
  averageConversionRate: number
  averageClickThroughRate: number
}

export interface PerformanceFilters {
  storeId?: string
  brandId?: string
  accountId?: string
  periodType?: string
  startDate?: string
  endDate?: string
  days?: number
  dateRange?: number // 7, 30, 90, 180 days
  limit?: number
  status?: string
}

interface UsePerformanceDataReturn {
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
}

export function usePerformanceData(initialFilters: PerformanceFilters = {}): UsePerformanceDataReturn {
  const [data, setData] = useState<PerformanceData[]>([])
  const [aggregated, setAggregated] = useState<AggregatedMetrics>({
    totalViews: 0,
    totalActions: 0,
    totalCallClicks: 0,
    totalWebsiteClicks: 0,
    averageConversionRate: 0,
    averageClickThroughRate: 0
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totalCount, setTotalCount] = useState(0)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 100,
    total: 0,
    pages: 0
  })
  const [currentFilters, setCurrentFilters] = useState<PerformanceFilters>(initialFilters)

  const fetchData = useCallback(async (filters: PerformanceFilters = currentFilters) => {
    setIsLoading(true)
    setError(null)
    
    try {
      const params = new URLSearchParams({
        limit: (filters.limit || 100).toString(),
        status: filters.status || 'active'
      })

      // Add filters to params
      if (filters.storeId && filters.storeId !== 'all') {
        params.append('storeId', filters.storeId)
      }
      if (filters.brandId && filters.brandId !== 'all') {
        params.append('brandId', filters.brandId)
      }
      if (filters.accountId) {
        params.append('accountId', filters.accountId)
      }
      if (filters.periodType) {
        params.append('periodType', filters.periodType)
      }

      // Handle date filtering
      if (filters.startDate && filters.endDate) {
        params.append('startDate', filters.startDate)
        params.append('endDate', filters.endDate)
      } else if (filters.days) {
        const endDate = new Date()
        const startDate = new Date()
        startDate.setDate(startDate.getDate() - filters.days)
        
        params.append('startDate', startDate.toISOString())
        params.append('endDate', endDate.toISOString())
      }

      const response = await fetch(`/api/performance?${params}`)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const result = await response.json()

      if (result.success) {
        setData(result.data || [])
        setAggregated(result.aggregated || {
          totalViews: 0,
          totalActions: 0,
          totalCallClicks: 0,
          totalWebsiteClicks: 0,
          averageConversionRate: 0,
          averageClickThroughRate: 0
        })
        setTotalCount(result.totalCount || 0)
        setPagination(result.pagination || {
          page: 1,
          limit: 100,
          total: 0,
          pages: 0
        })
        setCurrentFilters(filters)
      } else {
        throw new Error(result.error || 'Failed to fetch performance data')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      console.error('Error fetching performance data:', err)
    } finally {
      setIsLoading(false)
    }
  }, [currentFilters])

  const refresh = useCallback(() => {
    return fetchData(currentFilters)
  }, [fetchData, currentFilters])

  // Get unique stores and brands from current data
  const uniqueStores = Array.from(
    new Map(data.map(item => [item.storeId._id, item.storeId])).values()
  )

  const uniqueBrands = Array.from(
    new Map(data.map(item => [item.brandId._id, item.brandId])).values()
  )

  // Initial fetch
  useEffect(() => {
    fetchData(initialFilters)
  }, []) // Only run on mount

  return {
    data,
    aggregated,
    isLoading,
    error,
    totalCount,
    pagination,
    fetchData,
    refresh,
    uniqueStores,
    uniqueBrands
  }
}

// Helper functions for data analysis
export function calculateEngagementRate(aggregated: AggregatedMetrics): number {
  const totalEngagement = aggregated.totalCallClicks + aggregated.totalWebsiteClicks
  return aggregated.totalViews > 0 ? (totalEngagement / aggregated.totalViews) * 100 : 0
}

export function calculateConversionRates(aggregated: AggregatedMetrics) {
  const totalViews = Math.max(aggregated.totalViews, 1) // Avoid division by zero
  
  return {
    callConversion: (aggregated.totalCallClicks / totalViews) * 100,
    websiteConversion: (aggregated.totalWebsiteClicks / totalViews) * 100,
    overallEngagement: calculateEngagementRate(aggregated)
  }
}

export function groupDataByStore(data: PerformanceData[]) {
  return data.reduce((acc, item) => {
    const storeId = item.storeId._id
    if (!acc[storeId]) {
      acc[storeId] = {
        store: item.storeId,
        brand: item.brandId,
        metrics: {
          totalViews: 0,
          totalActions: 0,
          totalCallClicks: 0,
          totalWebsiteClicks: 0,
          totalPhotoViews: 0,
          totalQueries: 0,
          totalMessages: 0,
          totalBookings: 0,
          totalFoodOrders: 0,
          averageConversionRate: 0,
          averageClickThroughRate: 0
        },
        count: 0
      }
    }

    const store = acc[storeId]
    store.metrics.totalViews += item.views
    store.metrics.totalActions += item.actions
    store.metrics.totalCallClicks += item.callClicks
    store.metrics.totalWebsiteClicks += item.websiteClicks
    store.metrics.totalPhotoViews += item.photoViews
    store.metrics.totalQueries += item.queries
    store.metrics.totalMessages += item.businessMessages
    store.metrics.totalBookings += item.businessBookings
    store.metrics.totalFoodOrders += item.businessFoodOrders
    store.metrics.averageConversionRate += item.conversionRate
    store.metrics.averageClickThroughRate += item.clickThroughRate
    store.count += 1

    return acc
  }, {} as Record<string, any>)
}

export function calculateStoreAverages(storeData: Record<string, any>) {
  Object.values(storeData).forEach((store: any) => {
    if (store.count > 0) {
      store.metrics.averageConversionRate = store.metrics.averageConversionRate / store.count
      store.metrics.averageClickThroughRate = store.metrics.averageClickThroughRate / store.count
    }
  })
  return storeData
}

