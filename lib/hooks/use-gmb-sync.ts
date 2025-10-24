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

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          
          const chunk = decoder.decode(value)
          const lines = chunk.split('\n')
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6))
                
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
                    finalResult = {
                      account: data.data?.account,
                      locations: data.data?.locations?.length || 0,
                      reviews: data.data?.reviews?.length || 0,
                      posts: data.data?.posts?.length || 0,
                      brands: 1,
                      stores: data.data?.locations?.length || 0
                    }
                    break
                    
                  case 'error':
                    throw new Error(data.error || 'Sync failed')
                }
              } catch (e) {
                console.warn('Failed to parse SSE data:', e)
              }
            }
          }
        }
      }

      if (finalResult) {
        setLastSyncResult(finalResult)
        
        return finalResult
      } else {
        throw new Error('Sync completed but no result received')
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