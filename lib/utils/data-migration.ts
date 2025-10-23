/**
 * Data Migration Utility
 * 
 * This utility helps migrate data from the old embedded structure
 * (reviews, posts, performance data stored in Store.gmbData)
 * to the new separate models (Review, Post, Performance collections)
 */

import { Store } from '@/lib/database/models'
import { Review, Post, Performance, SearchKeyword } from '@/lib/database/separate-models'
import { connectToDatabase } from '@/lib/database/connection'

export interface MigrationStats {
  storesProcessed: number
  reviewsMigrated: number
  postsMigrated: number
  performanceRecordsMigrated: number
  searchKeywordsMigrated: number
  errors: string[]
}

export async function migrateStoreData(): Promise<MigrationStats> {
  try {
    await connectToDatabase()
    
    const stats: MigrationStats = {
      storesProcessed: 0,
      reviewsMigrated: 0,
      postsMigrated: 0,
      performanceRecordsMigrated: 0,
      searchKeywordsMigrated: 0,
      errors: []
    }
    
    
    
    // Get all stores that have GMB integration data
    // Note: gmbData is no longer embedded in Store model - this migration is for legacy data
    const stores = await Store.find({ 
      gmbLocationId: { $exists: true, $ne: null },
      $or: [
        { gmbLocationId: { $exists: true, $ne: null } },
        { gmbAccountId: { $exists: true, $ne: null } },
        { placeId: { $exists: true, $ne: null } }
      ]
    }).lean()
    
    
    
    for (const store of stores) {
      try {
        stats.storesProcessed++
        
        
        // Migrate Reviews
        // Note: This migration utility is for legacy data - embedded gmbData no longer exists
        // Reviews should now be synced directly from GMB API to separate Review collection
        
        
        // Migrate Posts
        // Note: This migration utility is for legacy data - embedded gmbData no longer exists
        // Posts should now be synced directly from GMB API to separate Post collection
        
        
        // Migrate Performance Data
        // Note: This migration utility is for legacy data - embedded gmbData no longer exists
        // Performance data should now be synced directly from GMB API to separate Performance collection
        
        
        // Migrate Search Keywords
        // Note: This migration utility is for legacy data - embedded gmbData no longer exists
        // Search keywords should now be synced directly from GMB API to separate SearchKeyword collection
        
        
      } catch (error) {
        const errorMsg = `Error processing store ${store.name}: ${error instanceof Error ? error.message : 'Unknown error'}`
        console.error(errorMsg)
        stats.errors.push(errorMsg)
      }
    }
    
    
    
    
    return stats
    
  } catch (error) {
    console.error('Migration failed:', error)
    throw error
  }
}

/**
 * Clean up old embedded data after successful migration
 * This should only be run after verifying the migration was successful
 * Note: gmbData is no longer embedded in Store model - this function is for legacy compatibility
 */
export async function cleanupEmbeddedData(): Promise<void> {
  try {
    await connectToDatabase()
    
    
    
    // Note: gmbData is no longer embedded in Store model
    // This function is kept for legacy compatibility but does nothing
    
    
  } catch (error) {
    console.error('Cleanup failed:', error)
    throw error
  }
}

/**
 * Verify migration integrity
 * Note: gmbData is no longer embedded in Store model - this function shows current data counts
 */
export async function verifyMigration(): Promise<{
  storesWithGmbIntegration: number
  totalReviews: number
  totalPosts: number
  totalPerformanceRecords: number
  totalSearchKeywords: number
}> {
  try {
    await connectToDatabase()
    
    // Count stores with GMB integration (current schema)
    const storesWithGmbIntegration = await Store.countDocuments({
      $or: [
        { gmbLocationId: { $exists: true, $ne: null } },
        { gmbAccountId: { $exists: true, $ne: null } },
        { placeId: { $exists: true, $ne: null } }
      ]
    })
    
    const totalReviews = await Review.countDocuments()
    const totalPosts = await Post.countDocuments()
    const totalPerformanceRecords = await Performance.countDocuments()
    const totalSearchKeywords = await SearchKeyword.countDocuments()
    
    return {
      storesWithGmbIntegration,
      totalReviews,
      totalPosts,
      totalPerformanceRecords,
      totalSearchKeywords
    }
    
  } catch (error) {
    console.error('Verification failed:', error)
    throw error
  }
}
