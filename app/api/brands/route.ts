import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/database/connection'
import { Brand } from '@/lib/database/models'
import bcrypt from 'bcryptjs'
import { getGmbTokensFromRequest, getCurrentUserEmail } from '@/lib/utils/auth-helpers'
import { getSession } from '@/lib/utils/session'

// GET /api/brands - Get all brands with pagination and search
export async function GET(request: NextRequest) {
  try {
    await connectDB()

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''
    const accountId = searchParams.get('accountId')

    const skip = (page - 1) * limit

    // Build query
    const query: Record<string, unknown> = {}
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { slug: { $regex: search, $options: 'i' } }
      ]
    }

    if (status) {
      query.status = status
    }

    // Get session from new auth system
    const session = await getSession()
    let currentUserEmail: string | null = null
    let userRole: string | null = null
    let userBrandId: string | null = null
    
    // Try to get email from session first (new auth system)
    if (session) {
      currentUserEmail = session.email
      userRole = session.role
      userBrandId = session.brandId || null
      
    } else {
      // Fall back to GMB tokens (legacy)
      const tokens = await getGmbTokensFromRequest()
      if (tokens) {
        currentUserEmail = await getCurrentUserEmail(tokens)
        
      }
    }
    
    // Filter brands based on role
    if (userRole === 'super_admin') {
      // Super admin sees all brands
      
      // No additional filtering needed
    } else if (userRole === 'owner' || userRole === 'manager') {
      // Owner/Manager only see their own brand
      if (userBrandId) {
        query._id = userBrandId
        
      } else {
        // If no brandId, try to find by email
        query.$or = [
          { 'users.owner.email': currentUserEmail },
          { 'users.manager.email': currentUserEmail }
        ]
        
      }
    } else if (currentUserEmail) {
      // Legacy: If no role but have email, show brands owned by user
      query.$or = [
        { 'users.owner.email': currentUserEmail },
        { 'users.manager.email': currentUserEmail }
      ]
      
    } else {
      // If no authentication at all, show no brands
      query._id = { $exists: false }
      
    }

    // Get brands with pagination - include GMB settings
    const [brands, total] = await Promise.all([
      Brand.find(query)
        .select('-users.owner.password -users.manager.password') // Exclude passwords
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Brand.countDocuments(query)
    ])

    const totalPages = Math.ceil(total / limit)
    const hasNextPage = page < totalPages
    const hasPrevPage = page > 1

    return NextResponse.json({
      success: true,
      data: brands,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage,
        hasPrevPage
      }
    })
  } catch (error) {
    console.error('Error fetching brands:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch brands' },
      { status: 500 }
    )
  }
}

// POST /api/brands - Create new brand
export async function POST(request: NextRequest) {
  try {
    await connectDB()
    
    // Check if user is super_admin
    const session = await getSession()
    if (!session || session.role !== 'super_admin') {
      return NextResponse.json(
        { success: false, error: 'Only super admins can create brands' },
        { status: 403 }
      )
    }

    const body = await request.json()

    // Validate required fields with user-friendly messages
    const requiredFields = [
      { field: 'name', message: 'Brand name is required' },
      { field: 'slug', message: 'Brand slug is required' },
      { field: 'email', message: 'Brand email address is required' },
      { field: 'address', message: 'Brand address is required' },
      { field: 'users', message: 'User information is required' }
    ]
    
    for (const { field, message } of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { success: false, error: message },
          { status: 400 }
        )
      }
    }

    // Check if slug already exists
    const existingBrand = await Brand.findOne({ slug: body.slug })
    if (existingBrand) {
      return NextResponse.json(
        { success: false, error: 'A brand with this slug already exists. Please choose a different slug.' },
        { status: 400 }
      )
    }

    // Check if owner email already exists
    const existingOwner = await Brand.findOne({ 'users.owner.email': body.users.owner.email })
    if (existingOwner) {
      return NextResponse.json(
        { success: false, error: 'An account with this email address already exists. Please use a different email.' },
        { status: 400 }
      )
    }

    // Hash passwords
    const saltRounds = 12
    body.users.owner.password = await bcrypt.hash(body.users.owner.password, saltRounds)
    
    if (body.users.manager?.password) {
      body.users.manager.password = await bcrypt.hash(body.users.manager.password, saltRounds)
    }

    // Create brand
    const brand = new Brand(body)
    await brand.save()

    // Return brand without passwords
    const brandData = brand.toObject() as any
    if (brandData.users?.owner?.password) {
      brandData.users.owner.password = undefined
    }
    if (brandData.users?.manager?.password) {
      brandData.users.manager.password = undefined
    }

    return NextResponse.json({
      success: true,
      data: brandData,
      message: 'Brand created successfully'
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating brand:', error)
    
    if (error && typeof error === 'object' && 'code' in error && error.code === 11000) {
      // Duplicate key error
      const field = 'keyPattern' in error && error.keyPattern ? Object.keys(error.keyPattern as Record<string, unknown>)[0] : 'field'
      return NextResponse.json(
        { success: false, error: `${field} already exists` },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Failed to create brand' },
      { status: 500 }
    )
  }
}
