import { NextRequest, NextResponse } from 'next/server'
import { GmbApiServerService } from '@/lib/server/gmb-api-server'
import { ImprovedSyncService } from '@/lib/services/improved-sync-service'
import { getGmbTokensFromRequest, getCurrentAccountId } from '@/lib/utils/auth-helpers'
import connectDB from '@/lib/database/connection'

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    // Get authentication tokens
    const tokens = await getGmbTokensFromRequest()
    if (!tokens) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required',
        loading: false
      }, { status: 401 })
    }

    // Get current user's account ID
    const currentAccountId = await getCurrentAccountId(tokens)
    if (!currentAccountId) {
      return NextResponse.json({
        success: false,
        error: 'Unable to determine account access',
        loading: false
      }, { status: 403 })
    }

    await connectDB()
    
    
    
    // Initialize GMB API service
    const gmbService = new GmbApiServerService(tokens)
    
    // Get all accounts and locations
    const accounts = await gmbService.getAccounts()
    
    
    let totalPostsFetched = 0
    let totalPostsSaved = 0
    const allPosts: any[] = []
    const errors: any[] = []
    
    // Process each account
    for (const account of accounts) {
      try {
        
        const locations = await gmbService.getLocations(account.name)
        
        
        // Process each location
        for (const location of locations) {
          try {
            
            const posts = await gmbService.getPosts(location.id)
            
            if (posts && posts.length > 0) {
              // Add location and account info to each post
              const postsWithLocation = posts.map(post => ({
                ...post,
                locationId: location.id,
                locationName: location.name,
                accountId: currentAccountId,
                accountName: account.name
              }))
              
              allPosts.push(...postsWithLocation)
              totalPostsFetched += posts.length
              
              
            } else {
              console.log(`ℹ️ No posts found for ${location.name}`)
            }
          } catch (locationError) {
            console.error(`❌ Failed to fetch posts for location ${location.name}:`, locationError)
            errors.push({
              type: 'location_error',
              location: location.name,
              error: locationError instanceof Error ? locationError.message : 'Unknown error'
            })
          }
        }
      } catch (accountError) {
        console.error(`❌ Failed to process account ${account.name}:`, accountError)
        errors.push({
          type: 'account_error',
          account: account.name,
          error: accountError instanceof Error ? accountError.message : 'Unknown error'
        })
      }
    }
    
    // Save all posts to database using ImprovedSyncService
    if (allPosts.length > 0) {
      try {
        
        
        // Create a mock sync state for the posts sync
        const syncState = {
          id: `posts-sync-${Date.now()}`,
          brandId: currentAccountId, // Using account ID as brand ID for now
          accountId: currentAccountId,
          status: 'in_progress' as 'in_progress' | 'completed' | 'failed',
          currentStep: 'saving_posts',
          progress: {
            total: allPosts.length,
            completed: 0,
            percentage: 0
          },
          checkpoints: [],
          startedAt: new Date(),
          lastUpdatedAt: new Date(),
          dataTypes: ['posts'],
          totalRecords: allPosts.length,
          processedRecords: 0,
          errors: []
        }
        
        // Save sync state
        await ImprovedSyncService.saveSyncState(syncState)
        
        // Save posts in batches
        const batchSize = 50
        for (let i = 0; i < allPosts.length; i += batchSize) {
          const batch = allPosts.slice(i, i + batchSize)
          const locationData = batch[0] ? {
            id: batch[0].locationId,
            name: batch[0].locationName,
            title: batch[0].locationName
          } : null
          
          await ImprovedSyncService.saveDataBatch('posts', batch, syncState, locationData)
          totalPostsSaved += batch.length
          
          // Update progress
          syncState.progress.percentage = Math.round((totalPostsSaved / allPosts.length) * 100)
          syncState.progress.completed = totalPostsSaved
          syncState.processedRecords = totalPostsSaved
          await ImprovedSyncService.updateSyncState(syncState)
        }
        
        // Mark sync as completed
        syncState.status = 'completed'
        syncState.progress.percentage = 100
        syncState.progress.completed = allPosts.length
        syncState.currentStep = 'completed'
        await ImprovedSyncService.updateSyncState(syncState)
        
        
      } catch (saveError) {
        console.error('❌ Failed to save posts to database:', saveError)
        errors.push({
          type: 'save_error',
          error: saveError instanceof Error ? saveError.message : 'Unknown error'
        })
      }
    }
    
    const processingTime = Date.now() - startTime
    
    return NextResponse.json({
      success: true,
      data: {
        totalPostsFetched,
        totalPostsSaved,
        accountsProcessed: accounts.length,
        errors: errors.length > 0 ? errors : undefined
      },
      message: `Successfully synced ${totalPostsSaved} posts from ${accounts.length} accounts`,
      processingTime,
      accountId: currentAccountId
    })
    
  } catch (error: unknown) {
    console.error('❌ Posts sync failed:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to sync posts',
        processingTime: Date.now() - startTime
      },
      { status: 500 }
    )
  }
}

