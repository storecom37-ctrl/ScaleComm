import { NextRequest, NextResponse } from 'next/server'
import { Review } from '@/lib/database/separate-models'
import connectToDatabase from '@/lib/database/connection'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase()
    const { id } = await params
    
    const review = await Review.findById(id)
      .populate('storeId', 'name address city')
      .populate('brandId', 'name slug')
      .lean()
    
    if (!review) {
      return NextResponse.json({
        success: false,
        error: 'Review not found'
      }, { status: 404 })
    }
    
    return NextResponse.json({
      success: true,
      data: review
    })
    
  } catch (error) {
    console.error('Error fetching review:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch review',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase()
    const { id } = await params
    
    const body = await request.json()
    
    const review = await Review.findByIdAndUpdate(
      id,
      body,
      { new: true, runValidators: true }
    )
      .populate('storeId', 'name address city')
      .populate('brandId', 'name slug')
    
    if (!review) {
      return NextResponse.json({
        success: false,
        error: 'Review not found'
      }, { status: 404 })
    }
    
    return NextResponse.json({
      success: true,
      data: review
    })
    
  } catch (error) {
    console.error('Error updating review:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to update review',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase()
    const { id } = await params
    
    const review = await Review.findByIdAndDelete(id)
    
    if (!review) {
      return NextResponse.json({
        success: false,
        error: 'Review not found'
      }, { status: 404 })
    }
    
    return NextResponse.json({
      success: true,
      message: 'Review deleted successfully'
    })
    
  } catch (error) {
    console.error('Error deleting review:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to delete review',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
