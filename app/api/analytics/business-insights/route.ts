import { NextRequest, NextResponse } from 'next/server'
import { businessInsightsGenerator } from '@/lib/services/business-insights-generator'
import connectToDatabase from '@/lib/database/connection'

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase()
    
    const { searchParams } = new URL(request.url)
    const storeId = searchParams.get('storeId')
    const brandId = searchParams.get('brandId')
    const type = searchParams.get('type') || 'store'
    const days = parseInt(searchParams.get('days') || '30') // Analysis period in days (default 30)
    
    if (!storeId && !brandId) {
      return NextResponse.json({
        success: false,
        error: 'Either storeId or brandId is required'
      }, { status: 400 })
    }

    const entityId = storeId || brandId
    const entityType = type as 'store' | 'brand'

    console.log(`🔍 Generating business insights for ${entityType}: ${entityId} (${days} days)`)
    
    const insights = await businessInsightsGenerator.generateInsights(entityId!, entityType, days)
    
    return NextResponse.json({
      success: true,
      data: insights
    })

  } catch (error: any) {
    console.error('Business insights error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to generate business insights',
      details: error.message
    }, { status: 500 })
  }
}

