import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/database/connection'
import { Brand } from '@/lib/database/models'
import { deleteFromS3 } from '@/lib/services/aws-s3'
import bcrypt from 'bcryptjs'
import { getSession } from '@/lib/utils/session'
import { canAccessBrand } from '@/lib/utils/permissions'

// GET /api/brands/[id] - Get single brand
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB()
    const { id } = await params

    const brand = await Brand.findById(id)
      .select('-users.owner.password -users.manager.password')
      .lean()

    if (!brand) {
      return NextResponse.json(
        { success: false, error: 'Brand not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: brand
    })
  } catch (error) {
    console.error('Error fetching brand:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch brand' },
      { status: 500 }
    )
  }
}

// PUT /api/brands/[id] - Update brand
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB()
    const { id } = await params
    
    // Check permissions
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }
    
    // Check if user can access this brand
    if (!canAccessBrand(session.role, session.brandId, id)) {
      return NextResponse.json(
        { success: false, error: 'You do not have permission to edit this brand' },
        { status: 403 }
      )
    }

    const body = await request.json()

    // Find existing brand
    const existingBrand = await Brand.findById(id)
    if (!existingBrand) {
      return NextResponse.json(
        { success: false, error: 'Brand not found' },
        { status: 404 }
      )
    }

    // Check if slug is being changed and if it's already taken
    if (body.slug && body.slug !== existingBrand.slug) {
      const slugExists = await Brand.findOne({ slug: body.slug, _id: { $ne: id } })
      if (slugExists) {
        return NextResponse.json(
          { success: false, error: 'Brand slug already exists' },
          { status: 400 }
        )
      }
    }

    // Prepare update data
    const updateData = { ...body, updatedAt: new Date() }
    
    // Hash passwords if they're being updated
    if (body.users?.owner?.password) {
      const saltRounds = 12
      updateData.users.owner.password = await bcrypt.hash(body.users.owner.password, saltRounds)
    } else if (body.users?.owner) {
      // If owner data is provided but no password, preserve the existing password
      delete updateData.users.owner.password
    }

    if (body.users?.manager?.password) {
      const saltRounds = 12
      updateData.users.manager.password = await bcrypt.hash(body.users.manager.password, saltRounds)
    } else if (body.users?.manager) {
      // If manager data is provided but no password, preserve the existing password
      delete updateData.users.manager.password
    }

    // Update brand using $set to only update provided fields
    const updatedBrand = await Brand.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: false } // Disable validators to avoid required password validation
    ).select('-users.owner.password -users.manager.password')

    return NextResponse.json({
      success: true,
      data: updatedBrand,
      message: 'Brand updated successfully'
    })
  } catch (error) {
    console.error('Error updating brand:', error)
    
    if (error && typeof error === 'object' && 'code' in error && error.code === 11000) {
      const field = 'keyPattern' in error && error.keyPattern ? Object.keys(error.keyPattern as Record<string, any>)[0] : 'field'
      return NextResponse.json(
        { success: false, error: `${field} already exists` },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Failed to update brand' },
      { status: 500 }
    )
  }
}

// DELETE /api/brands/[id] - Delete brand
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB()
    const { id } = await params
    
    // Check permissions - only super_admin can delete brands
    const session = await getSession()
    if (!session || session.role !== 'super_admin') {
      return NextResponse.json(
        { success: false, error: 'Only super admins can delete brands' },
        { status: 403 }
      )
    }

    const brand = await Brand.findById(id)
    if (!brand) {
      return NextResponse.json(
        { success: false, error: 'Brand not found' },
        { status: 404 }
      )
    }

    // Delete associated images from S3
    const imagesToDelete = []
    
    // Logo
    if (brand.logo?.key) {
      imagesToDelete.push(brand.logo.key)
    }

    // Product images
    if (brand.products) {
      brand.products.forEach((product: any) => {
        if (product.image?.key) {
          imagesToDelete.push(product.image.key)
        }
      })
    }

    // Gallery images
    if (brand.gallery) {
      brand.gallery.forEach((image: any) => {
        if (image.key) {
          imagesToDelete.push(image.key)
        }
      })
    }

    // Delete images from S3
    const deletePromises = imagesToDelete.map(key => deleteFromS3(key))
    await Promise.allSettled(deletePromises) // Use allSettled to continue even if some deletions fail

    // Delete brand from database
    await Brand.findByIdAndDelete(id)

    return NextResponse.json({
      success: true,
      message: 'Brand deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting brand:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete brand' },
      { status: 500 }
    )
  }
}
