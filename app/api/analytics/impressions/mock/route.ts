import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Mock impressions API called...')
    
    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '30')
    
    // Generate mock data based on days
    const baseImpressions = Math.floor(683 * (days / 30))
    const deviceInteraction = {
      desktop: Math.floor(baseImpressions * 0.25),
      mobile: Math.floor(baseImpressions * 0.75),
      total: baseImpressions
    }
    
    const platformImpressions = {
      maps: Math.floor(baseImpressions * 0.79),
      search: Math.floor(baseImpressions * 0.21),
      total: baseImpressions
    }
    
    const detailedBreakdown = {
      desktopSearch: Math.floor(baseImpressions * 0.12),
      mobileSearch: Math.floor(baseImpressions * 0.08),
      desktopMaps: Math.floor(baseImpressions * 0.12),
      mobileMaps: Math.floor(baseImpressions * 0.67)
    }
    
    const response = {
      deviceInteraction,
      platformImpressions,
      detailedBreakdown,
      debug: {
        message: 'Using mock data for testing',
        days,
        timestamp: new Date().toISOString()
      }
    }
    
    console.log('✅ Mock response:', JSON.stringify(response, null, 2))
    
    return NextResponse.json(response)
  } catch (error) {
    console.error('❌ Error in mock impressions API:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch mock impression analytics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
