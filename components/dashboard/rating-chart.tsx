'use client'

import React from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Star } from 'lucide-react'

interface ReviewSummary {
  total: number
  positive: number
  negative: number
  neutral: number
}

interface RatingChartProps {
  ratingDistribution: {
    1: number
    2: number
    3: number
    4: number
    5: number
  }
  totalReviews: number
  averageRating: number
  reviewsLast7Days: ReviewSummary
  reviewsLast30Days: ReviewSummary
}

export function RatingChart({ ratingDistribution, totalReviews, averageRating, reviewsLast7Days, reviewsLast30Days }: RatingChartProps) {
  const data = [
    {
      rating: '5',
      count: ratingDistribution[5],
      percentage: totalReviews > 0 ? ((ratingDistribution[5] / totalReviews) * 100).toFixed(1) : '0',
      fill: '#10B981', // Green for 5 stars (excellent)
      color: '#10B981'
    },
    {
      rating: '4',
      count: ratingDistribution[4],
      percentage: totalReviews > 0 ? ((ratingDistribution[4] / totalReviews) * 100).toFixed(1) : '0',
      fill: '#10B981', // Same green for 4 stars (good)
      color: '#10B981'
    },
    {
      rating: '3',
      count: ratingDistribution[3],
      percentage: totalReviews > 0 ? ((ratingDistribution[3] / totalReviews) * 100).toFixed(1) : '0',
      fill: '#FBBF24', // Yellow for 3 stars (neutral)
      color: '#FBBF24'
    },
    {
      rating: '2',
      count: ratingDistribution[2],
      percentage: totalReviews > 0 ? ((ratingDistribution[2] / totalReviews) * 100).toFixed(1) : '0',
      fill: '#EF4444', // Same red for 2 stars (poor)
      color: '#EF4444'
    },
    {
      rating: '1',
      count: ratingDistribution[1],
      percentage: totalReviews > 0 ? ((ratingDistribution[1] / totalReviews) * 100).toFixed(1) : '0',
      fill: '#EF4444', // Same red for 1 star (very poor)
      color: '#EF4444'
    }
  ]

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">{`${label} Star${label !== '1' ? 's' : ''}`}</p>
          <p className="text-sm text-gray-600">
            <span className="font-medium">{payload[0].value}</span> reviews ({payload[0].payload.percentage}%)
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="space-y-4">
      {/* Header with Average Rating */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Rating</h3>
          <div className="flex items-center space-x-3 mt-1">
            <span className={`text-4xl font-bold ${
              averageRating >= 4 ? 'text-green-600' : 
              averageRating >= 3 ? 'text-yellow-600' : 
              'text-red-600'
            }`}>{averageRating.toFixed(1)}</span>
            <div className="flex items-center">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`h-5 w-5 ${
                    star <= Math.floor(averageRating)
                      ? 'fill-yellow-500 text-yellow-500'
                      : star === Math.ceil(averageRating) && averageRating % 1 !== 0
                      ? 'fill-yellow-500 text-yellow-500'
                      : 'text-gray-300'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-full">
            Total Reviews {totalReviews.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Rating Distribution Chart */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-gray-700">Review Distribution</h4>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis 
                dataKey="rating" 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: '#6b7280' }}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: '#6b7280' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar 
                dataKey="count" 
                radius={[4, 4, 0, 0]}
                className="hover:opacity-80 transition-opacity"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Activity Summary */}
      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
        <div className="text-center p-3 bg-green-50 rounded-lg border border-green-100">
          <div className="text-sm text-green-600 font-medium">+{reviewsLast7Days.total} Reviews In Last 7 Days</div>
          <div className="text-xs text-green-500 mt-1">+{reviewsLast7Days.positive} Pos. +{reviewsLast7Days.negative} Neg.</div>
        </div>
        <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-100">
          <div className="text-sm text-blue-600 font-medium">+{reviewsLast30Days.total} Reviews In Last 30 Days</div>
          <div className="text-xs text-blue-500 mt-1">+{reviewsLast30Days.positive} Pos +{reviewsLast30Days.negative} Neg.</div>
        </div>
      </div>
    </div>
  )
}
