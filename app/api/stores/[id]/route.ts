import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/database/connection'
import { Store } from '@/lib/database/models'
// AWS S3 removed - using placeholder URLs

// GET /api/stores/[id] - Get single store
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB()
    const { id } = await params

    const store = await Store.findById(id)
      .populate('brandId', 'name slug logo')
      .lean()

    if (!store) {
      return NextResponse.json(
        { success: false, error: 'Store not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: store
    })
  } catch (error) {
    console.error('Error fetching store:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch store' },
      { status: 500 }
    )
  }
}

// PUT /api/stores/[id] - Update store
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB()
    const { id } = await params

    const body = await request.json()

    // Find existing store
    const existingStore = await Store.findById(id)
    if (!existingStore) {
      return NextResponse.json(
        { success: false, error: 'Store not found' },
        { status: 404 }
      )
    }

    // Check if store code is being changed and if it's already taken
    if (body.storeCode && body.storeCode !== existingStore.storeCode) {
      const codeExists = await Store.findOne({ storeCode: body.storeCode, _id: { $ne: id } })
      if (codeExists) {
        return NextResponse.json(
          { success: false, error: 'Store code already exists' },
          { status: 400 }
        )
      }
    }

    // Check if slug is being changed and if it's already taken
    if (body.slug && body.slug !== existingStore.slug) {
      const slugExists = await Store.findOne({ slug: body.slug, _id: { $ne: id } })
      if (slugExists) {
        return NextResponse.json(
          { success: false, error: 'Store slug already exists' },
          { status: 400 }
        )
      }
    }

    // Prepare update data
    const updateData = { ...body, updatedAt: new Date() }

    // Update store using $set to only update provided fields
    const updatedStore = await Store.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: false }
    ).populate('brandId', 'name slug logo')

    return NextResponse.json({
      success: true,
      data: updatedStore,
      message: 'Store updated successfully'
    })
  } catch (error) {
    console.error('Error updating store:', error)
    
    if (error && typeof error === 'object' && 'code' in error && error.code === 11000) {
      const field = 'keyPattern' in error && error.keyPattern ? Object.keys(error.keyPattern as Record<string, any>)[0] : 'field'
      return NextResponse.json(
        { success: false, error: `${field} already exists` },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Failed to update store' },
      { status: 500 }
    )
  }
}

// DELETE /api/stores/[id] - Delete store
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB()
    const { id } = await params

    const store = await Store.findById(id)
    if (!store) {
      return NextResponse.json(
        { success: false, error: 'Store not found' },
        { status: 404 }
      )
    }

    // Delete associated images from S3
    const imagesToDelete = []
    
    // Hero image
    if (store.microsite?.heroImage?.key) {
      imagesToDelete.push(store.microsite.heroImage.key)
    }

    // Existing images
    if (store.microsite?.existingImages) {
      store.microsite.existingImages.forEach((image: any) => {
        if (image.key) {
          imagesToDelete.push(image.key)
        }
      })
    }

    // Delete images from S3
    const deletePromises = imagesToDelete.map(key => deleteFromS3(key))
    await Promise.allSettled(deletePromises) // Use allSettled to continue even if some deletions fail

    // Delete store from database
    await Store.findByIdAndDelete(id)

    return NextResponse.json({
      success: true,
      message: 'Store deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting store:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete store' },
      { status: 500 }
    )
  }
}


