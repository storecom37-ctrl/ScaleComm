// Script to clean up duplicate performance records
// This will help fix the issue where numbers keep increasing on each sync

const mongoose = require('mongoose');

async function cleanupPerformanceDuplicates() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/scalecomm');
    console.log('Connected to MongoDB');
    
    const Performance = mongoose.model('Performance', new mongoose.Schema({}, { strict: false }));
    
    console.log('🔍 Finding duplicate performance records...');
    
    // Find duplicates by grouping on storeId + period
    const duplicates = await Performance.aggregate([
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
    ]);
    
    console.log(`Found ${duplicates.length} groups with duplicate records`);
    
    let totalDeleted = 0;
    
    for (const group of duplicates) {
      console.log(`\n📊 Processing group for store ${group._id.storeId} (${group._id.startTime} to ${group._id.endTime})`);
      console.log(`   Found ${group.count} duplicate records`);
      
      // Sort by updatedAt (most recent first), keep the newest one
      const sorted = group.docs.sort((a, b) => {
        const aTime = new Date(a.updatedAt || a.createdAt).getTime();
        const bTime = new Date(b.updatedAt || b.createdAt).getTime();
        return bTime - aTime;
      });
      
      // Keep the first (newest) record, delete the rest
      const toKeep = sorted[0];
      const toDelete = sorted.slice(1);
      
      console.log(`   Keeping record: ${toKeep._id} (updated: ${toKeep.updatedAt || toKeep.createdAt})`);
      console.log(`   Deleting ${toDelete.length} older records`);
      
      const deleteIds = toDelete.map(doc => doc._id);
      const result = await Performance.deleteMany({ _id: { $in: deleteIds } });
      
      console.log(`   ✅ Deleted ${result.deletedCount} records`);
      totalDeleted += result.deletedCount;
    }
    
    console.log(`\n🎉 Cleanup complete!`);
    console.log(`Total duplicate records removed: ${totalDeleted}`);
    
    // Show some statistics
    const totalRecords = await Performance.countDocuments();
    console.log(`Total performance records remaining: ${totalRecords}`);
    
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    
  } catch (error) {
    console.error('Error during cleanup:', error);
    process.exit(1);
  }
}

// Run the cleanup
cleanupPerformanceDuplicates();
