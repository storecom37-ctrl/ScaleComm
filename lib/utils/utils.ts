export function sentimentColorByRating(rating: number): 'text-green-600' | 'text-yellow-600' | 'text-red-600' {
  if (rating >= 4) return 'text-green-600'
  if (rating >= 3) return 'text-yellow-600'
  return 'text-red-600'
}

export function sentimentBgByRating(rating: number): string {
  if (rating >= 4) return 'bg-green-100 text-green-800'
  if (rating >= 3) return 'bg-yellow-100 text-yellow-800'
  return 'bg-red-100 text-red-800'
}

export function sentimentLabelByRating(rating: number): 'positive' | 'neutral' | 'negative' {
  if (rating >= 4) return 'positive'
  if (rating >= 3) return 'neutral'
  return 'negative'
}

