"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  RefreshCw, 
  Database, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  TrendingUp,
  MapPin,
  Star,
  FileText
} from 'lucide-react'
import { useGmbSync } from '@/lib/hooks/use-gmb-sync'
import { useGmbData } from '@/lib/hooks/use-gmb-data'

interface GmbSyncButtonProps {
  onSyncComplete?: (result: any) => void
  className?: string
}

export default function GmbSyncButton({ onSyncComplete, className }: GmbSyncButtonProps) {
  const { isSyncing, syncError, syncStats, lastSyncResult, syncGmbData, getSyncStats, clearSyncError } = useGmbSync()
  const { isConnected, locations, reviews, account, refreshAll } = useGmbData()
  const [showStats, setShowStats] = useState(false)

  // Load sync stats on component mount
  useEffect(() => {
    getSyncStats().catch(console.error)
  }, [getSyncStats])

  const handleSync = async () => {
    if (!isConnected) {
      alert('Please connect to GMB first.')
      return
    }

    try {
      clearSyncError()
      
      // Get tokens first
      const tokensResponse = await fetch('/api/auth/gmb/tokens')
      
      if (!tokensResponse.ok) {
        throw new Error(`Failed to get tokens: ${tokensResponse.status}`)
      }
      
      const tokensData = await tokensResponse.json()
      
      if (!tokensData.tokens) {
        throw new Error('No GMB tokens found. Please connect to GMB first.')
      }

      console.log('🚀 Starting GMB sync with tokens:', {
        hasAccessToken: !!tokensData.tokens.access_token,
        hasRefreshToken: !!tokensData.tokens.refresh_token,
        tokenType: tokensData.tokens.token_type
      })

      const result = await syncGmbData(tokensData.tokens)
      
      // Refresh sync stats
      await getSyncStats()
      
      // Auto-refresh all data after successful sync
      console.log('🔄 Auto-refreshing data after sync completion...')
      await refreshAll()
      
      // Call completion callback
      onSyncComplete?.(result)
      
      setShowStats(true)
      
      // Hide stats after 5 seconds
      setTimeout(() => setShowStats(false), 5000)
      
    } catch (error: any) {
      console.error('Sync failed:', error)
      // The error will be handled by the useGmbSync hook and displayed in the UI
    }
  }

  const canSync = isConnected

  return (
    <div className={className}>

          <div className="flex items-center gap-4">
            <Button
              onClick={handleSync}
              disabled={!canSync || isSyncing}
              className="flex items-center gap-2"
            >
              {isSyncing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Sync to Database
                </>
              )}
            </Button>
            
            {!canSync && (
              <Badge variant="outline" className="text-yellow-600 border-yellow-200">
                <AlertCircle className="h-3 w-3 mr-1" />
                Connect GMB first
              </Badge>
            )}
          </div>

          {/* Error Display */}
          {syncError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-800 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                {syncError}
              </p>
            </div>
          )}
    </div>
  )
}

