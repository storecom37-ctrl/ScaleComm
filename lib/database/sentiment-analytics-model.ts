import mongoose from 'mongoose'

// Sentiment Analytics Schema
const SentimentAnalyticsSchema = new mongoose.Schema({
  entityId: {
    type: String,
    required: true,
    index: true
  },
  entityType: {
    type: String,
    enum: ['brand', 'store'],
    required: true,
    index: true
  },
  lastAnalyzed: {
    type: Date,
    default: Date.now,
    index: true
  },
  processingStats: {
    totalReviews: { type: Number, default: 0 },
    processedInThisRun: { type: Number, default: 0 },
    remainingToProcess: { type: Number, default: 0 },
    processingComplete: { type: Boolean, default: true },
    lastProcessedAt: { type: Date, default: Date.now }
  },
  overallSentiment: {
    type: String,
    enum: ['positive', 'negative', 'neutral'],
    required: true
  },
  overallConfidence: {
    type: Number,
    min: 0,
    max: 1,
    required: true
  },
  overallScore: {
    type: Number,
    min: -1,
    max: 1,
    required: true
  },
  overallTrend: {
    type: String,
    enum: ['improving', 'declining', 'stable', 'new'],
    required: true
  },
  periods: {
    '7d': {
      total: { type: Number, default: 0 },
      positive: { type: Number, default: 0 },
      negative: { type: Number, default: 0 },
      neutral: { type: Number, default: 0 },
      percentages: {
        positive: { type: Number, default: 0 },
        negative: { type: Number, default: 0 },
        neutral: { type: Number, default: 0 }
      },
      averageScore: { type: Number, default: 0 }
    },
    '30d': {
      total: { type: Number, default: 0 },
      positive: { type: Number, default: 0 },
      negative: { type: Number, default: 0 },
      neutral: { type: Number, default: 0 },
      percentages: {
        positive: { type: Number, default: 0 },
        negative: { type: Number, default: 0 },
        neutral: { type: Number, default: 0 }
      },
      averageScore: { type: Number, default: 0 }
    },
    '60d': {
      total: { type: Number, default: 0 },
      positive: { type: Number, default: 0 },
      negative: { type: Number, default: 0 },
      neutral: { type: Number, default: 0 },
      percentages: {
        positive: { type: Number, default: 0 },
        negative: { type: Number, default: 0 },
        neutral: { type: Number, default: 0 }
      },
      averageScore: { type: Number, default: 0 }
    },
    '90d': {
      total: { type: Number, default: 0 },
      positive: { type: Number, default: 0 },
      negative: { type: Number, default: 0 },
      neutral: { type: Number, default: 0 },
      percentages: {
        positive: { type: Number, default: 0 },
        negative: { type: Number, default: 0 },
        neutral: { type: Number, default: 0 }
      },
      averageScore: { type: Number, default: 0 }
    }
  },
  topPositiveThemes: [String],
  topNegativeThemes: [String],
  recommendations: [String],
  // Metadata
  totalReviewsAnalyzed: { type: Number, default: 0 },
  lastReviewDate: Date,
  analysisVersion: { type: String, default: '1.0' }
}, {
  timestamps: true
})

// Create compound index for efficient queries
SentimentAnalyticsSchema.index({ entityId: 1, entityType: 1 }, { unique: true })
SentimentAnalyticsSchema.index({ lastAnalyzed: -1 })
SentimentAnalyticsSchema.index({ overallSentiment: 1 })

export const SentimentAnalytics = mongoose.models.SentimentAnalytics || mongoose.model('SentimentAnalytics', SentimentAnalyticsSchema)
