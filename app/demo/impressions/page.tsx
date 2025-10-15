'use client'

import React from 'react'
import { ImpressionChartsDemo } from '@/components/dashboard/impression-charts-demo'

export default function ImpressionsDemoPage() {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Impression Analytics Demo</h1>
        <p className="text-gray-600">
          Interactive charts showing device and platform impression breakdowns
        </p>
      </div>
      
      <ImpressionChartsDemo />
    </div>
  )
}
