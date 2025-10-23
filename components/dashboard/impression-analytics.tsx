'use client'

import React, { useState, useEffect } from 'react'
import { DeviceInteractionChart } from './device-interaction-chart'
import { PlatformImpressionChart } from './platform-impression-chart'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

interface ImpressionAnalyticsProps {
  accountId: string
  locationId: string
}

interface ImpressionData {
  deviceInteraction: {
    desktop: number
    mobile: number
    total: number
  }
  platformImpressions: {
    maps: number
    search: number
    total: number
  }
  detailedBreakdown: {
    desktopSearch: number
    mobileSearch: number
    desktopMaps: number
    mobileMaps: number
  }
}

export function ImpressionAnalytics({ accountId, locationId }: ImpressionAnalyticsProps) {
  const [data, setData] = useState<ImpressionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      console.log('🔍 ImpressionAnalytics - Fetching data with:', { accountId, locationId })
      
      const response = await fetch(
        `/api/analytics/impressions?accountId=${accountId || 'all'}&locationId=${locationId || 'all'}`
      )
      
      if (!response.ok) {
        throw new Error('Failed to fetch impression data')
      }
      
      const result = await response.json()
      console.log('📊 ImpressionAnalytics - Received data:', result)
      setData(result)
    } catch (err) {
      console.error('Error fetching impression data:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [accountId, locationId])

  if (error) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Interaction By Devices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center text-red-500 py-8">
              Error loading device data: {error}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Maps vs Search Impressions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center text-red-500 py-8">
              Error loading platform data: {error}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Device Interaction Chart */}
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <DeviceInteractionChart
            data={data?.deviceInteraction || { desktop: 0, mobile: 0, total: 0 }}
            isLoading={loading}
          />
        </div>

        {/* Platform Impression Chart */}
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <PlatformImpressionChart
            data={data?.platformImpressions || { maps: 0, search: 0, total: 0 }}
            isLoading={loading}
          />
        </div>
      </div>

      {/* Detailed Breakdown */}
      {data && !loading && (
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Detailed Impression Breakdown</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-100">
              <div className="text-2xl font-bold text-blue-600">
                {data.detailedBreakdown.desktopSearch.toLocaleString()}
              </div>
              <div className="text-sm text-gray-600">Desktop Search</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg border border-green-100">
              <div className="text-2xl font-bold text-green-600">
                {data.detailedBreakdown.mobileSearch.toLocaleString()}
              </div>
              <div className="text-sm text-gray-600">Mobile Search</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-100">
              <div className="text-2xl font-bold text-purple-600">
                {data.detailedBreakdown.desktopMaps.toLocaleString()}
              </div>
              <div className="text-sm text-gray-600">Desktop Maps</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg border border-orange-100">
              <div className="text-2xl font-bold text-orange-600">
                {data.detailedBreakdown.mobileMaps.toLocaleString()}
              </div>
              <div className="text-sm text-gray-600">Mobile Maps</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
