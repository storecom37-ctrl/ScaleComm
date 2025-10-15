import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/database/connection'
import { Enquiry } from '@/lib/database/models'

export async function GET(request: NextRequest) {
  try {
    await connectDB()

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const status = searchParams.get('status')
    const enquiryType = searchParams.get('enquiryType')
    const search = searchParams.get('search')

    // Build query
    const query: Record<string, unknown> = {}
    if (status) query.status = status
    if (enquiryType) query.enquiryType = enquiryType
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { subject: { $regex: search, $options: 'i' } },
        { message: { $regex: search, $options: 'i' } }
      ]
    }

    // Calculate skip for pagination
    const skip = (page - 1) * limit

    // Execute queries
    const [enquiries, totalCount] = await Promise.all([
      Enquiry.find(query)
        .populate('storeId', 'name slug')
        .populate('brandId', 'name slug')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Enquiry.countDocuments(query)
    ])

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / limit)
    const hasNextPage = page < totalPages
    const hasPrevPage = page > 1

    return NextResponse.json({
      success: true,
      data: {
        enquiries,
        pagination: {
          currentPage: page,
          totalPages,
          totalCount,
          hasNextPage,
          hasPrevPage,
          limit
        }
      }
    })

  } catch (error) {
    console.error('Error fetching enquiries:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
