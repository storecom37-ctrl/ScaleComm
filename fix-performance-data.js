// Comprehensive script to fix performance data issues
// This will clean up duplicates and ensure data integrity

const mongoose = require('mongoose');

async function fixPerformanceData() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/scalecomm');
    console.log('Connected to MongoDB');
    
    const Performance = mongoose.model('Performance', new mongoose.Schema({}, { strict: false }));
    
    console.log('🔍 Analyzing performance data...');
    
    // Get total count
    const totalRecords = await Performance.countDocuments();
    console.log(`Total performance records: ${totalRecords}`);
    
    if (totalRecords === 0) {
      console.log('No performance records found. Database is clean.');
      await mongoose.disconnect();
      return;
    }
    
    // Find duplicates by grouping on storeId + period
    console.log('\n🔍 Finding duplicate records...');
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
    
    // Clean up duplicates
    for (const group of duplicates) {
      console.log(`\n📊 Processing duplicates for store ${group._id.storeId}`);
      console.log(`   Period: ${group._id.startTime} to ${group._id.endTime}`);
      console.log(`   Found ${group.count} duplicate records`);
      
      // Sort by lastSyncedAt or updatedAt (most recent first)
      const sorted = group.docs.sort((a, b) => {
        const aTime = new Date(a.lastSyncedAt || a.updatedAt || a.createdAt).getTime();
        const bTime = new Date(b.lastSyncedAt || b.updatedAt || b.createdAt).getTime();
        return bTime - aTime;
      });
      
      // Keep the first (newest) record, delete the rest
      const toKeep = sorted[0];
      const toDelete = sorted.slice(1);
      
      console.log(`   Keeping record: ${toKeep._id}`);
      console.log(`   Deleting ${toDelete.length} older records`);
      
      const deleteIds = toDelete.map(doc => doc._id);
      const result = await Performance.deleteMany({ _id: { $in: deleteIds } });
      
      console.log(`   ✅ Deleted ${result.deletedCount} records`);
      totalDeleted += result.deletedCount;
    }
    
    // Show final statistics
    const finalCount = await Performance.countDocuments();
    console.log(`\n🎉 Cleanup complete!`);
    console.log(`Total duplicate records removed: ${totalDeleted}`);
    console.log(`Total performance records remaining: ${finalCount}`);
    
    // Show some sample data to verify
    if (finalCount > 0) {
      console.log('\n📊 Sample performance data:');
      const sampleData = await Performance.find({}).limit(3).sort({ lastSyncedAt: -1 });
      sampleData.forEach((record, index) => {
        console.log(`   ${index + 1}. Store: ${record.storeId}, Views: ${record.views}, Actions: ${record.actions}`);
      });
    }
    
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    
  } catch (error) {
    console.error('Error during cleanup:', error);
    process.exit(1);
  }
}

// Run the fix
fixPerformanceData();
