// Script to add unique indexes to prevent duplicate performance records
// This will ensure that only one record exists per store per time period

const mongoose = require('mongoose');

async function addPerformanceIndexes() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/scalecomm');
    console.log('Connected to MongoDB');
    
    const db = mongoose.connection.db;
    
    console.log('🔧 Adding unique indexes to Performance collection...');
    
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
    
    console.log('✅ Created unique index: storeId + period.startTime + period.endTime');
    
    // Also create an index on storeId for faster queries
    await db.collection('performances').createIndex(
      { storeId: 1 },
      { name: 'storeId_index' }
    );
    
    console.log('✅ Created index: storeId');
    
    // Create an index on lastSyncedAt for cleanup operations
    await db.collection('performances').createIndex(
      { lastSyncedAt: 1 },
      { name: 'lastSyncedAt_index' }
    );
    
    console.log('✅ Created index: lastSyncedAt');
    
    // List all indexes
    const indexes = await db.collection('performances').listIndexes().toArray();
    console.log('\n📋 Current indexes on Performance collection:');
    indexes.forEach(index => {
      console.log(`   - ${index.name}: ${JSON.stringify(index.key)}`);
    });
    
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
    
  } catch (error) {
    console.error('Error adding indexes:', error);
    process.exit(1);
  }
}

// Run the index creation
addPerformanceIndexes();
