/**
 * Local Business Visibility Scoring Framework (100-point scale)
 * 
 * This framework evaluates local business performance across four key areas:
 * 1. Rating & Reviews Component (30% weight)
 * 2. Performance Engagement Component (40% weight) 
 * 3. Profile Completeness & Activity Component (20% weight)
 * 4. Competitive Context Component (10% weight)
 */

export interface ScoringMetrics {
  // Reviews & Rating
  averageRating: number
  totalReviews: number
  recentReviews: number // Reviews in last 30 days
  responseRate: number // Percentage of reviews with owner responses
  
  // Performance Engagement
  impressions: number
  callClicks: number
  websiteClicks: number
  bookings?: number
  
  // Profile Activity
  profilePhotos: number
  recentPosts: number // Posts in last 30 days
  profileCompleteness: number // 0-100% based on filled fields
  qaActivity: number // Questions answered
  
  // Competitive Context (optional - for future enhancement)
  marketPosition?: number
  consistency?: number
  trendDirection?: number
}

export interface ScoringBreakdown {
  reviewsScore: number
  performanceScore: number
  profileScore: number
  competitiveScore: number
  totalScore: number
}

export interface ScoringDetails {
  breakdown: ScoringBreakdown
  grade: 'A+' | 'A' | 'B+' | 'B' | 'C+' | 'C' | 'D+' | 'D' | 'F'
  interpretation: string
  recommendations: string[]
  keyRatios: {
    callRate: number
    websiteRate: number
    responseRate: number
    recentReviewRate: number
  }
}

/**
 * Calculate Rating & Reviews Component Score (30% weight)
 */
function calculateReviewsScore(metrics: ScoringMetrics): number {
  // Average Rating (40% of this section)
  const ratingScore = (metrics.averageRating / 5) * 100
  
  // Review Volume (25% of this section) - Logarithmic scale
  let volumeScore: number
  if (metrics.totalReviews <= 10) {
    volumeScore = 20
  } else if (metrics.totalReviews <= 50) {
    volumeScore = 20 + ((metrics.totalReviews - 10) / 40) * 40 // 20-60 points
  } else if (metrics.totalReviews <= 100) {
    volumeScore = 60 + ((metrics.totalReviews - 50) / 50) * 20 // 60-80 points
  } else {
    volumeScore = 80 + Math.min((metrics.totalReviews - 100) / 100, 1) * 20 // 80-100 points
  }
  
  // Review Recency (20% of this section)
  let recencyScore: number
  if (metrics.recentReviews === 0) {
    recencyScore = 0
  } else if (metrics.recentReviews <= 3) {
    recencyScore = 50
  } else {
    recencyScore = 100
  }
  
  // Response Rate (15% of this section)
  const responseScore = Math.min(metrics.responseRate, 100)
  
  // Weighted calculation
  const totalScore = (ratingScore * 0.40) + (volumeScore * 0.25) + (recencyScore * 0.20) + (responseScore * 0.15)
  
  return Math.round(totalScore)
}

/**
 * Calculate Performance Engagement Component Score (40% weight)
 */
function calculatePerformanceScore(metrics: ScoringMetrics): number {
  if (metrics.impressions === 0) return 0
  
  // Calculate conversion rates
  const callRate = (metrics.callClicks / metrics.impressions) * 100
  const websiteRate = (metrics.websiteClicks / metrics.impressions) * 100
  
  
  // Call Clicks (25% of this section)
  const callScore = Math.min(callRate * 50, 100) // 2%+ = 100 points
  
  // Website Clicks (15% of this section)
  const websiteScore = Math.min(websiteRate * 33.33, 100) // 3%+ = 100 points
  
  // Impressions (20% of this section) - Normalized based on industry benchmarks
  // Using a logarithmic scale for impressions
  let impressionsScore: number
  if (metrics.impressions < 100) {
    impressionsScore = metrics.impressions // 0-99 points
  } else if (metrics.impressions < 1000) {
    impressionsScore = 100 + ((metrics.impressions - 100) / 900) * 50 // 100-150 points
  } else {
    impressionsScore = Math.min(150 + Math.log10(metrics.impressions / 1000) * 50, 200) // Cap at 200
  }
  const normalizedImpressionsScore = Math.min((impressionsScore / 200) * 100, 100)
  
  // Bookings (15% of this section) - if available
  const bookingsScore = metrics.bookings ? Math.min(metrics.bookings * 10, 100) : 0
  
  // Weighted calculation
  const totalScore = (normalizedImpressionsScore * 0.25) + 
                    (callScore * 0.35) + 
                    (websiteScore * 0.25) + 
                    (bookingsScore * 0.15)
  
  return Math.round(totalScore)
}

/**
 * Calculate Profile Completeness & Activity Component Score (20% weight)
 */
function calculateProfileScore(metrics: ScoringMetrics): number {
  // Profile Photos (25% of this section)
  const photoScore = Math.min(metrics.profilePhotos * 10, 100)
  
  // Recent Posts (25% of this section)
  const postsScore = Math.min(metrics.recentPosts * 25, 100)
  
  // Profile Completeness (35% of this section)
  const completenessScore = metrics.profileCompleteness
  
  // Q&A Activity (15% of this section)
  const qaScore = Math.min(metrics.qaActivity * 20, 100)
  
  // Weighted calculation
  const totalScore = (photoScore * 0.25) + (postsScore * 0.25) + (completenessScore * 0.35) + (qaScore * 0.15)
  
  return Math.round(totalScore)
}

/**
 * Calculate Competitive Context Component Score (10% weight)
 */
function calculateCompetitiveScore(metrics: ScoringMetrics): number {
  // For now, use default values since competitive data isn't available
  // This can be enhanced with actual competitor analysis later
  const marketPosition = metrics.marketPosition || 75 // Default to 75%
  const consistency = metrics.consistency || 70 // Default to 70%
  const trendDirection = metrics.trendDirection || 80 // Default to 80%
  
  const totalScore = (marketPosition * 0.40) + (consistency * 0.30) + (trendDirection * 0.30)
  
  return Math.round(totalScore)
}

/**
 * Calculate letter grade based on total score
 */
function calculateGrade(score: number): 'A+' | 'A' | 'B+' | 'B' | 'C+' | 'C' | 'D+' | 'D' | 'F' {
  if (score >= 95) return 'A+'
  if (score >= 90) return 'A'
  if (score >= 85) return 'B+'
  if (score >= 80) return 'B'
  if (score >= 75) return 'C+'
  if (score >= 70) return 'C'
  if (score >= 65) return 'D+'
  if (score >= 60) return 'D'
  return 'F'
}

/**
 * Generate interpretation and recommendations
 */
function generateInterpretationAndRecommendations(score: number, breakdown: ScoringBreakdown, keyRatios: any): {
  interpretation: string
  recommendations: string[]
} {
  let interpretation: string
  let recommendations: string[] = []
  
  if (score >= 90) {
    interpretation = "Excellent local visibility - your business is performing exceptionally well in local search and customer engagement."
    recommendations = [
      "Maintain current engagement strategies",
      "Continue responding to all reviews promptly",
      "Keep posting regular content to maintain momentum"
    ]
  } else if (score >= 80) {
    interpretation = "Very good visibility - strong performance with some areas for optimization."
    recommendations = [
      "Focus on increasing review response rate",
      "Boost recent posting frequency",
      "Optimize profile completeness if below 90%"
    ]
  } else if (score >= 70) {
    interpretation = "Good visibility with room for improvement - several optimization opportunities available."
    recommendations = [
      "Increase review volume through customer outreach",
      "Improve conversion rates from impressions to actions",
      "Enhance profile activity and completeness",
      "Develop a consistent posting schedule"
    ]
  } else if (score >= 60) {
    interpretation = "Average visibility - needs attention to improve local search performance."
    recommendations = [
      "Prioritize customer review acquisition",
      "Improve response rates to existing reviews",
      "Increase posting frequency significantly",
      "Complete all profile information",
      "Focus on high-intent action optimization"
    ]
  } else {
    interpretation = "Poor visibility - requires immediate action to improve local search presence."
    recommendations = [
      "Launch aggressive review acquisition campaign",
      "Respond to all reviews within 24 hours",
      "Post content at least 3 times per week",
      "Complete 100% of profile information",
      "Optimize for local keywords and categories",
      "Consider professional local SEO consultation"
    ]
  }
  
  // Add specific recommendations based on lowest scoring component
  const lowestComponent = Object.entries(breakdown)
    .filter(([key]) => key !== 'totalScore')
    .reduce((min, [key, value]) => 
      value < breakdown[min as keyof ScoringBreakdown] ? key as keyof ScoringBreakdown : min, 
      'reviewsScore' as keyof ScoringBreakdown
    )
  
  if (lowestComponent === 'reviewsScore') {
    recommendations.push("Priority: Focus on review acquisition and management")
  } else if (lowestComponent === 'performanceScore') {
    recommendations.push("Priority: Optimize conversion rates and engagement metrics")
  } else if (lowestComponent === 'profileScore') {
    recommendations.push("Priority: Enhance profile completeness and activity")
  } else if (lowestComponent === 'competitiveScore') {
    recommendations.push("Priority: Analyze competitor strategies and market positioning")
  }
  
  return { interpretation, recommendations }
}

/**
 * Main scoring function that calculates the complete visibility score
 */
export function calculateVisibilityScore(metrics: ScoringMetrics): ScoringDetails {
  // Calculate individual component scores
  const reviewsScore = calculateReviewsScore(metrics)
  const performanceScore = calculatePerformanceScore(metrics)
  const profileScore = calculateProfileScore(metrics)
  const competitiveScore = calculateCompetitiveScore(metrics)
  
  // Calculate total weighted score
  const totalScore = Math.round(
    (reviewsScore * 0.30) + 
    (performanceScore * 0.40) + 
    (profileScore * 0.20) + 
    (competitiveScore * 0.10)
  )
  
  const breakdown: ScoringBreakdown = {
    reviewsScore,
    performanceScore,
    profileScore,
    competitiveScore,
    totalScore
  }
  
  // Calculate key ratios
  const keyRatios = {
    callRate: metrics.impressions > 0 ? (metrics.callClicks / metrics.impressions) * 100 : 0,
    websiteRate: metrics.impressions > 0 ? (metrics.websiteClicks / metrics.impressions) * 100 : 0,
    responseRate: metrics.responseRate,
    recentReviewRate: metrics.totalReviews > 0 ? (metrics.recentReviews / metrics.totalReviews) * 100 : 0
  }
  
  const grade = calculateGrade(totalScore)
  const { interpretation, recommendations } = generateInterpretationAndRecommendations(totalScore, breakdown, keyRatios)
  
  return {
    breakdown,
    grade,
    interpretation,
    recommendations,
    keyRatios
  }
}

/**
 * Helper function to extract metrics from GMB data
 */
export function extractMetricsFromGmbData(
  locations: any[],
  reviews: any[],
  posts: any[],
  insights: Record<string, any>
): ScoringMetrics {
  // Calculate aggregate metrics across all locations
  const totalReviews = reviews.length
  const averageRating = totalReviews > 0 
    ? reviews.reduce((sum, review) => sum + review.starRating, 0) / totalReviews 
    : 0
  
  // Recent reviews (last 30 days)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const recentReviews = reviews.filter(review => 
    new Date(review.createTime) >= thirtyDaysAgo
  ).length
  
  // Response rate (assuming we have this data - you may need to adjust based on actual data structure)
  const reviewsWithResponses = reviews.filter(review => review.reply).length
  const responseRate = totalReviews > 0 ? (reviewsWithResponses / totalReviews) * 100 : 0
  
  // Aggregate insights across all locations
  const totalInsights = Object.values(insights).reduce((acc: any, insight: any) => ({
    impressions: (acc.impressions || 0) + (insight.views || 0),
    callClicks: (acc.callClicks || 0) + (insight.callClicks || 0),
    websiteClicks: (acc.websiteClicks || 0) + (insight.websiteClicks || 0),
  }), {})
  
  // Recent posts (last 30 days)
  const recentPosts = posts.filter(post => 
    new Date(post.createTime) >= thirtyDaysAgo
  ).length
  
  // Profile completeness estimation (you may need to adjust based on actual data)
  const profileCompleteness = calculateProfileCompleteness(locations)
  
  return {
    averageRating,
    totalReviews,
    recentReviews,
    responseRate,
    impressions: totalInsights.impressions,
    callClicks: totalInsights.callClicks,
    websiteClicks: totalInsights.websiteClicks,
    profilePhotos: locations.length * 3, // Estimate based on locations
    recentPosts,
    profileCompleteness,
    qaActivity: 0 // Not available in current data structure
  }
}

/**
 * Calculate profile completeness based on location data
 */
function calculateProfileCompleteness(locations: any[]): number {
  if (locations.length === 0) return 0
  
  let totalCompleteness = 0
  locations.forEach(location => {
    let locationScore = 0
    if (location.name) locationScore += 20
    if (location.address) locationScore += 20
    if (location.phoneNumber) locationScore += 20
    if (location.websiteUrl) locationScore += 20
    if (location.categories && location.categories.length > 0) locationScore += 20
    
    totalCompleteness += locationScore
  })
  
  return totalCompleteness / locations.length
}
