import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/database/connection'
import { getGmbTokensFromRequest } from '@/lib/utils/auth-helpers'
import { GmbApiServerService } from '@/lib/server/gmb-api-server'

// GET /api/gmb/categories - Fetch GMB categories for store creation
export async function GET(request: NextRequest) {
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
    const search = searchParams.get('search') || ''

    console.log(`🔍 Fetching GMB categories for region: ${regionCode}, language: ${languageCode}`)

    // Initialize GMB API service
    const gmbService = new GmbApiServerService(tokens)

    // Fetch categories from GMB API
    const categories = await gmbService.getCategories(regionCode, languageCode)
    
    console.log(`✅ Fetched ${categories.length} GMB categories`)

    // Filter categories based on search term if provided
    let filteredCategories = categories
    if (search) {
      const searchLower = search.toLowerCase()
      filteredCategories = categories.filter((category: any) => 
        category.displayName?.toLowerCase().includes(searchLower) ||
        category.name?.toLowerCase().includes(searchLower)
      )
    }

    // Format categories for frontend
    const formattedCategories = filteredCategories.map((category: any) => ({
      id: category.name,
      name: category.displayName,
      value: category.name,
      description: category.description || '',
      parentCategory: category.parentCategory || null
    }))

    // Sort categories alphabetically by display name
    formattedCategories.sort((a: any, b: any) => a.name.localeCompare(b.name))

    return NextResponse.json({
      success: true,
      data: formattedCategories,
      meta: {
        total: formattedCategories.length,
        regionCode,
        languageCode,
        search: search || null
      }
    })

  } catch (error: any) {
    console.error('Error fetching GMB categories:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch GMB categories',
        details: error.message 
      },
      { status: 500 }
    )
  }
}







