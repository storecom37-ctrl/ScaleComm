import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/database/connection'
import { GmbCategory } from '@/lib/database/category-models'

// GET /api/gmb/categories/list - Get all GMB categories for dropdown from database
export async function GET(request: NextRequest) {
  try {
    await connectDB()

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const regionCode = searchParams.get('regionCode') || 'US'
    const languageCode = searchParams.get('languageCode') || 'en-US'
    const search = searchParams.get('search') || ''

    

    // Build query
    const query: any = {
      regionCode,
      languageCode,
      status: 'active'
    }

    // Add search filter if provided
    if (search) {
      query.$or = [
        { displayName: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ]
    }

    // Fetch categories from database
    const categories = await GmbCategory.find(query)
      .sort({ displayName: 1 })
      .lean()
    
    

    // Format categories for frontend dropdown
    const formattedCategories = categories.map((category: any) => ({
      value: category.gmbCategoryId,    // GMB category ID (e.g., "gcid:restaurant")
      label: category.displayName,      // Display name (e.g., "Restaurant")
      description: category.description || '',
      parentCategory: category.parentCategory || null
    }))

    // Group categories by parent for better organization
    const groupedCategories = {
      popular: formattedCategories.slice(0, 20), // First 20 as popular
      all: formattedCategories
    }

    return NextResponse.json({
      success: true,
      data: {
        categories: groupedCategories,
        total: formattedCategories.length,
        regionCode,
        languageCode,
        source: 'database'
      }
    })

  } catch (error: any) {
    console.error('Error fetching GMB categories from database:', error)
    
    // Return fallback categories if database fails
    const fallbackCategories = [
      { value: 'gcid:restaurant', label: 'Restaurant', description: 'Food and dining establishment' },
      { value: 'gcid:cafe', label: 'Cafe', description: 'Coffee shop or cafe' },
      { value: 'gcid:hotel', label: 'Hotel', description: 'Lodging and accommodation' },
      { value: 'gcid:store', label: 'Store', description: 'Retail store' },
      { value: 'gcid:beauty_salon', label: 'Beauty Salon', description: 'Beauty and personal care' },
      { value: 'gcid:hospital', label: 'Hospital', description: 'Medical facility' },
      { value: 'gcid:automotive_repair', label: 'Automotive Repair', description: 'Vehicle repair and maintenance' },
      { value: 'gcid:business_service', label: 'Business Service', description: 'Professional services' }
    ]

    return NextResponse.json({
      success: true,
      data: {
        categories: {
          popular: fallbackCategories,
          all: fallbackCategories
        },
        total: fallbackCategories.length,
        regionCode: 'US',
        languageCode: 'en-US',
        fallback: true
      }
    })
  }
}
