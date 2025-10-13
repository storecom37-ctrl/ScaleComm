import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/database/connection'
import { User } from '@/lib/database/user-model'
import { Brand } from '@/lib/database/models'
import { createSessionToken, setSessionCookie } from '@/lib/utils/session'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    await connectDB()
    
    const body = await request.json()
    const { email, password } = body
    
    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      )
    }
    
    const emailLower = email.toLowerCase()
    
    // Try to find user in User collection first
    let user = await User.findOne({ email: emailLower })
    
    if (user) {
      // Check if user is active
      if (user.status !== 'active') {
        return NextResponse.json(
          { success: false, error: 'Account is inactive or suspended' },
          { status: 403 }
        )
      }
      
      // Verify password
      const isPasswordValid = await user.comparePassword(password)
      
      if (!isPasswordValid) {
        return NextResponse.json(
          { success: false, error: 'Invalid email or password' },
          { status: 401 }
        )
      }
      
    // Update last login
    user.lastLoginAt = new Date()
    await user.save()
    
    // Create session token
    const sessionToken = createSessionToken({
      userId: String(user._id),
      email: user.email,
      name: user.name,
      role: user.role,
      brandId: user.brandId ? String(user.brandId) : undefined
    })
    
    // Create response with user data
    const response = NextResponse.json({
      success: true,
      data: {
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          role: user.role,
          brandId: user.brandId,
          phone: user.phone,
          profilePicture: user.profilePicture,
          status: user.status
        }
      }
    })
    
    // Set session cookie on response
    response.cookies.set('session-token', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/'
    })
    
    return response
    }
    
    // If not found in User collection, check Brand collection for owner/manager
    const brand = await Brand.findOne({
      $or: [
        { 'users.owner.email': emailLower },
        { 'users.manager.email': emailLower }
      ]
    })
    
    if (!brand) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      )
    }
    
    // Check if it's owner or manager
    let userRole: 'owner' | 'manager' | null = null
    let storedPassword: string | null = null
    
    if (brand.users.owner.email === emailLower) {
      userRole = 'owner'
      storedPassword = brand.users.owner.password
    } else if (brand.users.manager && brand.users.manager.email === emailLower) {
      userRole = 'manager'
      storedPassword = brand.users.manager.password || null
    }
    
    if (!userRole || !storedPassword) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      )
    }
    
    // Verify password (Brand passwords are hashed)
    const isPasswordValid = await bcrypt.compare(password, storedPassword)
    
    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      )
    }
    
    // Create session token for brand user
    const sessionToken = createSessionToken({
      userId: String(brand._id), // Use brand ID as user ID
      email: emailLower,
      name: brand.name, // Use brand name as user name
      role: userRole,
      brandId: String(brand._id)
    })
    
    // Create response with user data
    const response = NextResponse.json({
      success: true,
      data: {
        user: {
          id: brand._id,
          email: emailLower,
          name: brand.name,
          role: userRole,
          brandId: brand._id,
          status: 'active'
        }
      }
    })
    
    // Set session cookie on response
    response.cookies.set('session-token', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/'
    })
    
    return response
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { success: false, error: 'An error occurred during login' },
      { status: 500 }
    )
  }
}
