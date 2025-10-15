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

const timeFilterMap = {
  '1M': 30,
  '6M': 180,
  '1Y': 365,
  'All time': 3650 // 10 years
}

export function ImpressionAnalytics({ accountId, locationId }: ImpressionAnalyticsProps) {
  const [data, setData] = useState<ImpressionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeFilter, setTimeFilter] = useState('1M')

  const fetchData = async (filter: string) => {
    try {
      setLoading(true)
      setError(null)
      
      const days = timeFilterMap[filter as keyof typeof timeFilterMap]
      const response = await fetch(
        `/api/analytics/impressions?accountId=${accountId}&locationId=${locationId}&days=${days}`
      )
      
      if (!response.ok) {
        throw new Error('Failed to fetch impression data')
      }
      
      const result = await response.json()
      setData(result)
    } catch (err) {
      console.error('Error fetching impression data:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (accountId && locationId) {
      fetchData(timeFilter)
    }
  }, [accountId, locationId, timeFilter])

  const handleTimeFilterChange = (filter: string) => {
    setTimeFilter(filter)
  }

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
        <DeviceInteractionChart
          data={data?.deviceInteraction || { desktop: 0, mobile: 0, total: 0 }}
          timeFilter={timeFilter}
          onTimeFilterChange={handleTimeFilterChange}
          isLoading={loading}
        />

        {/* Platform Impression Chart */}
        <PlatformImpressionChart
          data={data?.platformImpressions || { maps: 0, search: 0, total: 0 }}
          timeFilter={timeFilter}
          onTimeFilterChange={handleTimeFilterChange}
          isLoading={loading}
        />
      </div>

      {/* Detailed Breakdown */}
      {data && !loading && (
        <Card>
          <CardHeader>
            <CardTitle>Detailed Impression Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {data.detailedBreakdown.desktopSearch.toLocaleString()}
                </div>
                <div className="text-sm text-gray-600">Desktop Search</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {data.detailedBreakdown.mobileSearch.toLocaleString()}
                </div>
                <div className="text-sm text-gray-600">Mobile Search</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {data.detailedBreakdown.desktopMaps.toLocaleString()}
                </div>
                <div className="text-sm text-gray-600">Desktop Maps</div>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">
                  {data.detailedBreakdown.mobileMaps.toLocaleString()}
                </div>
                <div className="text-sm text-gray-600">Mobile Maps</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
