// Comprehensive script to fix performance data issues
// This will clean up duplicates and ensure data integrity

const mongoose = require('mongoose');

async function fixPerformanceData() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/scalecomm');
    
    
    const Performance = mongoose.model('Performance', new mongoose.Schema({}, { strict: false }));
    
    
    
    // Get total count
    const totalRecords = await Performance.countDocuments();
    
    
    if (totalRecords === 0) {
      
      await mongoose.disconnect();
      return;
    }
    
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
    
    
    
    let totalDeleted = 0;
    
    // Clean up duplicates
    for (const group of duplicates) {
      
      
      
      
      // Sort by lastSyncedAt or updatedAt (most recent first)
      const sorted = group.docs.sort((a, b) => {
        const aTime = new Date(a.lastSyncedAt || a.updatedAt || a.createdAt).getTime();
        const bTime = new Date(b.lastSyncedAt || b.updatedAt || b.createdAt).getTime();
        return bTime - aTime;
      });
      
      // Keep the first (newest) record, delete the rest
      const toKeep = sorted[0];
      const toDelete = sorted.slice(1);
      
      
      
      
      const deleteIds = toDelete.map(doc => doc._id);
      const result = await Performance.deleteMany({ _id: { $in: deleteIds } });
      
      
      totalDeleted += result.deletedCount;
    }
    
    // Show final statistics
    const finalCount = await Performance.countDocuments();
    
    
    
    
    // Show some sample data to verify
    if (finalCount > 0) {
      
      const sampleData = await Performance.find({}).limit(3).sort({ lastSyncedAt: -1 });
      sampleData.forEach((record, index) => {
        
      });
    }
    
    await mongoose.disconnect();
    
    
  } catch (error) {
    console.error('Error during cleanup:', error);
    process.exit(1);
  }
}

// Run the fix
fixPerformanceData();
