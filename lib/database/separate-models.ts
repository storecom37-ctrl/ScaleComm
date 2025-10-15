import mongoose from 'mongoose'

// Review Schema - Separate collection for reviews
const ReviewSchema = new mongoose.Schema({
  // GMB Review ID
  gmbReviewId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  
  // Relationships
  storeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    required: true
  },
  brandId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Brand',
    required: true
  },
  accountId: {
    type: String,
    required: true,
    trim: true
  },
  
  // Review Data
  reviewer: {
    displayName: {
      type: String,
      required: true,
      trim: true
    },
    profilePhotoUrl: String,
    isAnonymous: {
      type: Boolean,
      default: false
    }
  },
  starRating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  comment: {
    type: String,
    trim: true
  },
  
  // GMB Timestamps
  gmbCreateTime: {
    type: Date,
    required: true
  },
  gmbUpdateTime: {
    type: Date,
    required: true
  },
  
  // Response Management
  hasResponse: {
    type: Boolean,
    default: false
  },
  response: {
    comment: String,
    responseTime: Date,
    respondedBy: String
  },
  
  // Status and Metadata
  status: {
    type: String,
    enum: ['active', 'hidden', 'deleted'],
    default: 'active'
  },
  source: {
    type: String,
    enum: ['gmb', 'manual', 'imported'],
    default: 'gmb'
  },
  
  // Analytics
  helpfulCount: {
    type: Number,
    default: 0
  },
  reportedCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
})

// Post Schema - Separate collection for posts
const PostSchema = new mongoose.Schema({
  // GMB Post ID
  gmbPostId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  
  // Relationships
  storeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    required: true
  },
  brandId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Brand',
    required: true
  },
  accountId: {
    type: String,
    required: true,
    trim: true
  },
  
  // Post Content
  summary: {
    type: String,
    trim: true
  },
  callToAction: {
    actionType: {
      type: String,
      enum: ['BOOK', 'ORDER_ONLINE', 'SHOP', 'LEARN_MORE', 'SIGN_UP', 'GET_OFFER', 'CALL']
    },
    url: String
  },
  
  // Media
  media: [{
    mediaFormat: {
      type: String,
      enum: ['PHOTO', 'VIDEO']
    },
    sourceUrl: String,
    thumbnailUrl: String
  }],
  
  // GMB Timestamps
  gmbCreateTime: {
    type: Date,
    required: true
  },
  gmbUpdateTime: {
    type: Date,
    required: true
  },
  
  // Post Type and Language
  languageCode: {
    type: String,
    default: 'en'
  },
  state: {
    type: String,
    enum: ['LIVE', 'DRAFT', 'EXPIRED'],
    default: 'LIVE'
  },
  topicType: {
    type: String,
    enum: ['STANDARD', 'EVENT', 'OFFER', 'PRODUCT']
  },
  
  // Event Details (if applicable)
  event: {
    title: String,
    schedule: {
      startDate: {
        year: Number,
        month: Number,
        day: Number
      },
      startTime: mongoose.Schema.Types.Mixed,
      endDate: {
        year: Number,
        month: Number,
        day: Number
      },
      endTime: {
        hours: Number,
        minutes: Number,
        seconds: Number
      }
    }
  },
  
  // URL and Analytics
  searchUrl: String,
  viewCount: {
    type: Number,
    default: 0
  },
  clickCount: {
    type: Number,
    default: 0
  },
  
  // Status
  status: {
    type: String,
    enum: ['active', 'archived', 'deleted'],
    default: 'active'
  },
  source: {
    type: String,
    enum: ['gmb', 'manual', 'imported'],
    default: 'gmb'
  }
}, {
  timestamps: true
})

// Performance Schema - Separate collection for performance metrics
const PerformanceSchema = new mongoose.Schema({
  // Relationships
  storeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    required: true
  },
  brandId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Brand',
    required: true
  },
  accountId: {
    type: String,
    required: true,
    trim: true
  },
  
  // Time Period
  period: {
    startTime: {
      type: Date,
      required: true
    },
    endTime: {
      type: Date,
      required: true
    },
    periodType: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'custom'],
      default: 'daily'
    },
    // Date range information for filtering (7, 30, 90, 180 days)
    dateRange: {
      days: {
        type: Number,
        required: false
      },
      label: {
        type: String,
        required: false
      },
      startDate: {
        type: String,
        required: false
      },
      endDate: {
        type: String,
        required: false
      }
    }
  },
  
  // Core Metrics
  queries: {
    type: Number,
    default: 0
  },
  views: {
    type: Number,
    default: 0
  },
  actions: {
    type: Number,
    default: 0
  },
  
  // Detailed Actions
  photoViews: {
    type: Number,
    default: 0
  },
  callClicks: {
    type: Number,
    default: 0
  },
  websiteClicks: {
    type: Number,
    default: 0
  },
  directionRequests: {
    type: Number,
    default: 0
  },
  businessBookings: {
    type: Number,
    default: 0
  },
  businessFoodOrders: {
    type: Number,
    default: 0
  },
  businessMessages: {
    type: Number,
    default: 0
  },
  
  // Impression Metrics
  desktopSearchImpressions: {
    type: Number,
    default: 0
  },
  mobileSearchImpressions: {
    type: Number,
    default: 0
  },
  desktopMapsImpressions: {
    type: Number,
    default: 0
  },
  mobileMapsImpressions: {
    type: Number,
    default: 0
  },
  
  // Conversion Rates (calculated)
  conversionRate: {
    type: Number,
    default: 0
  },
  clickThroughRate: {
    type: Number,
    default: 0
  },
  
  // Source and Status
  source: {
    type: String,
    enum: ['gmb', 'manual', 'calculated'],
    default: 'gmb'
  },
  status: {
    type: String,
    enum: ['active', 'archived'],
    default: 'active'
  }
}, {
  timestamps: true
})

// Search Keyword Schema - Separate collection for search keywords
const SearchKeywordSchema = new mongoose.Schema({
  // Relationships
  storeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    required: true
  },
  brandId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Brand',
    required: true
  },
  accountId: {
    type: String,
    required: true,
    trim: true
  },
  
  // Keyword Data
  keyword: {
    type: String,
    required: true,
    trim: true
  },
  
  // Time Period
  period: {
    year: {
      type: Number,
      required: true
    },
    month: {
      type: Number,
      required: true,
      min: 1,
      max: 12
    }
  },
  
  // Performance Metrics
  impressions: {
    type: Number,
    required: true,
    default: 0
  },
  clicks: {
    type: Number,
    default: 0
  },
  ctr: {
    type: Number,
    default: 0
  },
  position: {
    type: Number,
    default: 0
  },
  
  // Source and Status
  source: {
    type: String,
    enum: ['gmb', 'manual', 'imported'],
    default: 'gmb'
  },
  status: {
    type: String,
    enum: ['active', 'archived'],
    default: 'active'
  }
}, {
  timestamps: true
})

// Create indexes for Review model (gmbReviewId index is automatically created by unique: true)
ReviewSchema.index({ storeId: 1 })
ReviewSchema.index({ brandId: 1 })
ReviewSchema.index({ accountId: 1 })
ReviewSchema.index({ 'gmbCreateTime': -1 })
ReviewSchema.index({ starRating: 1 })
ReviewSchema.index({ hasResponse: 1 })
ReviewSchema.index({ status: 1 })

// Create indexes for Post model (gmbPostId index is automatically created by unique: true)
PostSchema.index({ storeId: 1 })
PostSchema.index({ brandId: 1 })
PostSchema.index({ accountId: 1 })
PostSchema.index({ 'gmbCreateTime': -1 })
PostSchema.index({ state: 1 })
PostSchema.index({ topicType: 1 })
PostSchema.index({ status: 1 })

// Create indexes for Performance model
PerformanceSchema.index({ storeId: 1 })
PerformanceSchema.index({ brandId: 1 })
PerformanceSchema.index({ accountId: 1 })
PerformanceSchema.index({ 'period.startTime': 1, 'period.endTime': 1 })
PerformanceSchema.index({ 'period.periodType': 1 })
PerformanceSchema.index({ status: 1 })

// Create indexes for SearchKeyword model
SearchKeywordSchema.index({ storeId: 1 })
SearchKeywordSchema.index({ brandId: 1 })
SearchKeywordSchema.index({ accountId: 1 })
SearchKeywordSchema.index({ keyword: 1 })
SearchKeywordSchema.index({ 'period.year': 1, 'period.month': 1 })
SearchKeywordSchema.index({ status: 1 })

// Export models
export const Review = mongoose.models.Review || mongoose.model('Review', ReviewSchema)
export const Post = mongoose.models.Post || mongoose.model('Post', PostSchema)
export const Performance = mongoose.models.Performance || mongoose.model('Performance', PerformanceSchema)
export const SearchKeyword = mongoose.models.SearchKeyword || mongoose.model('SearchKeyword', SearchKeywordSchema)
