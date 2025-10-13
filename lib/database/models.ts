import mongoose from 'mongoose'

// Separate models for better data organization and relationships
// Reviews, Posts, and Performance data are now in separate collections

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

// IVR Call Schema - Separate collection for IVR call tracking
const IVRCallSchema = new mongoose.Schema({
  // Relationships
  brandId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Brand',
    required: true
  },
  storeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    required: false
  },
  
  // Customer Information
  customerName: {
    type: String,
    trim: true,
    default: ''
  },
  customerNumber: {
    type: String,
    trim: true
  },
  
  // Publisher and Lead Information
  publisherType: {
    type: String,
    trim: true,
    default: 'waybeo'
  },
  leadType: {
    type: String,
    trim: true,
    default: 'InboundCalls'
  },
  
  // Store Information
  storeIdentifier: {
    type: String,
    trim: true
  },
  storeName: {
    type: String,
    trim: true
  },
  location: {
    type: String,
    trim: true
  },
  
  // Call Timing
  callStartTime: {
    type: Date,
    required: true
  },
  callEndTime: {
    type: Date,
    required: true
  },
  
  // Call Details
  callStatus: {
    type: String,
    trim: true,
    required: true
  },
  callType: {
    type: String,
    trim: true
  },
  virtualNumber: {
    type: String,
    trim: true
  },
  callRecordingUrl: {
    type: String,
    trim: true
  },
  
  // Duration (in seconds, calculated)
  duration: {
    type: Number,
    default: 0
  },
  conversationDuration: {
    type: Number,
    default: 0
  },
  ringDuration: {
    type: Number,
    default: 0
  },
  
  // Status
  status: {
    type: String,
    enum: ['active', 'archived', 'deleted'],
    default: 'active'
  }
}, {
  timestamps: true
})

// Create indexes for Review model (gmbReviewId already has unique index from schema definition)
ReviewSchema.index({ storeId: 1 })
ReviewSchema.index({ brandId: 1 })
ReviewSchema.index({ accountId: 1 })
ReviewSchema.index({ 'gmbCreateTime': -1 })
ReviewSchema.index({ starRating: 1 })
ReviewSchema.index({ hasResponse: 1 })
ReviewSchema.index({ status: 1 })
// Note: gmbReviewId index is automatically created by unique: true in schema

// Create indexes for Post model (gmbPostId already has unique index from schema definition)
PostSchema.index({ storeId: 1 })
PostSchema.index({ brandId: 1 })
PostSchema.index({ accountId: 1 })
PostSchema.index({ 'gmbCreateTime': -1 })
PostSchema.index({ state: 1 })
PostSchema.index({ topicType: 1 })
PostSchema.index({ status: 1 })
// Note: gmbPostId index is automatically created by unique: true in schema

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

// Create indexes for IVRCall model
IVRCallSchema.index({ brandId: 1 })
IVRCallSchema.index({ storeId: 1 })
IVRCallSchema.index({ customerNumber: 1 })
IVRCallSchema.index({ callStartTime: -1 })
IVRCallSchema.index({ callStatus: 1 })
IVRCallSchema.index({ status: 1 })
IVRCallSchema.index({ publisherType: 1 })
IVRCallSchema.index({ leadType: 1 })

// Brand Schema
const BrandSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  description: {
    type: String,
    trim: true
  },
  logo: {
    url: String,
    key: String // AWS S3 key for deletion
  },
  website: {
    type: String,
    trim: true
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  phone: {
    type: String,
    trim: true
  },
  industry: {
    type: String,
    trim: true
  },
  primaryCategory: {
    type: String,
    trim: true
  },
  additionalCategories: [{
    type: String,
    trim: true
  }],
  address: {
    line1: {
      type: String,
      required: true,
      trim: true
    },
    line2: {
      type: String,
      trim: true
    },
    locality: {
      type: String,
      required: true,
      trim: true
    },
    city: {
      type: String,
      required: true,
      trim: true
    },
    state: {
      type: String,
      required: true,
      trim: true
    },
    postalCode: {
      type: String,
      required: true,
      trim: true
    },
    country: {
      type: String,
      required: true,
      trim: true
    },
    latitude: Number,
    longitude: Number
  },
  branding: {
    primaryColor: {
      type: String,
      default: '#2962FF'
    },
    accentColor: {
      type: String,
      default: '#FF9100'
    },
    backgroundColor: {
      type: String,
      default: '#E6EEFF'
    },
    fontFamily: {
      type: String,
      default: 'Inter'
    },
    template: {
      type: String,
      default: 'classic'
    }
  },
  content: {
    aboutSection: {
      type: String,
      trim: true
    },
    missionStatement: {
      type: String,
      trim: true
    },
    valueProposition: {
      type: String,
      trim: true
    }
  },
  products: [{
    name: {
      type: String,
      required: true,
      trim: true
    },
    category: {
      type: String,
      trim: true
    },
    price: {
      type: Number,
      min: 0
    },
    description: {
      type: String,
      trim: true
    },
    image: {
      url: String,
      key: String
    }
  }],
  gallery: [{
    url: String,
    key: String,
    caption: String
  }],
  users: {
    owner: {
      email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true
      },
      password: {
        type: String,
        required: true
      }
    },
    manager: {
      email: {
        type: String,
        trim: true,
        lowercase: true
      },
      password: String
    }
  },
  settings: {
    gmbIntegration: {
      connected: {
        type: Boolean,
        default: false
      },
      autoSync: {
        type: Boolean,
        default: false
      },
      // GMB Account Information
      gmbAccountId: {
        type: String,
        trim: true
      },
      gmbAccountName: {
        type: String,
        trim: true
      },
      lastSyncAt: {
        type: Date
      },
      // GMB Account Metadata
      gmbMetadata: {
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
        },
        totalInsights: {
          type: Number,
          default: 0
        }
      }
    },
    notifications: {
      reviews: {
        type: Boolean,
        default: true
      },
      posts: {
        type: Boolean,
        default: true
      }
    },
    seo: {
      title: String,
      description: String,
      keywords: [String]
    },
    socialMedia: {
      facebook: String,
      twitter: String,
      instagram: String,
      linkedin: String,
      youtube: String
    }
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'pending'],
    default: 'active'
  }
}, {
  timestamps: true
})

// Create indexes for better query performance (slug already has unique index)
BrandSchema.index({ 'users.owner.email': 1 })
BrandSchema.index({ status: 1 })
BrandSchema.index({ createdAt: -1 })
BrandSchema.index({ name: 'text', description: 'text' })
// GMB integration indexes
BrandSchema.index({ 'settings.gmbIntegration.gmbAccountId': 1 })
BrandSchema.index({ 'settings.gmbIntegration.connected': 1 })

// Store Schema
const StoreSchema = new mongoose.Schema({
  // Basic Information
  brandId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Brand',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  storeCode: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  phone: {
    type: String,
    trim: true
  },

  // Address
  address: {
    line1: {
      type: String,
      required: true,
      trim: true
    },
    line2: {
      type: String,
      trim: true
    },
    locality: {
      type: String,
      required: true,
      trim: true
    },
    city: {
      type: String,
      required: true,
      trim: true
    },
    state: {
      type: String,
      required: true,
      trim: true
    },
    postalCode: {
      type: String,
      required: true,
      trim: true
    },
    countryCode: {
      type: String,
      required: true,
      trim: true,
      uppercase: true
    },
    latitude: Number,
    longitude: Number
  },

  // Business Information
  primaryCategory: {
    type: String,
    trim: true
  },
  additionalCategories: [{
    type: String,
    trim: true
  }],
  tags: [{
    type: String,
    trim: true
  }],

  // Hours of Operation
  hoursOfOperation: {
    monday: {
      isOpen: { type: Boolean, default: true },
      openTime: String,
      closeTime: String
    },
    tuesday: {
      isOpen: { type: Boolean, default: true },
      openTime: String,
      closeTime: String
    },
    wednesday: {
      isOpen: { type: Boolean, default: true },
      openTime: String,
      closeTime: String
    },
    thursday: {
      isOpen: { type: Boolean, default: true },
      openTime: String,
      closeTime: String
    },
    friday: {
      isOpen: { type: Boolean, default: true },
      openTime: String,
      closeTime: String
    },
    saturday: {
      isOpen: { type: Boolean, default: true },
      openTime: String,
      closeTime: String
    },
    sunday: {
      isOpen: { type: Boolean, default: false },
      openTime: String,
      closeTime: String
    }
  },

  // Amenities
  amenities: {
    parkingAvailable: {
      type: Boolean,
      default: false
    },
    deliveryOption: {
      type: Boolean,
      default: false
    }
  },

  // Microsite Content
  microsite: {
    tagline: {
      type: String,
      trim: true
    },
    gmbUrl: {
      type: String,
      trim: true
    },
    mapsUrl: {
      type: String,
      trim: true
    },
    heroImage: {
      url: String,
      key: String // S3 key for deletion
    },
    existingImages: [{
      url: String,
      key: String,
      caption: String
    }]
  },

  // Social Media & Website Links
  socialMedia: {
    website: {
      type: String,
      trim: true
    },
    facebook: {
      type: String,
      trim: true
    },
    instagram: {
      type: String,
      trim: true
    },
    twitter: {
      type: String,
      trim: true
    },
    yelp: {
      type: String,
      trim: true
    }
  },

  // SEO Metadata
  seo: {
    metaTitle: {
      type: String,
      trim: true
    },
    metaDescription: {
      type: String,
      trim: true
    },
    keywords: [{
      type: String,
      trim: true
    }]
  },

  // Google My Business Integration (Enhanced)
  gmbLocationId: {
    type: String,
    trim: true,
    unique: true,
    sparse: true // Allows multiple null values
  },
  gmbAccountId: {
    type: String,
    trim: true
  },
  placeId: {
    type: String,
    trim: true
  },
  verified: {
    type: Boolean,
    default: false
  },
  lastSyncAt: {
    type: Date
  },
  
  // Enhanced GMB Data with verification tracking
  gmbData: {
    // Basic GMB info
    verified: {
      type: Boolean,
      default: false
    },
    lastSyncAt: {
      type: Date
    },
    lastVerificationCheck: {
      type: Date
    },
    
    // Verification history tracking
    verificationHistory: [{
      verificationId: {
        type: String,
        trim: true
      },
      method: {
        type: String,
        enum: ['PHONE_CALL', 'POSTCARD', 'EMAIL', 'MANUAL', 'API_CHECK'],
        required: true
      },
      status: {
        type: String,
        enum: ['PENDING', 'COMPLETED', 'FAILED', 'CANCELLED', 'EXPIRED'],
        required: true
      },
      startedAt: {
        type: Date,
        required: true
      },
      completedAt: {
        type: Date
      },
      previousStatus: {
        type: Boolean
      },
      source: {
        type: String,
        enum: ['manual_verification', 'bulk_verification', 'api_start_verification', 'api_complete_verification', 'sync_check'],
        required: true
      },
      details: {
        phoneNumber: String,
        emailAddress: String,
        verificationCode: String,
        errorMessage: String,
        notes: String
      },
      createdAt: {
        type: Date,
        default: Date.now
      }
    }],
    
    // Voice of Merchant state
    voiceOfMerchantState: {
      complianceState: {
        type: String,
        enum: ['COMPLIANT', 'NON_COMPLIANT', 'UNKNOWN']
      },
      lastChecked: {
        type: Date
      }
    },
    
    // Additional GMB metadata
    metadata: {
      categories: [String],
      websiteUrl: String,
      phoneNumber: String,
      businessStatus: {
        type: String,
        enum: ['OPEN', 'CLOSED_PERMANENTLY', 'CLOSED_TEMPORARILY']
      },
      priceLevel: {
        type: String,
        enum: ['PRICE_LEVEL_UNSPECIFIED', 'PRICE_LEVEL_FREE', 'PRICE_LEVEL_INEXPENSIVE', 'PRICE_LEVEL_MODERATE', 'PRICE_LEVEL_EXPENSIVE', 'PRICE_LEVEL_VERY_EXPENSIVE']
      },
      primaryCategory: String,
      additionalCategories: [String]
    }
  },

  // Status
  status: {
    type: String,
    enum: ['active', 'inactive', 'draft'],
    default: 'active'
  },

  // Only Store flag - determines if we should show our microsite URL
  onlystore: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
})

// Create indexes for better query performance (storeCode, slug, gmbLocationId already have unique indexes)
StoreSchema.index({ brandId: 1 })
StoreSchema.index({ status: 1 })
StoreSchema.index({ createdAt: -1 })
StoreSchema.index({ name: 'text', 'address.city': 'text', 'address.state': 'text' })
// GMB specific indexes (enhanced)
StoreSchema.index({ gmbAccountId: 1 })
StoreSchema.index({ verified: 1 })
StoreSchema.index({ lastSyncAt: -1 })
StoreSchema.index({ 'gmbData.verified': 1 })
StoreSchema.index({ 'gmbData.lastVerificationCheck': -1 })
StoreSchema.index({ 'gmbData.verificationHistory.method': 1 })
StoreSchema.index({ 'gmbData.verificationHistory.status': 1 })

// Enquiry Schema
const EnquirySchema = new mongoose.Schema({
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
  phone: {
    type: String,
    trim: true
  },
  subject: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  enquiryType: {
    type: String,
    enum: ['general', 'product', 'service', 'complaint', 'feedback', 'partnership'],
    default: 'general'
  },
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
  storeName: {
    type: String,
    required: true
  },
  brandName: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['new', 'in-progress', 'resolved', 'closed'],
    default: 'new'
  },
  response: {
    type: String,
    trim: true
  },
  respondedAt: Date,
  respondedBy: String
}, {
  timestamps: true
})

// Create indexes for better query performance
EnquirySchema.index({ storeId: 1 })
EnquirySchema.index({ brandId: 1 })
EnquirySchema.index({ status: 1 })
EnquirySchema.index({ createdAt: -1 })
EnquirySchema.index({ email: 1 })

// Define TypeScript interfaces for better typing
export interface IBrand extends mongoose.Document {
  name: string
  slug: string
  description?: string
  logo?: {
    url?: string
    key?: string
  }
  website?: string
  email: string
  phone?: string
  industry?: string
  primaryCategory?: string
  additionalCategories?: string[]
  address: {
    line1: string
    line2?: string
    locality: string
    city: string
    state: string
    postalCode: string
    country: string
    latitude?: number
    longitude?: number
  }
  branding?: {
    primaryColor?: string
    accentColor?: string
    backgroundColor?: string
    fontFamily?: string
    template?: string
  }
  content?: {
    aboutSection?: string
    missionStatement?: string
    valueProposition?: string
  }
  products?: Array<{
    name: string
    category?: string
    price?: number
    description?: string
    image?: {
      url?: string
      key?: string
    }
  }>
  gallery?: Array<{
    url?: string
    key?: string
    caption?: string
  }>
  users: {
    owner: {
      email: string
      password: string
    }
    manager?: {
      email?: string
      password?: string
    }
  }
  settings?: {
    gmbIntegration?: {
      connected?: boolean
      autoSync?: boolean
      gmbAccountId?: string
      gmbAccountName?: string
      lastSyncAt?: Date
      gmbMetadata?: {
        totalLocations?: number
        totalReviews?: number
        totalPosts?: number
        totalInsights?: number
      }
    }
    notifications?: {
      reviews?: boolean
      posts?: boolean
    }
    seo?: {
      title?: string
      description?: string
      keywords?: string[]
    }
    socialMedia?: {
      facebook?: string
      twitter?: string
      instagram?: string
      linkedin?: string
      youtube?: string
    }
  }
  status: 'active' | 'inactive' | 'pending'
  createdAt: Date
  updatedAt: Date
}

export interface IStore extends mongoose.Document {
  brandId: mongoose.Types.ObjectId
  name: string
  storeCode: string
  slug: string
  email: string
  phone?: string
  address: {
    line1: string
    line2?: string
    locality: string
    city: string
    state: string
    postalCode: string
    countryCode: string
    latitude?: number
    longitude?: number
  }
  primaryCategory?: string
  additionalCategories?: string[]
  tags?: string[]
  hoursOfOperation?: {
    monday?: { isOpen?: boolean; openTime?: string; closeTime?: string }
    tuesday?: { isOpen?: boolean; openTime?: string; closeTime?: string }
    wednesday?: { isOpen?: boolean; openTime?: string; closeTime?: string }
    thursday?: { isOpen?: boolean; openTime?: string; closeTime?: string }
    friday?: { isOpen?: boolean; openTime?: string; closeTime?: string }
    saturday?: { isOpen?: boolean; openTime?: string; closeTime?: string }
    sunday?: { isOpen?: boolean; openTime?: string; closeTime?: string }
  }
  amenities?: {
    parkingAvailable?: boolean
    deliveryOption?: boolean
  }
  microsite?: {
    tagline?: string
    gmbUrl?: string
    mapsUrl?: string
    heroImage?: {
      url?: string
      key?: string
    }
    existingImages?: Array<{
      url?: string
      key?: string
      caption?: string
    }>
  }
  socialMedia?: {
    website?: string
    facebook?: string
    instagram?: string
    twitter?: string
    yelp?: string
  }
  seo?: {
    metaTitle?: string
    metaDescription?: string
    keywords?: string[]
  }
  gmbLocationId?: string
  gmbAccountId?: string
  placeId?: string
  verified?: boolean
  lastSyncAt?: Date
  onlystore?: boolean // Flag to determine if we should show our microsite URL
  
  // Enhanced GMB Data with verification tracking
  gmbData?: {
    verified?: boolean
    lastSyncAt?: Date
    lastVerificationCheck?: Date
    
    verificationHistory?: Array<{
      verificationId?: string
      method: 'PHONE_CALL' | 'POSTCARD' | 'EMAIL' | 'MANUAL' | 'API_CHECK'
      status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'EXPIRED'
      startedAt: Date
      completedAt?: Date
      previousStatus?: boolean
      source: 'manual_verification' | 'bulk_verification' | 'api_start_verification' | 'api_complete_verification' | 'sync_check'
      details?: {
        phoneNumber?: string
        emailAddress?: string
        verificationCode?: string
        errorMessage?: string
        notes?: string
      }
      createdAt?: Date
    }>
    
    voiceOfMerchantState?: {
      complianceState?: 'COMPLIANT' | 'NON_COMPLIANT' | 'UNKNOWN'
      lastChecked?: Date
    }
    
    metadata?: {
      categories?: string[]
      websiteUrl?: string
      phoneNumber?: string
      businessStatus?: 'OPEN' | 'CLOSED_PERMANENTLY' | 'CLOSED_TEMPORARILY'
      priceLevel?: 'PRICE_LEVEL_UNSPECIFIED' | 'PRICE_LEVEL_FREE' | 'PRICE_LEVEL_INEXPENSIVE' | 'PRICE_LEVEL_MODERATE' | 'PRICE_LEVEL_EXPENSIVE' | 'PRICE_LEVEL_VERY_EXPENSIVE'
      primaryCategory?: string
      additionalCategories?: string[]
    }
  }
  
  status: 'active' | 'inactive' | 'draft'
  createdAt: Date
  updatedAt: Date
}

export interface IEnquiry extends mongoose.Document {
  name: string
  email: string
  phone?: string
  subject: string
  message: string
  enquiryType: 'general' | 'product' | 'service' | 'complaint' | 'feedback' | 'partnership'
  storeId: mongoose.Types.ObjectId
  brandId: mongoose.Types.ObjectId
  storeName: string
  brandName: string
  status: 'new' | 'in-progress' | 'resolved' | 'closed'
  response?: string
  respondedAt?: Date
  respondedBy?: string
  createdAt: Date
  updatedAt: Date
}

export interface IReview extends mongoose.Document {
  gmbReviewId: string
  storeId: mongoose.Types.ObjectId
  brandId: mongoose.Types.ObjectId
  accountId: string
  reviewer: {
    displayName: string
    profilePhotoUrl?: string
    isAnonymous?: boolean
  }
  starRating: number
  comment?: string
  gmbCreateTime: Date
  gmbUpdateTime: Date
  hasResponse?: boolean
  response?: {
    comment?: string
    responseTime?: Date
    respondedBy?: string
  }
  status: 'active' | 'hidden' | 'deleted'
  source: 'gmb' | 'manual' | 'imported'
  helpfulCount?: number
  reportedCount?: number
  createdAt: Date
  updatedAt: Date
}

export interface IPost extends mongoose.Document {
  gmbPostId: string
  storeId: mongoose.Types.ObjectId
  brandId: mongoose.Types.ObjectId
  accountId: string
  summary?: string
  callToAction?: {
    actionType?: 'BOOK' | 'ORDER_ONLINE' | 'SHOP' | 'LEARN_MORE' | 'SIGN_UP' | 'GET_OFFER' | 'CALL'
    url?: string
  }
  media?: Array<{
    mediaFormat?: 'PHOTO' | 'VIDEO'
    sourceUrl?: string
    thumbnailUrl?: string
  }>
  gmbCreateTime: Date
  gmbUpdateTime: Date
  languageCode?: string
  state: 'LIVE' | 'DRAFT' | 'EXPIRED'
  topicType?: 'STANDARD' | 'EVENT' | 'OFFER' | 'PRODUCT'
  event?: {
    title?: string
    schedule?: {
      startDate?: {
        year?: number
        month?: number
        day?: number
      }
      startTime?: unknown
      endDate?: {
        year?: number
        month?: number
        day?: number
      }
      endTime?: {
        hours?: number
        minutes?: number
        seconds?: number
      }
    }
  }
  searchUrl?: string
  viewCount?: number
  clickCount?: number
  status: 'active' | 'archived' | 'deleted'
  source: 'gmb' | 'manual' | 'imported'
  createdAt: Date
  updatedAt: Date
}

export interface IPerformance extends mongoose.Document {
  storeId: mongoose.Types.ObjectId
  brandId: mongoose.Types.ObjectId
  accountId: string
  period: {
    startTime: Date
    endTime: Date
    periodType: 'daily' | 'weekly' | 'monthly' | 'custom'
    dateRange?: {
      days?: number
      label?: string
      startDate?: string
      endDate?: string
    }
  }
  queries?: number
  views?: number
  actions?: number
  photoViews?: number
  callClicks?: number
  websiteClicks?: number
  directionRequests?: number
  businessBookings?: number
  businessFoodOrders?: number
  businessMessages?: number
  desktopSearchImpressions?: number
  mobileMapsImpressions?: number
  conversionRate?: number
  clickThroughRate?: number
  source: 'gmb' | 'manual' | 'calculated'
  status: 'active' | 'archived'
  createdAt: Date
  updatedAt: Date
}

export interface ISearchKeyword extends mongoose.Document {
  storeId: mongoose.Types.ObjectId
  brandId: mongoose.Types.ObjectId
  accountId: string
  keyword: string
  period: {
    year: number
    month: number
  }
  impressions: number
  clicks?: number
  ctr?: number
  position?: number
  source: 'gmb' | 'manual' | 'imported'
  status: 'active' | 'archived'
  createdAt: Date
  updatedAt: Date
}

export interface IIVRCall extends mongoose.Document {
  brandId: mongoose.Types.ObjectId
  storeId?: mongoose.Types.ObjectId
  customerName?: string
  customerNumber?: string
  publisherType?: string
  leadType?: string
  storeIdentifier?: string
  storeName?: string
  location?: string
  callStartTime: Date
  callEndTime: Date
  callStatus: string
  callType?: string
  virtualNumber?: string
  callRecordingUrl?: string
  duration?: number
  conversationDuration?: number
  ringDuration?: number
  status: 'active' | 'archived' | 'deleted'
  createdAt: Date
  updatedAt: Date
}

// Export models with proper typing
export const Brand = (mongoose.models.Brand as mongoose.Model<IBrand>) || mongoose.model<IBrand>('Brand', BrandSchema)
export const Store = (mongoose.models.Store as mongoose.Model<IStore>) || mongoose.model<IStore>('Store', StoreSchema)
export const Enquiry = (mongoose.models.Enquiry as mongoose.Model<IEnquiry>) || mongoose.model<IEnquiry>('Enquiry', EnquirySchema)

// New separate models for better data organization
export const Review = (mongoose.models.Review as mongoose.Model<IReview>) || mongoose.model<IReview>('Review', ReviewSchema)
export const Post = (mongoose.models.Post as mongoose.Model<IPost>) || mongoose.model<IPost>('Post', PostSchema)
export const Performance = (mongoose.models.Performance as mongoose.Model<IPerformance>) || mongoose.model<IPerformance>('Performance', PerformanceSchema)
export const SearchKeyword = (mongoose.models.SearchKeyword as mongoose.Model<ISearchKeyword>) || mongoose.model<ISearchKeyword>('SearchKeyword', SearchKeywordSchema)
export const IVRCall = (mongoose.models.IVRCall as mongoose.Model<IIVRCall>) || mongoose.model<IIVRCall>('IVRCall', IVRCallSchema)

