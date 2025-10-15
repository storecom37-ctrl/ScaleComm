import mongoose from 'mongoose'

// GMB Account Schema - Separate collection for GMB accounts
const GmbAccountSchema = new mongoose.Schema({
  // GMB Account ID from Google
  gmbAccountId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  
  // Account Information
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  
  // Connection Status
  connected: {
    type: Boolean,
    default: true
  },
  lastSyncAt: {
    type: Date
  },
  
  // OAuth Tokens (encrypted)
  tokens: {
    access_token: String,
    refresh_token: String,
    expires_at: Date
  },
  
  // Account Metadata
  metadata: {
    totalLocations: {
      type: Number,
      default: 0
    },
    totalReviews: {
      type: Number,
      default: 0
    },
    totalPosts: {
      type: Number,
      default: 0
    }
  },
  
  // Status
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active'
  }
}, {
  timestamps: true
})

// User Account Access Schema - Many-to-many relationship
const UserAccountAccessSchema = new mongoose.Schema({
  // User identification (could be email, user ID, etc.)
  userEmail: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  
  // GMB Account reference
  gmbAccountId: {
    type: String,
    required: true,
    ref: 'GmbAccount'
  },
  
  // Access Level
  accessLevel: {
    type: String,
    enum: ['owner', 'admin', 'manager', 'viewer'],
    default: 'viewer'
  },
  
  // Permissions
  permissions: {
    canViewReviews: { type: Boolean, default: true },
    canViewPosts: { type: Boolean, default: true },
    canCreatePosts: { type: Boolean, default: false },
    canManageStores: { type: Boolean, default: false },
    canManageUsers: { type: Boolean, default: false }
  },
  
  // Status
  status: {
    type: String,
    enum: ['active', 'inactive', 'pending'],
    default: 'active'
  }
}, {
  timestamps: true
})

// Create indexes
GmbAccountSchema.index({ gmbAccountId: 1 })
GmbAccountSchema.index({ email: 1 })
GmbAccountSchema.index({ status: 1 })

UserAccountAccessSchema.index({ userEmail: 1 })
UserAccountAccessSchema.index({ gmbAccountId: 1 })
UserAccountAccessSchema.index({ userEmail: 1, gmbAccountId: 1 }, { unique: true })

// Export models
export const GmbAccount = mongoose.models.GmbAccount || mongoose.model('GmbAccount', GmbAccountSchema)
export const UserAccountAccess = mongoose.models.UserAccountAccess || mongoose.model('UserAccountAccess', UserAccountAccessSchema)
