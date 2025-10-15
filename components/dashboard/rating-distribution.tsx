'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface RatingDistributionProps {
  totalReviews: number
  averageRating: number
  ratingDistribution: {
    5: number
    4: number
    3: number
    2: number
    1: number
  }
}

export function RatingDistribution({ totalReviews, averageRating, ratingDistribution }: RatingDistributionProps) {
  const getStarColor = (rating: number) => {
    if (rating >= 4) return 'text-yellow-400'
    if (rating >= 3) return 'text-yellow-300'
    if (rating >= 2) return 'text-orange-400'
    return 'text-red-400'
  }

  const getBarColor = (rating: number) => {
    if (rating >= 4) return 'bg-yellow-400'
    if (rating >= 3) return 'bg-yellow-300'
    if (rating >= 2) return 'bg-orange-400'
    return 'bg-red-400'
  }

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <span
        key={i}
        className={`text-lg ${i < rating ? getStarColor(rating) : 'text-gray-300'}`}
      >
        ★
      </span>
    ))
  }

  const getPercentage = (count: number) => {
    return totalReviews > 0 ? Math.round((count / totalReviews) * 100) : 0
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <span>Rating</span>
            <span className="text-sm text-muted-foreground">ℹ️</span>
          </CardTitle>
          <Badge variant="secondary" className="bg-primary text-primary-foreground">
            Total Reviews {totalReviews.toLocaleString()}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Rating */}
        <div className="text-center">
          <div className="text-4xl font-bold mb-2">{averageRating.toFixed(1)}</div>
          <div className="flex justify-center mb-2">
            {renderStars(Math.round(averageRating))}
          </div>
        </div>

        {/* Rating Distribution */}
        <div className="space-y-3">
          <h3 className="font-semibold text-sm underline">Review</h3>
          {[5, 4, 3, 2, 1].map((rating) => {
            const count = ratingDistribution[rating as keyof typeof ratingDistribution]
            const percentage = getPercentage(count)
            
            return (
              <div key={rating} className="flex items-center gap-3">
                <div className="flex items-center gap-1 w-16">
                  <span className="text-sm font-medium">{rating}</span>
                  <span className="text-sm text-yellow-400">★</span>
                </div>
                <div className="flex-1 bg-gray-100 rounded-full h-2 relative">
                  <div
                    className={`h-2 rounded-full ${getBarColor(rating)}`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <div className="text-sm font-medium w-12 text-right">
                  {percentage}%
                </div>
              </div>
            )
          })}
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
          <div className="text-center">
            <div className="text-2xl font-bold text-positive">+2</div>
            <div className="text-xs text-muted-foreground">Reviews In Last 7 Days</div>
            <div className="flex justify-center gap-2 mt-1">
              <span className="text-xs text-positive">+1 Pos.</span>
              <span className="text-xs text-negative">+1 Neg.</span>
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-positive">+37</div>
            <div className="text-xs text-muted-foreground">Reviews In Last 30 Days</div>
            <div className="flex justify-center gap-2 mt-1">
              <span className="text-xs text-positive">+34 Pos</span>
              <span className="text-xs text-negative">+1 Neg</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
