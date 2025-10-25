"use client"

import { Button } from '@/components/ui/button'
import { useGmbAuth } from '@/lib/hooks/use-gmb-auth'
import { useGmbStore } from '@/lib/stores/gmb-store'
import { useSWRConfig } from 'swr'
import { useEffect, useRef } from 'react'
import { 
  Store, 
  RefreshCw, 
  Loader2
} from 'lucide-react'

interface GmbConnectButtonProps {
  compact?: boolean
}

interface ProgressNotification {
  id: string
  type: 'progress' | 'complete' | 'error' | 'save-progress' | 'save-complete' | 'save-error'
  title: string
  message: string
  progress?: number
  total?: number
  timestamp: Date
}

export function GmbConnectButton({ compact = false }: GmbConnectButtonProps) {
  const {
    isConnected,
    isAuthenticating,
    initiateAuth
  } = useGmbAuth()
  
  const { 
    isSyncing,
    setSyncing
  } = useGmbStore()
  const { mutate } = useSWRConfig()
  // Use global notification system
  const addNotification = (notification: Omit<ProgressNotification, 'id' | 'timestamp'>) => {
    if ((window as any).addGmbNotification) {
      (window as any).addGmbNotification(notification)
    }
  }

  const setGlobalCurrentProgress = (progress: {
    step: string
    message: string
    progress: number
    total: number
  } | null) => {
    if ((window as any).setGmbCurrentProgress) {
      (window as any).setGmbCurrentProgress(progress)
    }
  }

  const handleConnect = async () => {
    await initiateAuth()
  }

  const handleSync = async () => {
    try {
      // Set syncing state
      setSyncing(true)
      
      // Add initial notification immediately for better UX
      addNotification({
        type: 'progress',
        title: 'Starting GMB Sync',
        message: 'Preparing to sync...'
      })
      
      // Get tokens first - this is fast if cached
      const tokensResponse = await fetch('/api/auth/gmb/tokens', {
        headers: { 'Content-Type': 'application/json' }
      })
      
      if (!tokensResponse.ok) {
        throw new Error(`Failed to get tokens: ${tokensResponse.status} ${tokensResponse.statusText}`)
      }
      
      const tokensData = await tokensResponse.json()
      
      if (!tokensData.tokens) {
        throw new Error('No GMB tokens found. Please connect to GMB first.')
      }

      // Update notification with connection status
      addNotification({
        type: 'progress',
        title: 'Connected',
        message: 'Connecting to Google My Business API...'
      })

      // Use the proper sync endpoint that fetches GMB data from Google API
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 300000) // 5 minute timeout
      
      const response = await fetch('/api/gmb/sync-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tokens: tokensData.tokens }),
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`Sync request failed: ${response.status} ${response.statusText}`)
      }

      // The sync-data endpoint uses Server-Sent Events, so we need to handle the stream
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

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
                      setGlobalCurrentProgress({
                        step: data.progress.step,
                        message: data.progress.message,
                        progress: data.progress.progress,
                        total: data.progress.total
                      })
                      
                      addNotification({
                        type: 'progress',
                        title: getStepTitle(data.progress.step),
                        message: data.progress.message,
                        progress: data.progress.progress,
                        total: data.progress.total
                      })
                    }
                    break
                    
                  case 'account':
                    addNotification({
                      type: 'complete',
                      title: 'Account Connected',
                      message: `Found ${data.brand?.name || data.account?.name} - Ready to sync locations`
                    })
                    break
                    
                  case 'locations':
                    addNotification({
                      type: 'complete',
                      title: 'Locations Discovered',
                      message: `Found ${data.locations?.length || 0} business locations`
                    })
                    break
                    
                  case 'reviews':
                    addNotification({
                      type: 'complete',
                      title: 'Reviews Fetched',
                      message: `Retrieved ${data.reviews?.length || 0} reviews`
                    })
                    break
                    
                  case 'posts':
                    addNotification({
                      type: 'complete',
                      title: 'Posts Retrieved',
                      message: `Found ${data.posts?.length || 0} posts`
                    })
                    break
                    
                  case 'insights':
                    addNotification({
                      type: 'complete',
                      title: 'Performance Data',
                      message: 'Insights and analytics retrieved'
                    })
                    break
                    
                  case 'save-progress':
                    addNotification({
                      type: 'save-progress',
                      title: 'Saving to Database',
                      message: data.progress?.message || 'Saving data...'
                    })
                    break
                    
                  case 'save-complete':
                    addNotification({
                      type: 'save-complete',
                      title: 'Database Updated',
                      message: data.message || 'Data saved successfully'
                    })
                    break
                    
                  case 'save-error':
                    addNotification({
                      type: 'save-error',
                      title: 'Save Error',
                      message: data.error || 'Failed to save data'
                    })
                    break
                    
                  case 'complete':
                    setGlobalCurrentProgress(null)
                    setSyncing(false)
                    
                    // Fetch all data from database after sync completes
                    addNotification({
                      type: 'progress',
                      title: 'Loading Data',
                      message: 'Fetching synchronized data from database...'
                    })
                    
                    // Smart delay: Check if data is ready, with max wait of 3 seconds
                    const startTime = Date.now()
                    const maxWait = 3000
                    let dataReady = false
                    
                    while (Date.now() - startTime < maxWait && !dataReady) {
                      await new Promise(resolve => setTimeout(resolve, 500))
                      
                      // Quick check if data is available
                      try {
                        const quickCheck = await fetch('/api/gmb/data/stats', {
                          headers: { 'Content-Type': 'application/json' }
                        })
                        
                        if (quickCheck.ok) {
                          const statsData = await quickCheck.json()
                          if (statsData.success) {
                            dataReady = true
                          
                            break
                          }
                        }
                      } catch (e) {
                        // Continue waiting
                      }
                    }
                    
                    // If not ready after checking, wait a bit more
                    if (!dataReady) {
                      await new Promise(resolve => setTimeout(resolve, 1000))
                    }
                    
                    try {
                      
                      
                      // Fetch all relevant data from database in parallel with timeout
                      const fetchWithTimeout = async (url: string, timeout = 10000) => {
                        const controller = new AbortController()
                        const timeoutId = setTimeout(() => controller.abort(), timeout)
                        
                        try {
                          const response = await fetch(url, {
                            signal: controller.signal,
                            headers: { 'Content-Type': 'application/json' }
                          })
                          clearTimeout(timeoutId)
                          
                          if (!response.ok) {
                            throw new Error(`HTTP ${response.status}: ${response.statusText}`)
                          }
                          
                          return await response.json()
                        } catch (err) {
                          clearTimeout(timeoutId)
                          throw err
                        }
                      }
                      
                      const fetchPromises = [
                        fetchWithTimeout('/api/stores?limit=100'),
                        fetchWithTimeout('/api/gmb/data/locations'),
                        fetchWithTimeout('/api/gmb/data/reviews?limit=100'),
                        fetchWithTimeout('/api/gmb/data/posts?limit=100'),
                        fetchWithTimeout('/api/gmb/data/stats'),
                        fetchWithTimeout('/api/performance?limit=100&days=30'),
                        fetchWithTimeout('/api/brands'),
                        fetchWithTimeout('/api/gmb/data/keywords?limit=100')
                      ]
                      
                      const results = await Promise.allSettled(fetchPromises)
                      
                      // Log the results
                      const [stores, locations, reviews, posts, stats, performance, brands, keywords] = results
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      
                      // Revalidate SWR caches so UI reflects fresh data
                      await mutate(
                        (key: string) => typeof key === 'string' && (
                          key.startsWith('/api/gmb/') ||
                          key.startsWith('/api/stores') ||
                          key.startsWith('/api/reviews') ||
                          key.startsWith('/api/performance') ||
                          key.startsWith('/api/brands')
                        ),
                        undefined,
                        { revalidate: true }
                      )
                      
                      
                      
                      addNotification({
                        type: 'complete',
                        title: 'Sync Complete',
                        message: 'All GMB data has been synchronized and loaded successfully!'
                      })
                    } catch (e) {
                      console.warn('Failed to fetch data after sync:', e)
                      addNotification({
                        type: 'complete',
                        title: 'Sync Complete',
                        message: 'Data synchronized. Please refresh the page to see updates.'
                      })
                    }
                    
                    
                    return
                    
                  case 'error':
                    setGlobalCurrentProgress(null)
                    addNotification({
                      type: 'error',
                      title: 'Sync Error',
                      message: data.error || 'An error occurred during sync'
                    })
                    break
                }
              } catch (e) {
                console.warn('Failed to parse SSE data:', e)
                console.warn('Raw line that failed to parse:', line)
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('GMB sync failed:', error)
      setGlobalCurrentProgress(null)
      addNotification({
        type: 'error',
        title: 'Sync Failed',
        message: error instanceof Error ? error.message : 'Failed to sync GMB data'
      })
      throw error
    } finally {
      // Ensure UI is not stuck in syncing state if stream ends without 'complete'
      setSyncing(false)
      setGlobalCurrentProgress(null)
    }
  }

  // Keep a stable reference to handleSync to use inside effects safely
  const handleSyncRef = useRef<() => Promise<void>>(handleSync)
  useEffect(() => {
    handleSyncRef.current = handleSync
  }, [handleSync])

  // Ensure we auto-trigger a sync once after the user is connected
  const hasAutoSyncedRef = useRef(false)
  useEffect(() => {
    if (!isConnected || isSyncing) return
    if (hasAutoSyncedRef.current) return

    try {
      const already = typeof window !== 'undefined' ? sessionStorage.getItem('gmbAutoSynced') : '1'
      if (already === '1') return
      sessionStorage.setItem('gmbAutoSynced', '1')
    } catch {}

    
    hasAutoSyncedRef.current = true
    
    // Add notification for auto-sync
    addNotification({
      type: 'progress',
      title: 'Auto-Sync Starting',
      message: 'Automatically syncing GMB data after connection...'
    })
    
    handleSyncRef.current().catch((error) => {
      console.error('Auto-sync failed:', error)
      hasAutoSyncedRef.current = false
      try {
        if (typeof window !== 'undefined') sessionStorage.removeItem('gmbAutoSynced')
      } catch {}
    })
  }, [isConnected, isSyncing])

  const getStepTitle = (step: string) => {
    switch (step) {
      case 'account': return 'Connecting Account'
      case 'locations': return 'Fetching Locations'
      case 'reviews': return 'Retrieving Reviews'
      case 'posts': return 'Getting Posts'
      case 'insights': return 'Fetching Performance Data'
      case 'keywords': return 'Processing Keywords'
      default: return 'Processing'
    }
  }

  if (!isConnected) {
    return (
      <Button 
        onClick={handleConnect} 
        disabled={isAuthenticating}
        className="flex items-center gap-2 bg-[#4285F4] hover:bg-[#3367D6] text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300"
      >
        {isAuthenticating ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="animate-pulse">Connecting...</span>
          </>
        ) : (
          <>
            <Store className="h-4 w-4" />
            Connect GMB
          </>
        )}
      </Button>
    )
  }

  return (
    <div className="w-full max-w-md">
      <Button 
        onClick={handleSync} 
        disabled={isSyncing}
        className="flex items-center gap-2 bg-[#4285F4] hover:bg-[#3367D6] text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300"
      >
        {isSyncing ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="animate-pulse">Syncing...</span>
          </>
        ) : (
          <>
            <RefreshCw className="h-4 w-4" />
            Sync GMB
          </>
        )}
      </Button>
    </div>
  )
}
