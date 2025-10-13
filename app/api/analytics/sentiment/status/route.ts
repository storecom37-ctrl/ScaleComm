import { NextRequest, NextResponse } from 'next/server'
import { sentimentWorkflow } from '@/lib/services/sentiment-workflow'
import connectToDatabase from '@/lib/database/connection'
import { getSession } from '@/lib/utils/session'

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase()
    
    const session = await getSession()
    if (!session) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const brandId = searchParams.get('brandId')
    const storeId = searchParams.get('storeId')
    const days = parseInt(searchParams.get('days') || '30')
    
    if (!brandId && !storeId) {
      return NextResponse.json({
        success: false,
        error: 'Either brandId or storeId is required'
      }, { status: 400 })
    }

    const entityId = brandId || storeId
    const entityType = brandId ? 'brand' : 'store'
    
    const status = await sentimentWorkflow.getAnalysisStatus(entityId, entityType, days)
    
    return NextResponse.json({
      success: true,
      data: {
        entityId,
        entityType,
        days,
        ...status,
        message: status.needsAnalysis 
          ? `${status.remainingReviews} reviews need analysis (${status.analysisProgress}% complete)`
          : `All ${status.totalReviews} reviews analyzed (100% complete)`
      }
    })

  } catch (error: any) {
    console.error('Analysis status error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to get analysis status',
      details: error.message
    }, { status: 500 })
  }
}
