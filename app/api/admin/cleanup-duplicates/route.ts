import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/database/connection'
import { Store, Review, Post, Performance, SearchKeyword } from '@/lib/database/models'

export async function POST(request: NextRequest) {
  try {
    await connectDB()
    
    const duplicates = {
      stores: 0,
      reviews: 0,
      posts: 0,
      performance: 0,
      keywords: 0
    }
    
    console.log('🧹 Starting cleanup of duplicate records...')
    
    // 1. Clean up duplicate stores (keep the one with the correct name, or the most recent)
    console.log('\n📦 Cleaning duplicate stores...')
    const stores = await Store.find({}).sort({ createdAt: -1 })
    const storeMap = new Map<string, any[]>()
    
    // Group stores by gmbLocationId + brandId
    for (const store of stores) {
      const key = `${store.gmbLocationId}-${store.brandId}`
      if (!storeMap.has(key)) {
        storeMap.set(key, [])
      }
      storeMap.get(key)!.push(store)
    }
    
    // For each group with duplicates, keep the best one and delete others
    for (const [key, storeGroup] of storeMap.entries()) {
      if (storeGroup.length > 1) {
        console.log(`\n🔍 Found ${storeGroup.length} duplicates for ${key}`)
        
        // Sort: prefer stores with correct names (not starting with "Store accounts/")
        // and more recent createdAt dates
        storeGroup.sort((a, b) => {
          const aHasGoodName = !a.name.startsWith('Store accounts/')
          const bHasGoodName = !b.name.startsWith('Store accounts/')
          
          if (aHasGoodName && !bHasGoodName) return -1
          if (!aHasGoodName && bHasGoodName) return 1
          
          // If both have good or bad names, prefer the most recent
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        })
        
        const keepStore = storeGroup[0]
        const deleteStores = storeGroup.slice(1)
        
        console.log(`  ✅ Keeping: ${keepStore.name} (${keepStore._id})`)
        
        for (const deleteStore of deleteStores) {
          console.log(`  ❌ Deleting: ${deleteStore.name} (${deleteStore._id})`)
          
          // Update all references before deleting
          await Review.updateMany(
            { storeId: deleteStore._id },
            { $set: { storeId: keepStore._id } }
          )
          
          await Post.updateMany(
            { storeId: deleteStore._id },
            { $set: { storeId: keepStore._id } }
          )
          
          await Performance.updateMany(
            { storeId: deleteStore._id },
            { $set: { storeId: keepStore._id } }
          )
          
          await SearchKeyword.updateMany(
            { storeId: deleteStore._id },
            { $set: { storeId: keepStore._id } }
          )
          
          // Delete the duplicate store
          await Store.deleteOne({ _id: deleteStore._id })
          duplicates.stores++
        }
      }
    }
    
    console.log(`\n✅ Cleaned up ${duplicates.stores} duplicate stores`)
    
    // 2. Clean up duplicate reviews (same gmbReviewId)
    console.log('\n⭐ Cleaning duplicate reviews...')
    const reviewAggregation = await Review.aggregate([
      {
        $group: {
          _id: '$gmbReviewId',
          count: { $sum: 1 },
          ids: { $push: '$_id' },
          docs: { $push: '$$ROOT' }
        }
      },
      {
        $match: { count: { $gt: 1 } }
      }
    ])
    
    for (const group of reviewAggregation) {
      // Keep the most recent one
      const sorted = group.docs.sort((a: any, b: any) => 
        new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()
      )
      const toDelete = sorted.slice(1).map((doc: any) => doc._id)
      
      await Review.deleteMany({ _id: { $in: toDelete } })
      duplicates.reviews += toDelete.length
    }
    
    console.log(`✅ Cleaned up ${duplicates.reviews} duplicate reviews`)
    
    // 3. Clean up duplicate posts (same gmbPostId)
    console.log('\n📝 Cleaning duplicate posts...')
    const postAggregation = await Post.aggregate([
      {
        $group: {
          _id: '$gmbPostId',
          count: { $sum: 1 },
          ids: { $push: '$_id' },
          docs: { $push: '$$ROOT' }
        }
      },
      {
        $match: { count: { $gt: 1 } }
      }
    ])
    
    for (const group of postAggregation) {
      const sorted = group.docs.sort((a: any, b: any) => 
        new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()
      )
      const toDelete = sorted.slice(1).map((doc: any) => doc._id)
      
      await Post.deleteMany({ _id: { $in: toDelete } })
      duplicates.posts += toDelete.length
    }
    
    console.log(`✅ Cleaned up ${duplicates.posts} duplicate posts`)
    
    // 4. Clean up duplicate performance records (same storeId + period)
    console.log('\n📊 Cleaning duplicate performance records...')
    const perfAggregation = await Performance.aggregate([
      {
        $group: {
          _id: {
            storeId: '$storeId',
            startTime: '$period.startTime',
            endTime: '$period.endTime'
          },
          count: { $sum: 1 },
          ids: { $push: '$_id' },
          docs: { $push: '$$ROOT' }
        }
      },
      {
        $match: { count: { $gt: 1 } }
      }
    ])
    
    for (const group of perfAggregation) {
      const sorted = group.docs.sort((a: any, b: any) => 
        new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()
      )
      const toDelete = sorted.slice(1).map((doc: any) => doc._id)
      
      await Performance.deleteMany({ _id: { $in: toDelete } })
      duplicates.performance += toDelete.length
    }
    
    console.log(`✅ Cleaned up ${duplicates.performance} duplicate performance records`)
    
    // 5. Clean up duplicate keywords (same storeId + keyword + period)
    console.log('\n🔍 Cleaning duplicate search keywords...')
    const keywordAggregation = await SearchKeyword.aggregate([
      {
        $group: {
          _id: {
            storeId: '$storeId',
            keyword: '$keyword',
            year: '$period.year',
            month: '$period.month'
          },
          count: { $sum: 1 },
          ids: { $push: '$_id' },
          docs: { $push: '$$ROOT' }
        }
      },
      {
        $match: { count: { $gt: 1 } }
      }
    ])
    
    for (const group of keywordAggregation) {
      const sorted = group.docs.sort((a: any, b: any) => 
        new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()
      )
      const toDelete = sorted.slice(1).map((doc: any) => doc._id)
      
      await SearchKeyword.deleteMany({ _id: { $in: toDelete } })
      duplicates.keywords += toDelete.length
    }
    
    console.log(`✅ Cleaned up ${duplicates.keywords} duplicate keywords`)
    
    console.log('\n🎉 Cleanup complete!')
    console.log('Summary:')
    console.log(`  - Stores: ${duplicates.stores}`)
    console.log(`  - Reviews: ${duplicates.reviews}`)
    console.log(`  - Posts: ${duplicates.posts}`)
    console.log(`  - Performance: ${duplicates.performance}`)
    console.log(`  - Keywords: ${duplicates.keywords}`)
    
    return NextResponse.json({
      success: true,
      message: 'Duplicate cleanup completed successfully',
      duplicatesRemoved: duplicates,
      totalRemoved: Object.values(duplicates).reduce((sum, val) => sum + val, 0)
    })
    
  } catch (error) {
    console.error('Cleanup error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Failed to clean up duplicates' 
      },
      { status: 500 }
    )
  }
}
