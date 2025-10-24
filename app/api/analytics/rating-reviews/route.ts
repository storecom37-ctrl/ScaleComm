import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/database/connection'
import { Store, Review } from '@/lib/database/models'
import { getGmbTokensFromRequest, getAllBrandAccountIds } from '@/lib/utils/auth-helpers'

export async function GET(request: NextRequest) {
  try {
    await connectDB()

    const { searchParams } = new URL(request.url)
    const brandId = searchParams.get('brandId')
    const storeId = searchParams.get('storeId')

    // Get accessible accounts for filtering
    const tokens = await getGmbTokensFromRequest()
    let accessibleAccountIds: string[] = []
    
    if (tokens) {
      accessibleAccountIds = await getAllBrandAccountIds()
    }

    // Build query
    const matchQuery: any = { status: 'active' }
    
    if (brandId && brandId !== 'all') {
      matchQuery.brandId = brandId
    }
    
    if (storeId && storeId !== 'all') {
      matchQuery.storeId = storeId
    }

    // If we have accessible accounts, filter by them
    if (accessibleAccountIds.length > 0) {
      matchQuery.accountId = { $in: accessibleAccountIds }
    }

    console.log('🔍 Rating Reviews API - Querying database with match:', matchQuery)

    // Get total reviews and average rating with optimized aggregation
    const ratingStats = await Review.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          totalReviews: { $sum: 1 },
          averageRating: { $avg: '$starRating' }
        }
      }
    ])

    // Get rating distribution separately for better performance
    const ratingDistribution = await Review.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$starRating',
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id': -1 } }
    ])

    const distribution: { [key: number]: number } = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    ratingDistribution.forEach(item => {
      distribution[item._id] = item.count
    })

    // Get monthly sentiment data (last 12 months) - using same logic as existing monthly sentiment API
    const endDate = new Date()
    const startDate = new Date(endDate)
    startDate.setMonth(startDate.getMonth() - 11)
    startDate.setHours(0, 0, 0, 0)

    const monthlyMatchStage = {
      ...matchQuery,
      comment: { $exists: true, $nin: [null, ''] },
      gmbCreateTime: { $gte: startDate, $lte: endDate }
    }

    console.log('🔍 Rating Reviews API - Processing monthly sentiment for date range:', { startDate, endDate })

    const monthlySentiment = await Review.aggregate([
      { $match: monthlyMatchStage },
      { $limit: 10000 }, // Limit to improve performance
      {
        $addFields: {
          sentiment: {
            $switch: {
              branches: [
                {
                  case: {
                    $or: [
                      { $gte: ['$starRating', 4] },
                      {
                        $and: [
                          { $gte: ['$starRating', 3] },
                          {
                            $regexMatch: {
                              input: { $toLower: '$comment' },
                              regex: /good|great|excellent|amazing|wonderful|fantastic|love|best|perfect|awesome|outstanding|brilliant|superb|delicious|tasty|nice|friendly|helpful|professional|clean|fast|quick|amazing|incredible|wonderful|satisfied|happy|pleased|recommend|excellent|top|quality|fresh/
                            }
                          }
                        ]
                      }
                    ]
                  },
                  then: 'positive'
                },
                {
                  case: {
                    $or: [
                      { $lte: ['$starRating', 2] },
                      {
                        $and: [
                          { $lte: ['$starRating', 3] },
                          {
                            $regexMatch: {
                              input: { $toLower: '$comment' },
                              regex: /bad|terrible|awful|horrible|worst|hate|disgusting|poor|slow|rude|unfriendly|disappointed|waste|overpriced|cold|dirty|unclean|unprofessional|rude|slow|late|wrong|broken|damaged|disappointed|frustrated|angry|upset|annoyed|terrible|awful/
                            }
                          }
                        ]
                      }
                    ]
                  },
                  then: 'negative'
                }
              ],
              default: 'neutral'
            }
          }
        }
      },
      {
        $group: {
          _id: {
            y: { $year: '$gmbCreateTime' },
            m: { $month: '$gmbCreateTime' }
          },
          positive: { $sum: { $cond: [{ $eq: ['$sentiment', 'positive'] }, 1, 0] } },
          negative: { $sum: { $cond: [{ $eq: ['$sentiment', 'negative'] }, 1, 0] } },
          neutral: { $sum: { $cond: [{ $eq: ['$sentiment', 'neutral'] }, 1, 0] } },
          total: { $sum: 1 }
        }
      },
      { $sort: { '_id.y': 1, '_id.m': 1 } }
    ])

    // Process monthly sentiment - ensure we have 12 months of data
    const processedMonthlySentiment: Array<{
      month: string
      positive: number
      negative: number
      neutral: number
      total: number
    }> = []
    const cursor = new Date(startDate)

    for (let i = 0; i < 12; i++) {
      const y = cursor.getFullYear()
      const m = cursor.getMonth() + 1
      const monthLabel = cursor.toLocaleString('default', { month: 'short' })
      const found = monthlySentiment.find((r: any) => r._id.y === y && r._id.m === m)
      processedMonthlySentiment.push({
        month: monthLabel,
        positive: found?.positive || 0,
        negative: found?.negative || 0,
        neutral: found?.neutral || 0,
        total: found?.total || 0
      })
      cursor.setMonth(cursor.getMonth() + 1)
    }


    // Get reviews for last 7 days
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    sevenDaysAgo.setHours(0, 0, 0, 0)

    const reviewsLast7Days = await Review.aggregate([
      { $match: { ...matchQuery, gmbCreateTime: { $gte: sevenDaysAgo } } },
      {
        $addFields: {
          sentiment: {
            $switch: {
              branches: [
                {
                  case: {
                    $or: [
                      { $gte: ['$starRating', 4] },
                      {
                        $and: [
                          { $gte: ['$starRating', 3] },
                          {
                            $regexMatch: {
                              input: { $toLower: '$comment' },
                              regex: /good|great|excellent|amazing|wonderful|fantastic|love|best|perfect|awesome|outstanding|brilliant|superb|delicious|tasty|nice|friendly|helpful|professional|clean|fast|quick|amazing|incredible|wonderful|satisfied|happy|pleased|recommend|excellent|top|quality|fresh/
                            }
                          }
                        ]
                      }
                    ]
                  },
                  then: 'positive'
                },
                {
                  case: {
                    $or: [
                      { $lte: ['$starRating', 2] },
                      {
                        $and: [
                          { $lte: ['$starRating', 3] },
                          {
                            $regexMatch: {
                              input: { $toLower: '$comment' },
                              regex: /bad|terrible|awful|horrible|worst|hate|disgusting|poor|slow|rude|unfriendly|disappointed|waste|overpriced|cold|dirty|unclean|unprofessional|rude|slow|late|wrong|broken|damaged|disappointed|frustrated|angry|upset|annoyed|terrible|awful/
                            }
                          }
                        ]
                      }
                    ]
                  },
                  then: 'negative'
                }
              ],
              default: 'neutral'
            }
          }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          positive: { $sum: { $cond: [{ $eq: ['$sentiment', 'positive'] }, 1, 0] } },
          negative: { $sum: { $cond: [{ $eq: ['$sentiment', 'negative'] }, 1, 0] } },
          neutral: { $sum: { $cond: [{ $eq: ['$sentiment', 'neutral'] }, 1, 0] } }
        }
      }
    ])

    // Get reviews for last 30 days
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    thirtyDaysAgo.setHours(0, 0, 0, 0)

    const reviewsLast30Days = await Review.aggregate([
      { $match: { ...matchQuery, gmbCreateTime: { $gte: thirtyDaysAgo } } },
      {
        $addFields: {
          sentiment: {
            $switch: {
              branches: [
                {
                  case: {
                    $or: [
                      { $gte: ['$starRating', 4] },
                      {
                        $and: [
                          { $gte: ['$starRating', 3] },
                          {
                            $regexMatch: {
                              input: { $toLower: '$comment' },
                              regex: /good|great|excellent|amazing|wonderful|fantastic|love|best|perfect|awesome|outstanding|brilliant|superb|delicious|tasty|nice|friendly|helpful|professional|clean|fast|quick|amazing|incredible|wonderful|satisfied|happy|pleased|recommend|excellent|top|quality|fresh/
                            }
                          }
                        ]
                      }
                    ]
                  },
                  then: 'positive'
                },
                {
                  case: {
                    $or: [
                      { $lte: ['$starRating', 2] },
                      {
                        $and: [
                          { $lte: ['$starRating', 3] },
                          {
                            $regexMatch: {
                              input: { $toLower: '$comment' },
                              regex: /bad|terrible|awful|horrible|worst|hate|disgusting|poor|slow|rude|unfriendly|disappointed|waste|overpriced|cold|dirty|unclean|unprofessional|rude|slow|late|wrong|broken|damaged|disappointed|frustrated|angry|upset|annoyed|terrible|awful/
                            }
                          }
                        ]
                      }
                    ]
                  },
                  then: 'negative'
                }
              ],
              default: 'neutral'
            }
          }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          positive: { $sum: { $cond: [{ $eq: ['$sentiment', 'positive'] }, 1, 0] } },
          negative: { $sum: { $cond: [{ $eq: ['$sentiment', 'negative'] }, 1, 0] } },
          neutral: { $sum: { $cond: [{ $eq: ['$sentiment', 'neutral'] }, 1, 0] } }
        }
      }
    ])

    const result = {
      totalReviews: ratingStats.length > 0 ? ratingStats[0].totalReviews : 0,
      averageRating: ratingStats.length > 0 ? ratingStats[0].averageRating : 0,
      ratingDistribution: distribution,
      monthlySentiment: processedMonthlySentiment,
      reviewsLast7Days: reviewsLast7Days.length > 0 ? {
        total: reviewsLast7Days[0].total,
        positive: reviewsLast7Days[0].positive,
        negative: reviewsLast7Days[0].negative,
        neutral: reviewsLast7Days[0].neutral
      } : { total: 0, positive: 0, negative: 0, neutral: 0 },
      reviewsLast30Days: reviewsLast30Days.length > 0 ? {
        total: reviewsLast30Days[0].total,
        positive: reviewsLast30Days[0].positive,
        negative: reviewsLast30Days[0].negative,
        neutral: reviewsLast30Days[0].neutral
      } : { total: 0, positive: 0, negative: 0, neutral: 0 }
    }


    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
        'Content-Type': 'application/json'
      }
    })

  } catch (error) {
    console.error('❌ Rating Reviews API Error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch rating and reviews data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Simple sentiment analysis function
function analyzeSentiment(comment: string, starRating: number): 'positive' | 'negative' | 'neutral' {
  if (!comment) {
    // If no comment, use star rating
    if (starRating >= 4) return 'positive'
    if (starRating <= 2) return 'negative'
    return 'neutral'
  }
  
  const positiveWords = [
    'good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'love', 'best', 'perfect', 
    'awesome', 'outstanding', 'brilliant', 'superb', 'delicious', 'tasty', 'nice', 'friendly', 
    'helpful', 'professional', 'clean', 'fast', 'quick', 'amazing', 'incredible', 'wonderful',
    'satisfied', 'happy', 'pleased', 'recommend', 'excellent', 'top', 'quality', 'fresh'
  ]
  
  const negativeWords = [
    'bad', 'terrible', 'awful', 'horrible', 'worst', 'hate', 'disgusting', 'poor', 'slow', 
    'rude', 'unfriendly', 'disappointed', 'waste', 'overpriced', 'cold', 'dirty', 'stale',
    'unclean', 'unprofessional', 'rude', 'slow', 'late', 'wrong', 'broken', 'damaged',
    'disappointed', 'frustrated', 'angry', 'upset', 'annoyed', 'terrible', 'awful'
  ]
  
  const lowerComment = comment.toLowerCase()
  const positiveCount = positiveWords.filter(word => lowerComment.includes(word)).length
  const negativeCount = negativeWords.filter(word => lowerComment.includes(word)).length
  
  // Also consider star rating
  const ratingWeight = starRating >= 4 ? 1 : starRating <= 2 ? -1 : 0
  
  const totalScore = positiveCount - negativeCount + ratingWeight
  
  if (totalScore > 0) return 'positive'
  if (totalScore < 0) return 'negative'
  return 'neutral'
}
