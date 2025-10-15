'use client'

import React from 'react'
import { ImpressionAnalytics } from '@/components/dashboard/impression-analytics'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useSession } from 'next-auth/react'

export default function ImpressionsPage() {
  const { data: session } = useSession()

  // Get account and location IDs from session or props
  // These should be passed as props or retrieved from context
  const accountId = session?.user?.selectedAccountId || ''
  const locationId = session?.user?.selectedLocationId || ''

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Impression Analytics</h1>
          <p className="text-gray-600 mt-2">
            Analyze how your business appears across different devices and platforms
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              These charts show how your business impressions are distributed across:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-gray-600">
              <li><strong>Devices:</strong> Desktop vs Mobile interactions</li>
              <li><strong>Platforms:</strong> Google Search vs Google Maps appearances</li>
              <li><strong>Time Periods:</strong> 1M, 6M, 1Y, or All time</li>
            </ul>
          </CardContent>
        </Card>

        <ImpressionAnalytics 
          accountId={accountId} 
          locationId={locationId} 
        />
      </div>
    </div>
  )
}
