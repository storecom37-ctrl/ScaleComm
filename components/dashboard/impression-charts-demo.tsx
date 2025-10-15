'use client'

import React, { useState } from 'react'
import { DeviceInteractionChart } from './device-interaction-chart'
import { PlatformImpressionChart } from './platform-impression-chart'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

// Mock data similar to the image
const mockData = {
  deviceInteraction: {
    desktop: 168, // 24.60% of 683
    mobile: 515,  // 75.40% of 683
    total: 683
  },
  platformImpressions: {
    maps: 542,    // 79.36% of 683
    search: 141,  // 20.64% of 683
    total: 683
  }
}

export function ImpressionChartsDemo() {
  const [timeFilter, setTimeFilter] = useState('1M')

  const handleTimeFilterChange = (filter: string) => {
    setTimeFilter(filter)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Demo: Impression Analytics Charts</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 mb-4">
            This demo shows the impression analytics charts with sample data similar to your reference image.
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Device Interaction Chart */}
            <DeviceInteractionChart
              data={mockData.deviceInteraction}
              timeFilter={timeFilter}
              onTimeFilterChange={handleTimeFilterChange}
            />

            {/* Platform Impression Chart */}
            <PlatformImpressionChart
              data={mockData.platformImpressions}
              timeFilter={timeFilter}
              onTimeFilterChange={handleTimeFilterChange}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Chart Features</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Device Interaction Chart</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Horizontal bar chart showing desktop vs mobile</li>
                <li>• Percentage breakdown for each device type</li>
                <li>• Icons for visual clarity</li>
                <li>• Responsive design</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Platform Impression Chart</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Donut chart showing Maps vs Search</li>
                <li>• Color-coded legend</li>
                <li>• Percentage breakdown</li>
                <li>• Smooth animations</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
