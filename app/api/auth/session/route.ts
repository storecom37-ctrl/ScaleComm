import { NextResponse } from 'next/server'
import { getSession } from '@/lib/utils/session'
import connectDB from '@/lib/database/connection'
import { User } from '@/lib/database/user-model'
import { Brand } from '@/lib/database/models'

export async function GET() {
  try {
    const session = await getSession()
    
    if (!session) {
        return NextResponse.json({
            success: false,
            authenticated: false
        }, { status: 401 })
    }
    
    // Get fresh user data from database
    await connectDB()
    
    // First, try to find in User collection
    let user = await User.findById(session.userId).select('-password')
    
    if (user) {
      // User found in User collection
      return NextResponse.json({
        success: true,
        authenticated: true,
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
    }
    
    // If not found in User collection, check if userId is a Brand ID
    const brand = await Brand.findById(session.userId)
    
    if (!brand) {
      return NextResponse.json({
        success: false,
        authenticated: false
      }, { status: 401 })
    }
    
    // User is a brand owner/manager - return brand-based user data
    return NextResponse.json({
      success: true,
      authenticated: true,
      data: {
        user: {
          id: brand._id,
          email: session.email,
          name: brand.name,
          role: session.role,
          brandId: brand._id,
          phone: brand.phone,
          status: 'active'
        }
      }
    })
  } catch (error) {
    console.error('Session error:', error)
    return NextResponse.json(
      { success: false, authenticated: false },
      { status: 500 }
    )
  }
}
