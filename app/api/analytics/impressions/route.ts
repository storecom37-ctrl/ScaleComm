import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/database/connection'
import { Performance } from '@/lib/database/separate-models'
import { getGmbTokensFromRequest, getAllBrandAccountIds } from '@/lib/utils/auth-helpers'

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase()
    
    // Get tokens from request to filter by accessible GMB accounts
    const tokens = await getGmbTokensFromRequest()
    let accessibleAccountIds: string[] = []
    
    if (tokens) {
      // Get all account IDs that the current user has access to
      accessibleAccountIds = await getAllBrandAccountIds()
      
    }

    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get('accountId')
    const locationId = searchParams.get('locationId')
    const days = parseInt(searchParams.get('days') || '30')

    if (!accountId || !locationId) {
      return NextResponse.json({ error: 'Missing accountId or locationId' }, { status: 400 })
    }

    // If no GMB authentication, return empty data
    if (accessibleAccountIds.length === 0) {
      
      return NextResponse.json({
        deviceInteraction: { desktop: 0, mobile: 0, total: 0 },
        platformImpressions: { maps: 0, search: 0, total: 0 },
        detailedBreakdown: {
          desktopSearch: 0,
          mobileSearch: 0,
          desktopMaps: 0,
          mobileMaps: 0
        },
        message: 'No GMB authentication - connect your Google My Business account to view impression data'
      })
    }

    // Check if the requested accountId is accessible
    if (!accessibleAccountIds.includes(accountId)) {
      return NextResponse.json({ error: 'Access denied to this account' }, { status: 403 })
    }

    // Calculate date range
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // Aggregate impression data
    const impressionData = await Performance.aggregate([
      {
        $match: {
          accountId,
          locationId,
          'period.startTime': { $gte: startDate },
          'period.endTime': { $lte: endDate },
          status: 'active'
        }
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
