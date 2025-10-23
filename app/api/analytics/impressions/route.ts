import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/database/connection'
import { Performance } from '@/lib/database/separate-models'

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase()

    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get('accountId')
    const locationId = searchParams.get('locationId')

    // If no specific account/location requested, get all data from database
    const matchQuery: any = { status: 'active' }
    
    if (accountId && accountId !== 'all') {
      matchQuery.accountId = accountId
    }
    
    if (locationId && locationId !== 'all') {
      matchQuery.locationId = locationId
    }

    console.log('🔍 Impressions API - Querying database with match:', matchQuery)

    // Aggregate impression data from database
    const impressionData = await Performance.aggregate([
      {
        $match: matchQuery
      },
      {
        $group: {
          _id: null,
          totalDesktopSearchImpressions: { $sum: '$desktopSearchImpressions' },
          totalMobileSearchImpressions: { $sum: '$mobileSearchImpressions' },
          totalDesktopMapsImpressions: { $sum: '$desktopMapsImpressions' },
          totalMobileMapsImpressions: { $sum: '$mobileMapsImpressions' }
        }
      }
    ])

    const data = impressionData[0] || {
      totalDesktopSearchImpressions: 0,
      totalMobileSearchImpressions: 0,
      totalDesktopMapsImpressions: 0,
      totalMobileMapsImpressions: 0
    }

    // Calculate device breakdown
    const desktopImpressions = data.totalDesktopSearchImpressions + data.totalDesktopMapsImpressions
    const mobileImpressions = data.totalMobileSearchImpressions + data.totalMobileMapsImpressions
    const totalImpressions = desktopImpressions + mobileImpressions

    // Calculate platform breakdown
    const searchImpressions = data.totalDesktopSearchImpressions + data.totalMobileSearchImpressions
    const mapsImpressions = data.totalDesktopMapsImpressions + data.totalMobileMapsImpressions

    const response = {
      deviceInteraction: {
        desktop: desktopImpressions,
        mobile: mobileImpressions,
        total: totalImpressions
      },
      platformImpressions: {
        maps: mapsImpressions,
        search: searchImpressions,
        total: totalImpressions
      },
      detailedBreakdown: {
        desktopSearch: data.totalDesktopSearchImpressions,
        mobileSearch: data.totalMobileSearchImpressions,
        desktopMaps: data.totalDesktopMapsImpressions,
        mobileMaps: data.totalMobileMapsImpressions
      }
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching impression analytics:', error)
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json(
      { 
        error: 'Failed to fetch impression analytics',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}
