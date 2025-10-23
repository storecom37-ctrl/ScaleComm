import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/database/connection'
import GmbSyncService from '@/lib/services/gmb-sync-service'

// POST /api/gmb/sync-all - Sync all GMB data to database
export async function POST(request: NextRequest) {
  try {
    await connectDB()

    const body = await request.json()
    const { gmbData } = body

    if (!gmbData) {
      return NextResponse.json(
        { success: false, error: 'GMB data is required' },
        { status: 400 }
      )
    }

    
    // Validate required data structure
    if (!gmbData.account || !gmbData.locations) {
      return NextResponse.json(
        { success: false, error: 'Account and locations data are required' },
        { status: 400 }
      )
    }

    // Perform complete sync
    const syncResult = await GmbSyncService.syncAllData(gmbData)

    return NextResponse.json({
      success: true,
      message: 'GMB data synced successfully',
      data: syncResult
    })
  } catch (error) {
    console.error('Error syncing GMB data:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to sync GMB data' },
      { status: 500 }
    )
  }
}

// GET /api/gmb/sync-all - Get sync statistics
export async function GET() {
  try {
    await connectDB()

    const stats = await GmbSyncService.getSyncStats()

    return NextResponse.json({
      success: true,
      data: stats
    })
  } catch (error) {
    console.error('Error getting sync stats:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to get sync statistics' },
      { status: 500 }
    )
  }
}

