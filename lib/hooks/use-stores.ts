import { useState, useEffect } from 'react'

interface UseStoresOptions {
  status?: string
  limit?: number
  search?: string
  brandId?: string
  accountId?: string
  autoFetch?: boolean
}

export function useStores(options: UseStoresOptions = {}) {
  const {
    status = 'active',
    limit = 10000, // Increased from 100 to support large store lists
    search = '',
    brandId = '',
    accountId = '',
    autoFetch = true
  } = options

  const [stores, setStores] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState<any>(null)

  const fetchStores = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const params = new URLSearchParams()
      if (status) params.append('status', status)
      if (limit) params.append('limit', limit.toString())
      if (search) params.append('search', search)
      if (brandId) params.append('brandId', brandId)
      if (accountId) params.append('accountId', accountId)

      const response = await fetch(`/api/stores?${params.toString()}`)
      const result = await response.json()

      if (result.success) {
        setStores(result.data || [])
        setPagination(result.pagination)
      } else {
        setError(result.error || 'Failed to fetch stores')
        setStores([])
      }
    } catch (err) {
      console.error('Error fetching stores:', err)
      setError('Failed to fetch stores')
      setStores([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (autoFetch) {
      fetchStores()
    }
  }, [status, limit, search, brandId, accountId, autoFetch])

  const refresh = () => {
    fetchStores()
  }

  return {
    stores,
    isLoading,
    error,
    pagination,
    refresh,
    totalStores: pagination?.total || 0
  }
}

// Hook to get stores linked to a specific GMB account
export function useGmbLinkedStores(gmbAccountId?: string) {
  const [stores, setStores] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!gmbAccountId) {
      setStores([])
      return
    }

    const fetchGmbLinkedStores = async () => {
      setIsLoading(true)
      setError(null)
      
      try {
        const params = new URLSearchParams()
        params.append('status', 'active')
        params.append('limit', '10000') // Fetch all stores for the account
        params.append('accountId', gmbAccountId)

        const response = await fetch(`/api/stores?${params.toString()}`)
        const result = await response.json()

        if (result.success) {
          setStores(result.data || [])
        } else {
          setError(result.error || 'Failed to fetch stores')
          setStores([])
        }
      } catch (err) {
        console.error('Error fetching GMB linked stores:', err)
        setError('Failed to fetch stores')
        setStores([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchGmbLinkedStores()
  }, [gmbAccountId])

  return {
    stores,
    isLoading,
    error
  }
}