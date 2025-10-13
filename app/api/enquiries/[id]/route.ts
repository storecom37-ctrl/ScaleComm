import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/database/connection'
import { Enquiry } from '@/lib/database/models'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await connectDB()

    const body = await request.json()
    const { status, response, respondedBy } = body

    const updateData: any = { updatedAt: new Date() }
    
    if (status) updateData.status = status
    if (response) {
      updateData.response = response
      updateData.respondedAt = new Date()
      if (respondedBy) updateData.respondedBy = respondedBy
    }

    const enquiry = await Enquiry.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    ).populate('storeId', 'name slug')
     .populate('brandId', 'name slug')

    if (!enquiry) {
      return NextResponse.json(
        { success: false, error: 'Enquiry not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: enquiry,
      message: 'Enquiry updated successfully'
    })

  } catch (error) {
    console.error('Error updating enquiry:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await connectDB()

    const enquiry = await Enquiry.findById(id)
      .populate('storeId', 'name slug')
      .populate('brandId', 'name slug')
      .lean()

    if (!enquiry) {
      return NextResponse.json(
        { success: false, error: 'Enquiry not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: enquiry
    })

  } catch (error) {
    console.error('Error fetching enquiry:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
