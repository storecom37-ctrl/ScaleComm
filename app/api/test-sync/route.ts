import { NextRequest, NextResponse } from 'next/server'
import { ImprovedSyncService } from '@/lib/services/improved-sync-service'

export async function POST(request: NextRequest) {
  try {
    const { tokens } = await request.json()
    
    if (!tokens) {
      return NextResponse.json(
        { error: 'No tokens provided' },
        { status: 400 }
      )
    }

    console.log('🧪 Starting test sync...')
    
    // Initialize sync state
    const accountData = {
      id: 'test-account-123',
      name: 'Test Account',
      email: 'test@example.com'
    }
    
    const syncState = await ImprovedSyncService.initializeSync(tokens, accountData)
    console.log('✅ Sync state initialized:', syncState.id)
    
    // Test with a simple location
    const testLocation = {
      id: 'accounts/test-account-123/locations/test-location-456',
      name: 'Test Location',
      address: '123 Test St, Test City, TC 12345',
      phoneNumber: '+1234567890',
      websiteUrl: 'https://test.com',
      categories: ['Test Category'],
      verified: true,
      accountId: 'test-account-123'
    }
    
    console.log('🧪 Testing with location:', testLocation.name)
    
    // Test the parallel save methods directly
    const testReviews = [
      {
        id: 'test-review-1',
        locationId: testLocation.id,
        reviewer: {
          displayName: 'Test Reviewer',
          profilePhotoUrl: 'https://example.com/photo.jpg'
        },
        starRating: 5,
        comment: 'Great test review!',
        createTime: new Date().toISOString(),
        updateTime: new Date().toISOString()
      }
    ]
    
    console.log('💾 Testing reviews save...')
    // This will test the database connection and save functionality
    await (ImprovedSyncService as any).saveReviewsBatchParallel(testReviews, syncState, testLocation.id)
    
    return NextResponse.json({
      success: true,
      message: 'Test sync completed successfully',
      syncState: {
        id: syncState.id,
        status: syncState.status
      },
      testResults: {
        location: testLocation.name,
        reviewsSaved: testReviews.length
      }
    })
    
  } catch (error) {
    console.error('Test sync failed:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}




