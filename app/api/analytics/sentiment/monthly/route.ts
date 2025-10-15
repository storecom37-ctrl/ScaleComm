import { NextRequest, NextResponse } from 'next/server'
import connectToDatabase from '@/lib/database/connection'
import { Review } from '@/lib/database/separate-models'
import mongoose from 'mongoose'

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase()

    const { searchParams } = new URL(request.url)
    const brandId = searchParams.get('brandId')
    const storeId = searchParams.get('storeId')
    const entityType = brandId ? 'brand' : storeId ? 'store' : null

    if (!entityType) {
      return NextResponse.json({ success: false, error: 'Either brandId or storeId is required' }, { status: 400 })
    }

    const entityId = new mongoose.Types.ObjectId(brandId || storeId!)

    // Last 12 full months including current month
    const endDate = new Date()
    const startDate = new Date(endDate)
    startDate.setMonth(startDate.getMonth() - 11)
    startDate.setHours(0, 0, 0, 0)

    const matchStage: Record<string, any> = {
      [entityType === 'brand' ? 'brandId' : 'storeId']: entityId,
      status: 'active',
      comment: { $exists: true, $nin: [null, ''] },
      gmbCreateTime: { $gte: startDate, $lte: endDate }
    }

    const pipeline = [
      { $match: matchStage },
      {
        $group: {
          _id: {
            y: { $year: '$gmbCreateTime' },
            m: { $month: '$gmbCreateTime' }
          },
          // Classify by saved sentiment if present; otherwise derive from starRating:
          // 4-5 => positive, 3 => neutral, 1-2 => negative
          positive: {
            $sum: {
              $cond: [
                {
                  $or: [
                    { $eq: ['$sentimentAnalysis.sentiment', 'positive'] },
                    { $gte: ['$starRating', 4] }
                  ]
                },
                1,
                0
              ]
            }
          },
          negative: {
            $sum: {
              $cond: [
                {
                  $or: [
                    { $eq: ['$sentimentAnalysis.sentiment', 'negative'] },
                    { $lte: ['$starRating', 2] }
                  ]
                },
                1,
                0
              ]
            }
          },
          neutral: {
            $sum: {
              $cond: [
                {
                  $or: [
                    { $eq: ['$sentimentAnalysis.sentiment', 'neutral'] },
                    { $eq: ['$starRating', 3] }
                  ]
                },
                1,
                0
              ]
            }
          },
          total: { $sum: 1 }
        }
      },
      { $sort: { '_id.y': 1 as const, '_id.m': 1 as const } }
    ]

    const raw = await Review.aggregate(pipeline)

    // Build a contiguous 12-month series
    const series: Array<{ month: string; positive: number; negative: number; neutral: number; total: number }> = []
    const cursor = new Date(startDate)

    for (let i = 0; i < 12; i++) {
      const y = cursor.getFullYear()
      const m = cursor.getMonth() + 1
      const monthLabel = cursor.toLocaleString('default', { month: 'short' })
      const found = raw.find((r: any) => r._id.y === y && r._id.m === m)
      series.push({
        month: monthLabel,
        positive: found?.positive || 0,
        negative: found?.negative || 0,
        neutral: found?.neutral || 0,
        total: found?.total || 0
      })
      cursor.setMonth(cursor.getMonth() + 1)
    }

    return NextResponse.json({ success: true, data: series })
  } catch (error: any) {
    console.error('Monthly sentiment error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch monthly sentiment', details: error.message }, { status: 500 })
  }
}


