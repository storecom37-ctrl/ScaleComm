import mongoose from 'mongoose'

// GMB Category Schema
const GmbCategorySchema = new mongoose.Schema({
  // GMB Category ID (e.g., "gcid:restaurant")
  gmbCategoryId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  
  // Display name (e.g., "Restaurant")
  displayName: {
    type: String,
    required: true,
    trim: true
  },
  
  // Description
  description: {
    type: String,
    trim: true
  },
  
  // Parent category (if any)
  parentCategory: {
    type: String,
    trim: true
  },
  
  // Region and language
  regionCode: {
    type: String,
    required: true,
    default: 'US'
  },
  
  languageCode: {
    type: String,
    required: true,
    default: 'en-US'
  },
  
  // Status
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  
  // Last synced from GMB API
  lastSyncedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
})

// Create indexes for efficient queries
GmbCategorySchema.index({ gmbCategoryId: 1 })
GmbCategorySchema.index({ displayName: 'text', description: 'text' })
GmbCategorySchema.index({ regionCode: 1, languageCode: 1 })
GmbCategorySchema.index({ status: 1 })

// Export the model
export const GmbCategory = mongoose.models.GmbCategory || mongoose.model('GmbCategory', GmbCategorySchema)

// TypeScript interface
export interface IGmbCategory extends mongoose.Document {
  gmbCategoryId: string
  displayName: string
  description?: string
  parentCategory?: string
  regionCode: string
  languageCode: string
  status: 'active' | 'inactive'
  lastSyncedAt: Date
  createdAt: Date
  updatedAt: Date
}







