import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/database/connection'
import { User } from '@/lib/database/user-model'
import { requireAuth, requireRole } from '@/lib/utils/session'

export async function POST(request: NextRequest) {
  try {
    await connectDB()
    
    const body = await request.json()
    const { email, password, name, role, brandId, phone } = body
    
    // Validate input
    if (!email || !password || !name || !role) {
      return NextResponse.json(
        { success: false, error: 'Email, password, name, and role are required' },
        { status: 400 }
      )
    }
    
    // Validate role
    if (!['super_admin', 'owner', 'manager'].includes(role)) {
      return NextResponse.json(
        { success: false, error: 'Invalid role' },
        { status: 400 }
      )
    }
    
    // Check permissions based on role being created
    let session
    try {
      session = await requireAuth()
    } catch (error) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }
    
    // Only super_admin can create owners
    if (role === 'owner' && session.role !== 'super_admin') {
      return NextResponse.json(
        { success: false, error: 'Only super admins can create owner accounts' },
        { status: 403 }
      )
    }
    
    // Super_admin or owner can create managers
    if (role === 'manager') {
      if (session.role !== 'super_admin' && session.role !== 'owner') {
        return NextResponse.json(
          { success: false, error: 'Only super admins or owners can create manager accounts' },
          { status: 403 }
        )
      }
      
      // If owner is creating a manager, must be for their own brand
      if (session.role === 'owner' && session.brandId !== brandId) {
        return NextResponse.json(
          { success: false, error: 'You can only create managers for your own brand' },
          { status: 403 }
        )
      }
    }
    
    // Owner and manager require brandId
    if ((role === 'owner' || role === 'manager') && !brandId) {
      return NextResponse.json(
        { success: false, error: 'Brand ID is required for owner and manager roles' },
        { status: 400 }
      )
    }
    
    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() })
    
    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'User with this email already exists' },
        { status: 409 }
      )
    }
    
    // Create new user
    const user = new User({
      email: email.toLowerCase(),
      password,
      name,
      role,
      brandId: brandId || undefined,
      phone: phone || undefined,
      status: 'active'
    })
    
    await user.save()
    
    // Return user data (without password)
    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          role: user.role,
          brandId: user.brandId,
          phone: user.phone,
          status: user.status
        }
      }
    }, { status: 201 })
  } catch (error: any) {
    console.error('Registration error:', error)
    
    // Handle unauthorized error
    if (error.message?.includes('Unauthorized') || error.message?.includes('Forbidden')) {
      return NextResponse.json(
        { success: false, error: 'Only super admins can register new users' },
        { status: 403 }
      )
    }
    
    return NextResponse.json(
      { success: false, error: 'An error occurred during registration' },
      { status: 500 }
    )
  }
}
