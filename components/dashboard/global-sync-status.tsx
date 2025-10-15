"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  RefreshCw, 
  Database, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  MapPin,
  Star,
  FileText,
  X,
  Target
} from 'lucide-react'
import { useGmbSync } from '@/lib/hooks/use-gmb-sync'
import { useGmbData } from '@/lib/hooks/use-gmb-data'

interface GlobalSyncStatusProps {
  className?: string
}

export default function GlobalSyncStatus({ className }: GlobalSyncStatusProps) {
  const { isSyncing, syncError, syncStats, lastSyncResult, syncProgress, getSyncStats } = useGmbSync()
  const { locations, reviews, account } = useGmbData()
  const [isVisible, setIsVisible] = useState(false)

  // Load sync stats on component mount
  useEffect(() => {
    getSyncStats().catch(console.error)
  }, [getSyncStats])

  // Show/hide based on sync status
  useEffect(() => {
    if (isSyncing) {
      // Immediately show when syncing starts
      setIsVisible(true)
    } else if (syncError || lastSyncResult) {
      // Show for errors or completed sync
      setIsVisible(true)
      
      // Auto-hide after successful sync or error
      const timer = setTimeout(() => {
        setIsVisible(false)
      }, 5000) // Hide after 5 seconds
      
      return () => clearTimeout(timer)
    }
  }, [isSyncing, syncError, lastSyncResult])

  // Use default progress if syncProgress is not available
  const currentProgress = syncProgress || {
    step: 3,
    totalSteps: 5,
    currentStep: 'Retrieving Reviews',
    processed: 7,
    total: locations?.length || 83,
    found: reviews?.length || 0
  }

  const handleClose = () => {
    setIsVisible(false)
  }

  // For testing - show if there's a test query parameter
  const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
  const isTestMode = urlParams?.get('test-sync') === 'true'
  
  if (!isVisible && !isTestMode) return null

  return (
    <div className={`fixed bottom-4 right-4 z-[9999] ${className}`}>
      <Card className="w-80 shadow-lg border-0 bg-white">
        <CardContent className="p-4">
          {isTestMode && (
            <div className="space-y-3 mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-yellow-600" />
                  <span className="font-medium text-yellow-900">Test Mode</span>
                </div>
                <button
                  onClick={handleClose}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="text-sm text-yellow-700">
                <p>isSyncing: {isSyncing ? 'true' : 'false'}</p>
                <p>syncError: {syncError || 'null'}</p>
                <p>lastSyncResult: {lastSyncResult ? 'exists' : 'null'}</p>
                <p>isVisible: {isVisible ? 'true' : 'false'}</p>
              </div>
            </div>
          )}
          
          {isSyncing && (
            <div className="space-y-3">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                  <span className="font-medium text-gray-900">Syncing GMB Data</span>
                </div>
                <button
                  onClick={handleClose}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Progress Info */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">{currentProgress.currentStep}</span>
                  <span className="text-gray-900 font-medium">
                    Step {currentProgress.step} of {currentProgress.totalSteps}
                  </span>
                </div>
                
                {currentProgress.total > 0 && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span>
                      Processing {currentProgress.processed}/{currentProgress.total} locations
                    </span>
                    {currentProgress.found > 0 && (
                      <span>- {currentProgress.found} found</span>
                    )}
                  </div>
                )}

                {/* Progress Bar */}
                <Progress 
                  value={(currentProgress.step / currentProgress.totalSteps) * 100} 
                  className="h-2"
                />
              </div>

              {/* Stats */}
              {syncStats && (
                <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                  <div className="flex items-center gap-1 text-xs text-gray-600">
                    <MapPin className="h-3 w-3" />
                    <span>{syncStats.locations || 0} locations</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-600">
                    <Star className="h-3 w-3" />
                    <span>{syncStats.reviews || 0} reviews</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {syncError && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <span className="font-medium text-red-900">Sync Error</span>
                </div>
                <button
                  onClick={handleClose}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-red-700">{syncError}</p>
                {syncError.includes('Failed to start GMB sync') && (
                  <div className="text-xs text-red-600 bg-red-50 p-2 rounded border">
                    <p className="font-medium mb-1">Common solutions:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Check if you're connected to GMB</li>
                      <li>Verify your tokens haven't expired</li>
                      <li>Ensure proper API permissions</li>
                    </ul>
                  </div>
                )}
                {syncError.includes('No tokens') && (
                  <div className="text-xs text-red-600 bg-red-50 p-2 rounded border">
                    <p className="font-medium">Please reconnect to Google My Business</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {lastSyncResult && !isSyncing && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="font-medium text-green-900">Sync Complete</span>
                </div>
                <button
                  onClick={handleClose}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-1 text-gray-600">
                  <Database className="h-3 w-3" />
                  <span>{lastSyncResult.stores || 0} stores</span>
                </div>
                <div className="flex items-center gap-1 text-gray-600">
                  <Star className="h-3 w-3" />
                  <span>{lastSyncResult.reviews || 0} reviews</span>
                </div>
                <div className="flex items-center gap-1 text-gray-600">
                  <FileText className="h-3 w-3" />
                  <span>{lastSyncResult.posts || 0} posts</span>
                </div>
                <div className="flex items-center gap-1 text-gray-600">
                  <MapPin className="h-3 w-3" />
                  <span>{lastSyncResult.locations || 0} locations</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
