import useSWR from 'swr'
import { useState } from 'react'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export interface KeywordData {
  keyword: string
  locationId: string
  totalImpressions: number
  totalClicks: number
  avgPosition: number
  avgCtr: number
  monthlyData: Array<{
    year: number
    month: number
    impressions: number
  }>
}

export interface KeywordSummary {
  totalUniqueKeywords: number
  totalImpressions: number
  totalClicks: number
  avgPosition: number
  avgCtr: number
}

export interface UseKeywordsOptions {
  locationId?: string
  year?: number
  month?: number
  limit?: number
  skip?: number
  sortBy?: 'keyword' | 'impressions' | 'clicks' | 'position' | 'ctr'
  sortOrder?: 'asc' | 'desc'
  search?: string
}

export interface UseKeywordsReturn {
  keywords: KeywordData[]
  summary: KeywordSummary | null
  totalCount: number
  isLoading: boolean
  error: string | null
  refresh: () => void
  searchKeywords: (query: string) => void
  clearSearch: () => void
  searchQuery: string
}

export function useKeywords(options: UseKeywordsOptions = {}): UseKeywordsReturn {
  const [searchQuery, setSearchQuery] = useState('')
  
  const params = new URLSearchParams()
  if (options.locationId) params.append('locationId', options.locationId)
  if (options.year) params.append('year', options.year.toString())
  if (options.month) params.append('month', options.month.toString())
  if (options.limit) params.append('limit', options.limit.toString())
  if (options.skip) params.append('skip', options.skip.toString())
  if (options.sortBy) params.append('sortBy', options.sortBy)
  if (options.sortOrder) params.append('sortOrder', options.sortOrder)
  if (searchQuery) params.append('search', searchQuery)
  
  const { data, error, isLoading, mutate } = useSWR(
    `/api/gmb/data/keywords?${params.toString()}`,
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
  
  const searchKeywords = (query: string) => {
    setSearchQuery(query)
  }
  
  const clearSearch = () => {
    setSearchQuery('')
  }
  
  return {
    keywords: data?.success ? data.data : [],
    summary: data?.success ? data.summary : null,
    totalCount: data?.totalCount || 0,
    isLoading: isLoading || (data?.loading === true),
    error: error || (data?.success === false ? data.error : null),
    refresh: mutate,
    searchKeywords,
    clearSearch,
    searchQuery
  }
}

// Hook for aggregated keyword data across all locations
export function useAggregatedKeywords(options: Omit<UseKeywordsOptions, 'locationId'> = {}): UseKeywordsReturn {
  return useKeywords(options)
}

// Hook for keyword data for a specific location
export function useLocationKeywords(locationId: string, options: Omit<UseKeywordsOptions, 'locationId'> = {}): UseKeywordsReturn {
  return useKeywords({ ...options, locationId })
}
