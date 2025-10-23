// Script to add unique indexes to prevent duplicate performance records
// This will ensure that only one record exists per store per time period

const mongoose = require('mongoose');

async function addPerformanceIndexes() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/scalecomm');
    
    
    const db = mongoose.connection.db;
    
    
    
    // Create a unique compound index on storeId + period.startTime + period.endTime
    // This will prevent duplicate records for the same store and time period
    await db.collection('performances').createIndex(
      { 
        storeId: 1, 
        'period.startTime': 1, 
        'period.endTime': 1 
      },
      { 
        unique: true,
        name: 'unique_store_period'
      }
    );
    
    
    
    // Also create an index on storeId for faster queries
    await db.collection('performances').createIndex(
      { storeId: 1 },
      { name: 'storeId_index' }
    );
    
    
    
    // Create an index on lastSyncedAt for cleanup operations
    await db.collection('performances').createIndex(
      { lastSyncedAt: 1 },
      { name: 'lastSyncedAt_index' }
    );
    
    
    
    // List all indexes
    const indexes = await db.collection('performances').listIndexes().toArray();
    
    
    await mongoose.disconnect();
    
    
  } catch (error) {
    console.error('Error adding indexes:', error);
    process.exit(1);
  }
}

// Run the index creation
addPerformanceIndexes();
