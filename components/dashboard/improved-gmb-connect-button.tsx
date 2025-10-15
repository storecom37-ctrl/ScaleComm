"use client"

import { Button } from '@/components/ui/button'
import { useGmbAuth } from '@/lib/hooks/use-gmb-auth'
import { useGmbStore } from '@/lib/stores/gmb-store'
import { useSWRConfig } from 'swr'
import { useEffect, useRef, useState } from 'react'
import { 
  Store, 
  RefreshCw, 
  Loader2,
  Play
} from 'lucide-react'

interface GmbConnectButtonProps {
  compact?: boolean
}

interface ProgressNotification {
  id: string
  type: 'progress' | 'complete' | 'error' | 'checkpoint' | 'resume' | 'warning'
  title: string
  message: string
  progress?: number
  total?: number
  timestamp: Date
  dataType?: string
  locationId?: string
  errors?: string[]
  warnings?: string[]
}

interface SyncState {
  id: string
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'paused'
  progress: {
    total: number
    completed: number
    percentage: number
  }
  currentStep: string
  errors: any[]
  warnings: any[]
}

export function ImprovedGmbConnectButton({ compact = false }: GmbConnectButtonProps) {
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
  
  // Local state for improved sync
  const [syncState, setSyncState] = useState<SyncState | null>(null)
  const [canResume, setCanResume] = useState(false)
  const [isResuming, setIsResuming] = useState(false)

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

  const handleImprovedSync = async () => {
    try {
      setSyncing(true)
      setSyncState(null)
      setCanResume(false)
      
      // Get tokens first
      const tokensResponse = await fetch('/api/auth/gmb/tokens')
      const tokensData = await tokensResponse.json()
      
      if (!tokensData.tokens) {
        throw new Error('No GMB tokens found. Please connect to GMB first.')
      }

      // Add initial notification
      addNotification({
        type: 'progress',
        title: 'Starting Improved GMB Sync',
        message: 'Initializing orchestrated sync process...'
      })

      // Use the new orchestrated sync endpoint
      const response = await fetch('/api/gmb/orchestrated-sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          tokens: tokensData.tokens,
          config: {
            maxConcurrentLocations: 5,
            batchSize: 10,
            enableDataValidation: true,
            enableDataTransformation: true,
            enableDataEnrichment: true,
            enableParallelProcessing: true,
            enableBulkOperations: true,
            enableProgressTracking: true
          }
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to start orchestrated sync')
      }

      // Handle the streaming response
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
                console.log('Improved sync progress:', data)
                
                // Handle different message types
                switch (data.type) {
                  case 'sync_start':
                    addNotification({
                      type: 'progress',
                      title: 'Sync Started',
                      message: 'Orchestrated sync process initialized'
                    })
                    break

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
                        total: data.progress.total,
                        dataType: data.progress.dataType,
                        locationId: data.progress.locationId
                      })
                    }
                    break

                  case 'checkpoint':
                    addNotification({
                      type: 'checkpoint',
                      title: 'Checkpoint Reached',
                      message: `Completed ${data.checkpoint?.step || 'step'} - ${data.checkpoint?.dataCount || 0} records processed`
                    })
                    break

                  case 'errors':
                    if (data.errors && data.errors.length > 0) {
                      addNotification({
                        type: 'error',
                        title: 'Sync Errors',
                        message: `Encountered ${data.errors.length} errors in ${data.step}`,
                        errors: data.errors
                      })
                    }
                    break

                  case 'warnings':
                    if (data.warnings && data.warnings.length > 0) {
                      addNotification({
                        type: 'warning',
                        title: 'Sync Warnings',
                        message: `Found ${data.warnings.length} warnings in ${data.step}`,
                        warnings: data.warnings
                      })
                    }
                    break

                  case 'sync_complete':
                    setGlobalCurrentProgress(null)
                    setSyncing(false)
                    setSyncState(null)
                    setCanResume(false)
                    
                    // Fetch all data from database after sync completes
                    addNotification({
                      type: 'progress',
                      title: 'Loading Data',
                      message: 'Fetching synchronized data from database...'
                    })
                    
                    try {
                      console.log('📥 Fetching all data from database after sync...')
                      
                      // Fetch all relevant data from database in parallel
                      const fetchPromises = [
                        fetch('/api/stores?limit=100').then(res => res.json()),
                        fetch('/api/gmb/data/locations').then(res => res.json()),
                        fetch('/api/gmb/data/reviews?limit=100').then(res => res.json()),
                        fetch('/api/gmb/data/posts?limit=100').then(res => res.json()),
                        fetch('/api/gmb/data/stats').then(res => res.json()),
                        fetch('/api/performance?limit=100&days=30').then(res => res.json()),
                        fetch('/api/brands').then(res => res.json())
                      ]
                      
                      const results = await Promise.allSettled(fetchPromises)
                      
                      // Log the results
                      const [stores, locations, reviews, posts, stats, performance, brands] = results
                      
                      console.log('✅ Database fetch complete:')
                      console.log('  - Stores:', stores.status === 'fulfilled' ? stores.value.data?.length || 0 : 'failed')
                      console.log('  - Locations:', locations.status === 'fulfilled' ? locations.value.data?.length || 0 : 'failed')
                      console.log('  - Reviews:', reviews.status === 'fulfilled' ? reviews.value.data?.length || 0 : 'failed')
                      console.log('  - Posts:', posts.status === 'fulfilled' ? posts.value.data?.length || 0 : 'failed')
                      console.log('  - Stats:', stats.status === 'fulfilled' ? 'loaded' : 'failed')
                      console.log('  - Performance:', performance.status === 'fulfilled' ? performance.value.data?.length || 0 : 'failed')
                      console.log('  - Brands:', brands.status === 'fulfilled' ? brands.value.data?.length || 0 : 'failed')
                      
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
                        title: 'Sync Complete!',
                        message: `Successfully synced ${data.result?.stats?.totalLocations || 0} locations with ${data.result?.stats?.totalReviews || 0} reviews`
                      })
                    } catch (e) {
                      console.warn('Failed to fetch data after sync:', e)
                      addNotification({
                        type: 'complete',
                        title: 'Sync Complete!',
                        message: `Synced ${data.result?.stats?.totalLocations || 0} locations. Please refresh to see updates.`
                      })
                    }
                    
                    console.log('Improved GMB sync completed successfully!', data.result)
                    return

                  case 'sync_failed':
                    setGlobalCurrentProgress(null)
                    setSyncState(data.result?.syncState || null)
                    setCanResume(data.result?.syncState?.status === 'paused')
                    
                    addNotification({
                      type: 'error',
                      title: 'Sync Failed',
                      message: data.message || 'Sync failed with errors',
                      errors: data.result?.errors || []
                    })
                    break

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
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Improved GMB sync failed:', error)
      setGlobalCurrentProgress(null)
      setSyncState(null)
      setCanResume(false)
      addNotification({
        type: 'error',
        title: 'Sync Failed',
        message: error instanceof Error ? error.message : 'Failed to sync GMB data'
      })
      throw error
    } finally {
      // Ensure UI does not remain stuck in syncing state if stream closed without final message
      setSyncing(false)
      setGlobalCurrentProgress(null)
    }
  }

  const handleResumeSync = async () => {
    if (!syncState?.id) return

    try {
      setIsResuming(true)
      setSyncing(true)
      
      // Get tokens first
      const tokensResponse = await fetch('/api/auth/gmb/tokens')
      const tokensData = await tokensResponse.json()
      
      if (!tokensData.tokens) {
        throw new Error('No GMB tokens found. Please connect to GMB first.')
      }

      addNotification({
        type: 'resume',
        title: 'Resuming Sync',
        message: `Resuming sync from checkpoint: ${syncState.currentStep}`
      })

      // Use the resume sync endpoint
      const response = await fetch('/api/gmb/resume-sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          syncStateId: syncState.id,
          tokens: tokensData.tokens
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to resume sync')
      }

      // Handle the streaming response (same as above)
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
                console.log('Resume sync progress:', data)
                
                // Handle progress updates (similar to above)
                switch (data.type) {
                  case 'progress':
                    if (data.progress) {
                      setGlobalCurrentProgress({
                        step: data.progress.step,
                        message: data.progress.message,
                        progress: data.progress.progress,
                        total: data.progress.total
                      })
                    }
                    break
                  case 'complete':
                    setGlobalCurrentProgress(null)
                    setSyncing(false)
                    setSyncState(null)
                    setCanResume(false)
                    addNotification({
                      type: 'complete',
                      title: 'Resume Complete!',
                      message: 'Sync successfully resumed and completed'
                    })
                    return
                }
              } catch (e) {
                console.warn('Failed to parse resume SSE data:', e)
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Resume sync failed:', error)
      setGlobalCurrentProgress(null)
      addNotification({
        type: 'error',
        title: 'Resume Failed',
        message: error instanceof Error ? error.message : 'Failed to resume sync'
      })
    } finally {
      setIsResuming(false)
      setSyncing(false)
    }
  }

  // Keep a stable reference to handleSync
  const handleSyncRef = useRef<() => Promise<void>>(handleImprovedSync)
  useEffect(() => {
    handleSyncRef.current = handleImprovedSync
  }, [handleImprovedSync])

  // Auto-sync when connected
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
    handleSyncRef.current().catch(() => {
      hasAutoSyncedRef.current = false
      try {
        if (typeof window !== 'undefined') sessionStorage.removeItem('gmbAutoSynced')
      } catch {}
    })
  }, [isConnected, isSyncing])

  const getStepTitle = (step: string) => {
    switch (step) {
      case 'initialization': return 'Initializing'
      case 'account': return 'Connecting Account'
      case 'locations': return 'Fetching Locations'
      case 'location_processing': return 'Processing Locations'
      case 'data_fetching': return 'Fetching Data'
      case 'reviews': return 'Retrieving Reviews'
      case 'posts': return 'Getting Posts'
      case 'insights': return 'Fetching Performance Data'
      case 'searchKeywords': return 'Processing Keywords'
      case 'finalization': return 'Finalizing'
      default: return 'Processing'
    }
  }

  if (!isConnected) {
    return (
      <Button 
        onClick={handleConnect} 
        disabled={isAuthenticating}
        className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300"
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

  // Show resume button if sync can be resumed
  if (canResume && syncState) {
    return (
      <div className="w-full max-w-md space-y-2">
        <Button 
          onClick={handleResumeSync} 
          disabled={isResuming || isSyncing}
          className="flex items-center gap-2 bg-gradient-to-r from-orange-600 to-red-700 hover:from-orange-700 hover:to-red-800 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300"
        >
          {isResuming ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="animate-pulse">Resuming...</span>
            </>
          ) : (
            <>
              <Play className="h-4 w-4" />
              Resume Sync ({Math.round(syncState.progress.percentage)}%)
            </>
          )}
        </Button>
        <div className="text-xs text-gray-500 text-center">
          Sync paused at: {syncState.currentStep}
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-md">
      <Button 
        onClick={handleImprovedSync} 
        disabled={isSyncing}
        className="flex items-center gap-2 bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300"
      >
        {isSyncing ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="animate-pulse">Syncing...</span>
          </>
        ) : (
          <>
            <RefreshCw className="h-4 w-4" />
            Improved Sync
          </>
        )}
      </Button>
    </div>
  )
}




