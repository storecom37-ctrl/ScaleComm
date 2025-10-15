import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/database/connection'
import { Brand } from '@/lib/database/models'
import { getGmbTokensFromRequest, getCurrentUserEmail } from '@/lib/utils/auth-helpers'

export async function GET(request: NextRequest) {
  try {
    await connectDB()
    
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')
    const id = searchParams.get('id')
    
    // Get current user's email from tokens if no email is provided
    let targetEmail = email
    let tokens = null
    if (!targetEmail) {
      tokens = await getGmbTokensFromRequest()
      if (tokens) {
        targetEmail = await getCurrentUserEmail(tokens)
        console.log('🔍 Account API - Using current user email:', targetEmail)
        
        // If we can't get email from tokens, tokens might be invalid
        if (!targetEmail) {
          console.log('🔍 Account API - Could not get email from tokens, tokens may be invalid')
          return NextResponse.json({
            success: false,
            error: 'Invalid or expired GMB tokens'
          }, { status: 401 })
        }
      }
    }
    
    // If no target email and no tokens, user is not authenticated
    if (!targetEmail && !email && !id) {
      console.log('🔍 Account API - No authentication found')
      return NextResponse.json({
        success: false,
        error: 'No GMB authentication found'
      }, { status: 401 })
    }
    
    // Build query - find by email or GMB account id
    const query: Record<string, unknown> = {}
    if (targetEmail) query.email = targetEmail
    if (id) query['settings.gmbIntegration.gmbAccountId'] = id
    
    // Only search if we have a valid query
    if (Object.keys(query).length === 0) {
      console.log('🔍 Account API - No valid query parameters')
      return NextResponse.json({
        success: false,
        error: 'No valid search parameters provided'
      }, { status: 400 })
    }
    
    // Find specific brand with GMB integration
    const brand = await Brand.findOne({ 
      ...query,
      'settings.gmbIntegration.connected': true 
    }).lean()
    console.log('🔍 Account API - Found brand with query:', query, '- Result:', !!brand)
    
    if (!brand) {
      return NextResponse.json({
        success: false,
        error: 'No GMB account found'
      }, { status: 404 })
    }
    
    // Transform brand data to match expected GMB account format
    const brandData = brand as any
    const account = {
      id: brandData.settings?.gmbIntegration?.gmbAccountId,
      name: brandData.settings?.gmbIntegration?.gmbAccountName || brandData.name,
      email: brandData.email,
      connectedAt: brandData.settings?.gmbIntegration?.lastSyncAt,
      lastSyncAt: brandData.settings?.gmbIntegration?.lastSyncAt,
      metadata: brandData.settings?.gmbIntegration?.gmbMetadata || {}
    }
    
    return NextResponse.json({
      success: true,
      data: account
    })
  } catch (error: unknown) {
    console.error('Error fetching account from database:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch account' 
      },
      { status: 500 }
    )
  }
}
