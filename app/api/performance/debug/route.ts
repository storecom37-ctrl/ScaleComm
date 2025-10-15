import { NextRequest, NextResponse } from 'next/server'
import { Performance } from '@/lib/database/separate-models'
import { connectToDatabase } from '@/lib/database/connection'

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase()

    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get('accountId') || undefined
    const days = searchParams.get('days') ? parseInt(searchParams.get('days') as string) : undefined

    const match: any = {}
    if (accountId) match.accountId = accountId
    if (days) {
      match['period.dateRange.days'] = days
    }

    const [maxes] = await Performance.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          maxViews: { $max: '$views' },
          maxActions: { $max: '$actions' },
          maxCallClicks: { $max: '$callClicks' },
          maxWebsiteClicks: { $max: '$websiteClicks' },
          maxDirectionRequests: { $max: '$directionRequests' }
        }
      }
    ])

    // Return top 3 offenders per metric over sane threshold
    const threshold = 1e12 // 1 trillion
    const offenders = await Performance.find({
      accountId,
      $or: [
        { views: { $gt: threshold } },
        { actions: { $gt: threshold } },
        { callClicks: { $gt: threshold } },
        { websiteClicks: { $gt: threshold } },
        { directionRequests: { $gt: threshold } }
      ]
    })
      .select('views actions callClicks websiteClicks directionRequests period storeId brandId accountId')
      .sort({ views: -1 })
      .limit(5)
      .lean()

    return NextResponse.json({ success: true, maxes: maxes || {}, offenders })
  } catch (error) {
    console.error('Performance debug error:', error)
    return NextResponse.json({ success: false, error: 'Failed to debug performance data' }, { status: 500 })
  }
}


