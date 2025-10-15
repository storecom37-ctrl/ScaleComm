import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/database/connection'
import { IVRCall, Brand, Store } from '@/lib/database/models'
import mongoose from 'mongoose'

/**
 * POST /api/ivr-calls/[brandId]
 * 
 * Receives IVR call data from external systems (e.g., Waybeo)
 * and stores it in the database linked to a specific brand.
 * 
 * Example endpoint: https://storecom.in/store-locator-admin/api/ivr-calls/301
 * where 301 is the brandId
 * 
 * Sample Payload:
 * {
 *   "customer_name": "",
 *   "publisher_type": "waybeo",
 *   "lead_type": "InboundCalls",
 *   "Store_id": "Colive 588",
 *   "Store_Name": "Colive - Tornio",
 *   "call_start_time": "2025-10-07 15:45:44",
 *   "call_end_time": "2025-10-07 15:45:47",
 *   "call_status": "IVR Drop",
 *   "call_type": "",
 *   "Location": "Bangalore",
 *   "virtual_number": 9619066581,
 *   "customer_number": 7021803186,
 *   "call_recording_url": "N/A"
 * }
 * 
 * Sample Response:
 * {"status":200,"message":"Added succssfully"}
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ brandId: string }> }
) {
  try {
    // Await the params object to get brandId
    const { brandId } = await context.params

    // Connect to database
    await connectDB()

    // Validate brandId is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(brandId)) {
      return NextResponse.json(
        { status: 400, message: 'Invalid brand ID format' },
        { status: 400 }
      )
    }

    // Verify brand exists
    const brand = await Brand.findById(brandId)
    if (!brand) {
      return NextResponse.json(
        { status: 404, message: 'Brand not found' },
        { status: 404 }
      )
    }

    // Parse request body
    const body = await request.json()

    // Parse date-time strings (format: "2025-10-07 15:45:44")
    const parseDateTime = (dateTimeStr: string): Date => {
      // Replace space with 'T' to make it ISO-compatible
      const isoStr = dateTimeStr.replace(' ', 'T')
      return new Date(isoStr)
    }

    const callStartTime = parseDateTime(body.call_start_time)
    const callEndTime = parseDateTime(body.call_end_time)

    // Calculate duration in seconds
    const durationSeconds = Math.max(
      0,
      Math.floor((callEndTime.getTime() - callStartTime.getTime()) / 1000)
    )

    // Try to find matching store by name or identifier
    let storeId: mongoose.Types.ObjectId | undefined = undefined
    if (body.Store_Name || body.Store_id) {
      const store = await Store.findOne({
        brandId: new mongoose.Types.ObjectId(brandId),
        $or: [
          { name: { $regex: body.Store_Name || '', $options: 'i' } },
          { storeCode: { $regex: body.Store_id || '', $options: 'i' } }
        ]
      })
      if (store) {
        storeId = store._id as mongoose.Types.ObjectId
      }
    }

    // Create IVR Call record
    const ivrCall = new IVRCall({
      brandId: new mongoose.Types.ObjectId(brandId),
      storeId,
      customerName: body.customer_name || '',
      customerNumber: body.customer_number ? String(body.customer_number) : undefined,
      publisherType: body.publisher_type || 'waybeo',
      leadType: body.lead_type || 'InboundCalls',
      storeIdentifier: body.Store_id || undefined,
      storeName: body.Store_Name || undefined,
      location: body.Location || undefined,
      callStartTime,
      callEndTime,
      callStatus: body.call_status || 'Unknown',
      callType: body.call_type || undefined,
      virtualNumber: body.virtual_number ? String(body.virtual_number) : undefined,
      callRecordingUrl: body.call_recording_url !== 'N/A' ? body.call_recording_url : undefined,
      duration: body.conversation_duration && body.ring_duration 
        ? body.conversation_duration + body.ring_duration
        : durationSeconds,
      conversationDuration: body.conversation_duration || 0,
      ringDuration: body.ring_duration || 0,
      status: 'active'
    })

    // Save to database
    await ivrCall.save()

    // Return success response in the format expected by the caller
    return NextResponse.json(
      { 
        status: 200, 
        message: 'Added succssfully', // Keeping the typo to match the expected response
        data: {
          id: ivrCall._id,
          brandId: ivrCall.brandId,
          storeId: ivrCall.storeId,
          customerNumber: ivrCall.customerNumber,
          callStatus: ivrCall.callStatus,
          callStartTime: ivrCall.callStartTime,
          duration: ivrCall.duration
        }
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('Error saving IVR call:', error)
    
    // Handle specific MongoDB errors
    if (error && typeof error === 'object' && 'name' in error) {
      if (error.name === 'ValidationError') {
        return NextResponse.json(
          { 
            status: 400, 
            message: 'Validation error',
            error: error instanceof Error ? error.message : 'Unknown validation error'
          },
          { status: 400 }
        )
      }
    }

    return NextResponse.json(
      { 
        status: 500, 
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/ivr-calls/[brandId]
 * 
 * Retrieves IVR calls for a specific brand
 * Optional query parameters:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 50)
 * - status: Filter by call status
 * - startDate: Filter calls from this date
 * - endDate: Filter calls until this date
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ brandId: string }> }
) {
  try {
    // Await the params object to get brandId
    const { brandId } = await context.params

    // Connect to database
    await connectDB()

    // Validate brandId
    if (!mongoose.Types.ObjectId.isValid(brandId)) {
      return NextResponse.json(
        { status: 400, message: 'Invalid brand ID format' },
        { status: 400 }
      )
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const callStatus = searchParams.get('status')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const skip = (page - 1) * limit

    // Build query
    const query: Record<string, unknown> = {
      brandId: new mongoose.Types.ObjectId(brandId),
      status: 'active'
    }

    if (callStatus) {
      query.callStatus = callStatus
    }

    if (startDate || endDate) {
      const dateFilter: Record<string, Date> = {}
      if (startDate) {
        dateFilter.$gte = new Date(startDate)
      }
      if (endDate) {
        dateFilter.$lte = new Date(endDate)
      }
      query.callStartTime = dateFilter
    }

    // Get IVR calls with pagination
    const [calls, total] = await Promise.all([
      IVRCall.find(query)
        .populate('storeId', 'name storeCode address')
        .sort({ callStartTime: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      IVRCall.countDocuments(query)
    ])

    const totalPages = Math.ceil(total / limit)

    return NextResponse.json({
      status: 200,
      message: 'Success',
      data: calls,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    })

  } catch (error) {
    console.error('Error fetching IVR calls:', error)
    return NextResponse.json(
      { 
        status: 500, 
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

