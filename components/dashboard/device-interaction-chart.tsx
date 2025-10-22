'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Monitor, Smartphone } from 'lucide-react'

interface DeviceInteractionData {
  desktop: number
  mobile: number
  total: number
}

interface DeviceInteractionChartProps {
  data: DeviceInteractionData
  timeFilter: string
  onTimeFilterChange: (filter: string) => void
  isLoading?: boolean
}

const timeFilters = ['1M', '6M', '1Y', 'All time']

export function DeviceInteractionChart({ 
  data, 
  timeFilter, 
  onTimeFilterChange, 
  isLoading = false 
}: DeviceInteractionChartProps) {
  const { desktop, mobile, total } = data
  
  const desktopPercentage = total > 0 ? (desktop / total) * 100 : 0
  const mobilePercentage = total > 0 ? (mobile / total) * 100 : 0

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Interaction By Devices</CardTitle>
          <div className="flex space-x-4">
            {timeFilters.map((filter) => (
              <button
                key={filter}
                className="text-sm text-gray-500 hover:text-gray-700"
                disabled
              >
                {filter}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="text-2xl font-bold text-gray-400">—</div>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-gray-300 rounded"></div>
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
        <CardTitle className="text-lg font-semibold">Interaction By Devices</CardTitle>
        <div className="flex space-x-4">
          {timeFilters.map((filter) => (
            <button
              key={filter}
              onClick={() => onTimeFilterChange(filter)}
              className={`text-sm transition-colors ${
                timeFilter === filter
                  ? 'text-primary font-medium border-b-2 border-primary'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="text-2xl font-bold text-gray-900">
            {total.toLocaleString()}
          </div>
          
          <div className="space-y-3">
            {/* Desktop Bar */}
            <div className="flex items-center space-x-3">
              <Monitor className="w-4 h-4 text-gray-600" />
              <div className="flex-1">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium text-gray-700">Desktop</span>
                  <span className="text-sm font-medium text-gray-900">
                    {desktopPercentage.toFixed(2)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${desktopPercentage}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Mobile Bar */}
            <div className="flex items-center space-x-3">
              <Smartphone className="w-4 h-4 text-gray-600" />
              <div className="flex-1">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium text-gray-700">Mobile</span>
                  <span className="text-sm font-medium text-gray-900">
                    {mobilePercentage.toFixed(2)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${mobilePercentage}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
