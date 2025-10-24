'use client'

import React from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

interface SentimentChartProps {
  monthlySentiment: Array<{
    month: string
    positive: number
    negative: number
    neutral: number
    total: number
  }>
}

export function SentimentChart({ monthlySentiment }: SentimentChartProps) {
  // Calculate dynamic max value from data
  const maxTotal = Math.max(...monthlySentiment.map(item => item.total))
  const maxValue = Math.max(...monthlySentiment.map(item => Math.max(item.positive, item.negative, item.neutral)))
  const yAxisMax = Math.ceil(Math.max(maxTotal, maxValue) / 10) * 10
  const tickInterval = yAxisMax <= 50 ? 5 : 10
  const tickCount = Math.floor(yAxisMax / tickInterval) + 1

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 mb-2">{label}</p>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-600">Positive</span>
              </div>
              <span className="font-medium text-green-600">{data.positive}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span className="text-sm text-gray-600">Negative</span>
              </div>
              <span className="font-medium text-red-600">{data.negative}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                <span className="text-sm text-gray-600">Neutral</span>
              </div>
              <span className="font-medium text-gray-600">{data.neutral}</span>
            </div>
            <div className="pt-2 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Total</span>
                <span className="font-medium text-gray-900">{data.total}</span>
              </div>
            </div>
          </div>
        </div>
      )
    }
    return null
  }

  const CustomLegend = ({ payload }: any) => {
    return (
      <div className="flex justify-center space-x-6 mt-4">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
          <span className="text-sm text-gray-600">Negative</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          <span className="text-sm text-gray-600">Positive</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Monthly Sentiment Analysis</h3>
        <p className="text-sm text-gray-600 mt-1">Track sentiment trends over time</p>
      </div>

      {/* Line Chart */}
      <div className="h-80 md:h-96 lg:h-[500px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={monthlySentiment} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis 
              dataKey="month" 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: '#6b7280' }}
              interval={0}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#6b7280' }}
              domain={[0, yAxisMax]}
              ticks={Array.from({ length: tickCount }, (_, i) => i * tickInterval)}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend content={<CustomLegend />} />
            <Line
              type="monotone"
              dataKey="negative"
              stroke="#ef4444"
              strokeWidth={2}
              dot={{ fill: '#ef4444', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: '#ef4444', strokeWidth: 2 }}
            />
            <Line
              type="monotone"
              dataKey="positive"
              stroke="#10b981"
              strokeWidth={2}
              dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: '#10b981', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
