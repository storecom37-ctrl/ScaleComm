import { useState, useEffect } from 'react'

interface StoreWithPerformance {
  _id: string
  name: string | null
  totalViews: number
  totalActions: number
  lastUpdated: string
  accountId: string
}

interface UseStoresWithPerformanceReturn {
  stores: StoreWithPerformance[]
  isLoading: boolean
  error: string | null
  refresh: () => void
  totalStores: number
}

export function useStoresWithPerformance(limit: number = 1000): UseStoresWithPerformanceReturn {
  const [stores, setStores] = useState<StoreWithPerformance[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totalStores, setTotalStores] = useState(0)

  const fetchStores = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      // Add timeout to prevent hanging requests
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout
      
      const response = await fetch(`/api/stores/with-performance?limit=${limit}`, {
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-cache'
      })
      
      clearTimeout(timeoutId)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.success) {
        setStores(data.data || [])
        setTotalStores(data.count || 0)
      } else {
        throw new Error(data.error || 'Failed to fetch stores with performance data')
      }
    } catch (err) {
      console.error('Error fetching stores with performance data:', err)
      if (err instanceof Error && err.name === 'AbortError') {
        setError('Request timed out. Please try again.')
      } else {
        setError(err instanceof Error ? err.message : 'Unknown error')
      }
      setStores([])
      setTotalStores(0)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchStores()
  }, [limit])

  const refresh = () => {
    fetchStores()
  }

  return {
    stores,
    isLoading,
    error,
    refresh,
    totalStores
  }
}
