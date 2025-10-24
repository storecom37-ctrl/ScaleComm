import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/database/connection'
import { getGmbTokensFromRequest } from '@/lib/utils/auth-helpers'
import { GmbApiServerService } from '@/lib/server/gmb-api-server'
import { GmbCategory } from '@/lib/database/category-models'

// POST /api/gmb/categories/sync - Sync GMB categories to database
export async function POST(request: NextRequest) {
  try {
    await connectDB()

    // Get GMB tokens from request
    const tokens = await getGmbTokensFromRequest()
    if (!tokens) {
      return NextResponse.json(
        { success: false, error: 'GMB authentication required' },
        { status: 401 }
      )
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const regionCode = searchParams.get('regionCode') || 'US'
    const languageCode = searchParams.get('languageCode') || 'en-US'

    

    // Initialize GMB API service
    const gmbService = new GmbApiServerService(tokens)

    // Fetch categories from GMB API
    const categories = await gmbService.getCategories(regionCode, languageCode)
    
    

    // Process and save categories to database
    let createdCount = 0
    let updatedCount = 0
    let skippedCount = 0

    for (const category of categories) {
      try {
        const categoryData = {
          gmbCategoryId: category.name,
          displayName: category.displayName,
          description: category.description || '',
          parentCategory: category.parentCategory || null,
          regionCode,
          languageCode,
          status: 'active',
          lastSyncedAt: new Date()
        }

        // Use upsert to create or update
        const result = await GmbCategory.findOneAndUpdate(
          { gmbCategoryId: category.name },
          categoryData,
          { upsert: true, new: true }
        )

        if (result.isNew) {
          createdCount++
        } else {
          updatedCount++
        }

      } catch (error) {
        console.error(`Error processing category ${category.name}:`, error)
        skippedCount++
      }
    }

    // Get total count in database
    const totalInDb = await GmbCategory.countDocuments({ 
      regionCode, 
      languageCode, 
      status: 'active' 
    })

    

    return NextResponse.json({
      success: true,
      data: {
        synced: {
          fetched: categories.length,
          created: createdCount,
          updated: updatedCount,
          skipped: skippedCount
        },
        totalInDatabase: totalInDb,
        regionCode,
        languageCode,
        syncedAt: new Date()
      }
    })

  } catch (error: any) {
    console.error('Error syncing GMB categories:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to sync GMB categories',
        details: error.message 
      },
      { status: 500 }
    )
  }
}

// GET /api/gmb/categories/sync - Get sync status
export async function GET(request: NextRequest) {
  try {
    await connectDB()

    const { searchParams } = new URL(request.url)
    const regionCode = searchParams.get('regionCode') || 'US'
    const languageCode = searchParams.get('languageCode') || 'en-US'

    // Get sync status
    const totalCategories = await GmbCategory.countDocuments({ 
      regionCode, 
      languageCode, 
      status: 'active' 
    })

    const lastSync = await GmbCategory.findOne({ 
      regionCode, 
      languageCode, 
      status: 'active' 
    }).sort({ lastSyncedAt: -1 })

    return NextResponse.json({
      success: true,
      data: {
        totalCategories,
        lastSyncedAt: lastSync?.lastSyncedAt || null,
        regionCode,
        languageCode,
        needsSync: totalCategories === 0
      }
    })

  } catch (error: any) {
    console.error('Error getting sync status:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to get sync status',
        details: error.message 
      },
      { status: 500 }
    )
  }
}







