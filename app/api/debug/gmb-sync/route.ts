import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/database/connection'
import { Store } from '@/lib/database/models'
import { Brand } from '@/lib/database/models'

export async function GET(request: NextRequest) {
  try {
    await connectDB()
    
    // Get basic stats
    const totalStores = await Store.countDocuments()
    const totalBrands = await Brand.countDocuments()
    
    // Get stores with GMB data
    const storesWithGmb = await Store.countDocuments({ 
      $or: [
        { gmbLocationId: { $exists: true, $ne: null } },
        { 'gmbData.locationId': { $exists: true, $ne: null } }
      ]
    })
    
    // Get recent stores (last 24 hours)
    const recentStores = await Store.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    })
    
    // Get stores by status
    const activeStores = await Store.countDocuments({ status: 'active' })
    const inactiveStores = await Store.countDocuments({ status: 'inactive' })
    
    // Sample store data
    const sampleStores = await Store.find({})
      .select('name status gmbLocationId createdAt')
      .limit(5)
      .sort({ createdAt: -1 })
    
    return NextResponse.json({
      success: true,
      data: {
        totalStores,
        totalBrands,
        storesWithGmb,
        recentStores,
        activeStores,
        inactiveStores,
        sampleStores
      }
    })
  } catch (error) {
    console.error('Debug GMB sync error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}
