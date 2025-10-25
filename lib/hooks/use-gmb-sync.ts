import { useState, useCallback } from 'react'

interface SyncStats {
  accounts: number
  locations: number
  reviews: number
  posts: number
}

interface SyncResult {
  account: any
  locations: number
  reviews: number
  posts: number
  brands: number
  stores: number
}

interface SyncProgress {
  step: number
  totalSteps: number
  currentStep: string
  processed: number
  total: number
  found: number
}

export function useGmbSync() {
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [syncStats, setSyncStats] = useState<SyncStats | null>(null)
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null)
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null)

  const syncGmbData = useCallback(async (tokens: any) => {
    setIsSyncing(true)
    setSyncError(null)
    setSyncProgress({ step: 1, totalSteps: 5, currentStep: 'Starting sync...', processed: 0, total: 0, found: 0 })
    
    try {
      const response = await fetch('/api/gmb/sync-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tokens }),
      })

      if (!response.ok) {
        let errorMessage = `Failed to start GMB sync (${response.status})`
        try {
          const errorData = await response.json()
          if (errorData.error) {
            errorMessage = errorData.error
          }
        } catch (e) {
          // If we can't parse JSON, try to get text
          try {
            const errorText = await response.text()
            if (errorText) {
              errorMessage = `${errorMessage}: ${errorText}`
            }
          } catch (textError) {
            // Use default error message
          }
        }
        throw new Error(errorMessage)
      }

      // Handle streaming response
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let finalResult: any = null
      let hasReceivedComplete = false

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          
          const chunk = decoder.decode(value)
          const lines = chunk.split('\n')
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const jsonData = line.slice(6)
                // Skip empty lines or malformed data
                if (!jsonData.trim()) continue
                
                const data = JSON.parse(jsonData)
                
                // Handle different message types
                switch (data.type) {
                  case 'progress':
                    if (data.progress) {
                      
                      setSyncProgress({
                        step: data.progress.progress || 1,
                        totalSteps: data.progress.total || 5,
                        currentStep: data.progress.message || 'Processing...',
                        processed: data.progress.progress || 0,
                        total: data.progress.total || 5,
                        found: 0
                      })
                    }
                    break
                    
                  case 'complete':
                    hasReceivedComplete = true
                    // Handle different complete message formats
                    if (data.data) {
                      // Original sync-data format
                      finalResult = {
                        account: data.data?.account,
                        locations: data.data?.locations?.length || 0,
                        reviews: data.data?.reviews?.length || 0,
                        posts: data.data?.posts?.length || 0,
                        brands: 1,
                        stores: data.data?.locations?.length || 0
                      }
                    } else if (data.syncState) {
                      // Improved sync format
                      finalResult = {
                        account: data.syncState?.account,
                        locations: data.summary?.totalLocations || 0,
                        reviews: 0, // Not provided in improved sync
                        posts: 0, // Not provided in improved sync
                        brands: 1,
                        stores: data.summary?.totalLocations || 0
                      }
                    } else if (data.result) {
                      // Orchestrated sync format
                      finalResult = {
                        account: data.result?.syncState?.account,
                        locations: data.result?.stats?.totalLocations || 0,
                        reviews: data.result?.stats?.totalReviews || 0,
                        posts: data.result?.stats?.totalPosts || 0,
                        brands: 1,
                        stores: data.result?.stats?.totalLocations || 0
                      }
                    }
                    break
                    
                  case 'sync_complete':
                    hasReceivedComplete = true
                    // Handle orchestrated sync complete format
                    if (data.result) {
                      finalResult = {
                        account: data.result?.syncState?.account,
                        locations: data.result?.stats?.totalLocations || 0,
                        reviews: data.result?.stats?.totalReviews || 0,
                        posts: data.result?.stats?.totalPosts || 0,
                        brands: 1,
                        stores: data.result?.stats?.totalLocations || 0
                      }
                    }
                    break
                    
                  case 'error':
                    throw new Error(data.error || 'Sync failed')
                }
              } catch (e) {
                console.warn('Failed to parse SSE data:', e)
                console.warn('Raw line that failed to parse:', line)
              }
            }
          }
        }
      }

      if (finalResult) {
        setLastSyncResult(finalResult)
        
        return finalResult
      } else if (hasReceivedComplete) {
        console.warn('Sync completed but no result received - this might indicate a successful sync with no data')
        // Return a default result instead of throwing an error
        const defaultResult = {
          account: null,
          locations: 0,
          reviews: 0,
          posts: 0,
          brands: 1,
          stores: 0
        }
        setLastSyncResult(defaultResult)
        return defaultResult
      } else {
        console.warn('Sync completed but no complete message received - this might indicate a sync timeout or error')
        // Return a default result instead of throwing an error
        const defaultResult = {
          account: null,
          locations: 0,
          reviews: 0,
          posts: 0,
          brands: 1,
          stores: 0
        }
        setLastSyncResult(defaultResult)
        return defaultResult
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      setSyncError(errorMessage)
      console.error('GMB sync error:', error)
      throw error
    } finally {
      setIsSyncing(false)
      setSyncProgress(null)
    }
  }, [])

  const getSyncStats = useCallback(async () => {
    try {
      const response = await fetch('/api/gmb/sync-all')
      const result = await response.json()

      if (result.success) {
        setSyncStats(result.data)
        return result.data
      } else {
        throw new Error(result.error || 'Failed to get sync stats')
      }
    } catch (error) {
      console.error('Error getting sync stats:', error)
      throw error
    }
  }, [])

  const clearSyncError = useCallback(() => {
    setSyncError(null)
  }, [])

  return {
    isSyncing,
    syncError,
    syncStats,
    lastSyncResult,
    syncProgress,
    syncGmbData,
    getSyncStats,
    clearSyncError,
  }
}