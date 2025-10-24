'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MapPin, Search } from 'lucide-react'

interface PlatformImpressionData {
  maps: number
  search: number
  total: number
}

interface PlatformImpressionChartProps {
  data: PlatformImpressionData
  isLoading?: boolean
}

export function PlatformImpressionChart({ 
  data, 
  isLoading = false 
}: PlatformImpressionChartProps) {
  const { maps, search, total } = data
  
  const mapsPercentage = total > 0 ? (maps / total) * 100 : 0
  const searchPercentage = total > 0 ? (search / total) * 100 : 0

  // Calculate the stroke-dasharray for the donut chart
  const circumference = 2 * Math.PI * 45 // radius = 45
  const mapsStrokeDasharray = `${(mapsPercentage / 100) * circumference} ${circumference}`
  const searchStrokeDasharray = `${(searchPercentage / 100) * circumference} ${circumference}`

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Maps vs Search Impressions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="text-2xl font-bold text-gray-400">—</div>
            <div className="flex justify-center">
              <div className="w-24 h-24 bg-gray-200 rounded-full"></div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-gray-300 rounded-full"></div>
                <span className="text-sm text-gray-400">Loading...</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Maps vs Search Impressions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="text-2xl font-bold text-gray-900">
            {total.toLocaleString()}
          </div>
          
          {/* Donut Chart */}
          <div className="flex justify-center">
            <div className="relative w-24 h-24">
              <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
                {/* Background circle */}
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="8"
                />
                {/* Maps segment */}
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="#4285F4"
                  strokeWidth="8"
                  strokeDasharray={mapsStrokeDasharray}
                  strokeLinecap="round"
                  className="transition-all duration-500"
                />
                {/* Search segment */}
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="#9CA3AF"
                  strokeWidth="8"
                  strokeDasharray={searchStrokeDasharray}
                  strokeDashoffset={-(mapsPercentage / 100) * circumference}
                  strokeLinecap="round"
                  className="transition-all duration-500"
                />
              </svg>
            </div>
          </div>

          {/* Legend */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-primary rounded-full"></div>
              <span className="text-sm font-medium text-gray-700">
                Maps Impressions: {mapsPercentage.toFixed(2)}%
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
              <span className="text-sm font-medium text-gray-700">
                Search Impressions: {searchPercentage.toFixed(2)}%
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
