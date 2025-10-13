// Utility functions for processing and validating performance data

export interface RawPerformanceData {
  locationId: string
  period: {
    startTime: string
    endTime: string
  }
  queries?: number
  views?: number
  actions?: number
  photoViews?: number
  callClicks?: number
  websiteClicks?: number
  dailyMetrics?: Array<{
    locationId: string
    date: { year: number; month: number; day: number }
    metrics: {
      [key: string]: number
    }
  }>
  websiteClicksSeries?: any
  callClicksSeries?: any
}

export interface ProcessedPerformanceData {
  locationId: string
  period: {
    startTime: Date
    endTime: Date
    periodType: string
  }
  queries: number
  views: number
  actions: number
  photoViews: number
  callClicks: number
  websiteClicks: number
  businessBookings: number
  businessFoodOrders: number
  businessMessages: number
  desktopSearchImpressions: number
  mobileMapsImpressions: number
  conversionRate: number
  clickThroughRate: number
  dataQuality: {
    hasRealData: boolean
    dataSource: string
    confidence: number
    issues: string[]
  }
}

export class PerformanceDataProcessor {
  static processRawData(rawData: RawPerformanceData): ProcessedPerformanceData {
    const issues: string[] = []
    
    // Basic metrics extraction with validation
    const queries = Math.max(0, rawData.queries || 0)
    const views = Math.max(0, rawData.views || 0)
    let actions = Math.max(0, rawData.actions || 0)
    const photoViews = Math.max(0, rawData.photoViews || 0)
    let callClicks = Math.max(0, rawData.callClicks || 0)
    let websiteClicks = Math.max(0, rawData.websiteClicks || 0)
    
    // Extract additional metrics from daily data
    let businessBookings = 0
    let businessFoodOrders = 0
    let businessMessages = 0
    let desktopSearchImpressions = 0
    let mobileMapsImpressions = 0
    
    // If we have daily metrics, aggregate them properly
    if (rawData.dailyMetrics && rawData.dailyMetrics.length > 0) {
      // Reset the main metrics to 0 and recalculate from daily data
      callClicks = 0
      websiteClicks = 0
      
      rawData.dailyMetrics.forEach(dailyMetric => {
        if (dailyMetric.metrics) {
          // Safely parse and validate each metric value
          const dailyCallClicks = Math.max(0, parseInt(String(dailyMetric.metrics.callClicks || 0)) || 0)
          const dailyWebsiteClicks = Math.max(0, parseInt(String(dailyMetric.metrics.websiteClicks || 0)) || 0)
          const dailyBusinessBookings = Math.max(0, parseInt(String(dailyMetric.metrics.businessBookings || 0)) || 0)
          const dailyBusinessFoodOrders = Math.max(0, parseInt(String(dailyMetric.metrics.businessFoodOrders || 0)) || 0)
          const dailyBusinessMessages = Math.max(0, parseInt(String(dailyMetric.metrics.businessMessages || 0)) || 0)
          const dailyDesktopSearchImpressions = Math.max(0, parseInt(String(dailyMetric.metrics.desktopSearchImpressions || 0)) || 0)
          const dailyMobileMapsImpressions = Math.max(0, parseInt(String(dailyMetric.metrics.mobileMapsImpressions || 0)) || 0)
          
          callClicks += dailyCallClicks
          websiteClicks += dailyWebsiteClicks
          businessBookings += dailyBusinessBookings
          businessFoodOrders += dailyBusinessFoodOrders
          businessMessages += dailyBusinessMessages
          desktopSearchImpressions += dailyDesktopSearchImpressions
          mobileMapsImpressions += dailyMobileMapsImpressions
        }
      })
      
      issues.push('Metrics aggregated from daily data')
    }
    
    // Calculate total views from impressions if not already provided
    const calculatedViews = desktopSearchImpressions + mobileMapsImpressions
    const finalViews = views > 0 ? views : calculatedViews
    
    // Data validation and correction
    const totalDirectActions = callClicks + websiteClicks
    
    // Validate for extreme values that might indicate data corruption
    const MAX_REASONABLE_VALUE = 1000000 // 1 million
    if (callClicks > MAX_REASONABLE_VALUE || websiteClicks > MAX_REASONABLE_VALUE || 
        actions > MAX_REASONABLE_VALUE || finalViews > MAX_REASONABLE_VALUE) {
      issues.push('Extreme values detected - possible data corruption')
      // Cap the values to prevent database issues
      callClicks = Math.min(callClicks, MAX_REASONABLE_VALUE)
      websiteClicks = Math.min(websiteClicks, MAX_REASONABLE_VALUE)
      actions = Math.min(actions, MAX_REASONABLE_VALUE)
    }
    
    // If actions is 0 but we have individual action counts, recalculate
    if (actions === 0 && totalDirectActions > 0) {
      actions = totalDirectActions
      issues.push('Actions recalculated from individual action metrics')
    }
    
    // Validate data consistency
    if (actions > finalViews && finalViews > 0) {
      issues.push('Actions exceed views - possible data inconsistency')
    }
    
    if (totalDirectActions > actions && actions > 0) {
      issues.push('Individual actions exceed total actions')
    }
    
    // Calculate conversion rates
    const conversionRate = finalViews > 0 ? (actions / finalViews) * 100 : 0
    const clickThroughRate = finalViews > 0 ? (totalDirectActions / finalViews) * 100 : 0
    
    // Determine data quality
    const hasRealData = queries > 0 || finalViews > 0 || actions > 0 || totalDirectActions > 0 || desktopSearchImpressions > 0 || mobileMapsImpressions > 0
    let dataSource = 'api'
    let confidence = 1.0
    
    if (!hasRealData) {
      dataSource = 'fallback'
      confidence = 0.1
      issues.push('No meaningful data - using zero values')
    } else if (rawData.dailyMetrics && rawData.dailyMetrics.length > 0) {
      dataSource = 'multi-daily-metrics'
      confidence = 0.9
      if (desktopSearchImpressions > 0 || mobileMapsImpressions > 0) {
        issues.push('Views calculated from impression metrics')
      }
    } else if (rawData.websiteClicksSeries || rawData.callClicksSeries) {
      dataSource = 'time-series'
      confidence = 0.8
    } else {
      confidence = 0.7
    }
    
    // Validate period
    const startTime = new Date(rawData.period.startTime)
    const endTime = new Date(rawData.period.endTime)
    
    if (startTime >= endTime) {
      issues.push('Invalid period - start time not before end time')
    }
    
    const periodDays = Math.ceil((endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60 * 24))
    const periodType = periodDays <= 1 ? 'daily' : periodDays <= 7 ? 'weekly' : periodDays <= 31 ? 'monthly' : 'custom'
    
    return {
      locationId: rawData.locationId,
      period: {
        startTime,
        endTime,
        periodType
      },
      queries,
      views: finalViews,
      actions,
      photoViews,
      callClicks,
      websiteClicks,
      businessBookings,
      businessFoodOrders,
      businessMessages,
      desktopSearchImpressions,
      mobileMapsImpressions,
      conversionRate: Math.round(conversionRate * 100) / 100,
      clickThroughRate: Math.round(clickThroughRate * 100) / 100,
      dataQuality: {
        hasRealData,
        dataSource,
        confidence,
        issues
      }
    }
  }
  
  static validatePerformanceData(data: ProcessedPerformanceData): {
    isValid: boolean
    errors: string[]
    warnings: string[]
  } {
    const errors: string[] = []
    const warnings: string[] = []
    
    // Required field validation
    if (!data.locationId) {
      errors.push('Missing locationId')
    }
    
    if (!data.period.startTime || !data.period.endTime) {
      errors.push('Missing period information')
    }
    
    // Data range validation
    if (data.queries < 0 || data.views < 0 || data.actions < 0) {
      errors.push('Negative values not allowed for core metrics')
    }
    
    if (data.conversionRate < 0 || data.conversionRate > 100) {
      warnings.push('Conversion rate outside expected range (0-100%)')
    }
    
    if (data.clickThroughRate < 0 || data.clickThroughRate > 100) {
      warnings.push('Click-through rate outside expected range (0-100%)')
    }
    
    // Business logic validation
    if (data.actions > data.views && data.views > 0) {
      warnings.push('Actions exceed views - unusual but possible')
    }
    
    const totalClicks = data.callClicks + data.websiteClicks
    if (totalClicks > data.actions && data.actions > 0) {
      warnings.push('Individual action counts exceed total actions')
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }
  
  static aggregatePerformanceData(dataPoints: ProcessedPerformanceData[]): {
    totals: Omit<ProcessedPerformanceData, 'locationId' | 'period' | 'dataQuality'>
    averages: {
      conversionRate: number
      clickThroughRate: number
    }
    summary: {
      totalRecords: number
      recordsWithData: number
      dateRange: {
        start: Date
        end: Date
      }
      dataQuality: {
        averageConfidence: number
        commonIssues: string[]
      }
    }
  } {
    if (dataPoints.length === 0) {
      throw new Error('No data points provided for aggregation')
    }
    
    // Calculate totals
    const totals = dataPoints.reduce((acc, data) => ({
      queries: acc.queries + data.queries,
      views: acc.views + data.views,
      actions: acc.actions + data.actions,
      photoViews: acc.photoViews + data.photoViews,
      callClicks: acc.callClicks + data.callClicks,
      websiteClicks: acc.websiteClicks + data.websiteClicks,
      businessBookings: acc.businessBookings + data.businessBookings,
      businessFoodOrders: acc.businessFoodOrders + data.businessFoodOrders,
      businessMessages: acc.businessMessages + data.businessMessages,
      desktopSearchImpressions: acc.desktopSearchImpressions + data.desktopSearchImpressions,
      mobileMapsImpressions: acc.mobileMapsImpressions + data.mobileMapsImpressions,
      conversionRate: 0, // Will be calculated below
      clickThroughRate: 0 // Will be calculated below
    }), {
      queries: 0, views: 0, actions: 0, photoViews: 0,
      callClicks: 0, websiteClicks: 0,
      businessBookings: 0, businessFoodOrders: 0, businessMessages: 0,
      desktopSearchImpressions: 0, mobileMapsImpressions: 0,
      conversionRate: 0, clickThroughRate: 0
    })
    
    // Calculate aggregated rates
    totals.conversionRate = totals.views > 0 ? (totals.actions / totals.views) * 100 : 0
    totals.clickThroughRate = totals.views > 0 ? 
      ((totals.callClicks + totals.websiteClicks) / totals.views) * 100 : 0
    
    // Calculate averages
    const validRates = dataPoints.filter(d => d.views > 0)
    const averages = {
      conversionRate: validRates.length > 0 ? 
        validRates.reduce((sum, d) => sum + d.conversionRate, 0) / validRates.length : 0,
      clickThroughRate: validRates.length > 0 ? 
        validRates.reduce((sum, d) => sum + d.clickThroughRate, 0) / validRates.length : 0
    }
    
    // Summary statistics
    const recordsWithData = dataPoints.filter(d => d.dataQuality.hasRealData).length
    const dates = dataPoints.map(d => d.period.startTime).concat(dataPoints.map(d => d.period.endTime))
    const allIssues = dataPoints.flatMap(d => d.dataQuality.issues)
    const issueFrequency = allIssues.reduce((acc, issue) => {
      acc[issue] = (acc[issue] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    const commonIssues = Object.entries(issueFrequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([issue]) => issue)
    
    return {
      totals: {
        ...totals,
        conversionRate: Math.round(totals.conversionRate * 100) / 100,
        clickThroughRate: Math.round(totals.clickThroughRate * 100) / 100
      },
      averages: {
        conversionRate: Math.round(averages.conversionRate * 100) / 100,
        clickThroughRate: Math.round(averages.clickThroughRate * 100) / 100
      },
      summary: {
        totalRecords: dataPoints.length,
        recordsWithData,
        dateRange: {
          start: new Date(Math.min(...dates.map(d => d.getTime()))),
          end: new Date(Math.max(...dates.map(d => d.getTime())))
        },
        dataQuality: {
          averageConfidence: dataPoints.reduce((sum, d) => sum + d.dataQuality.confidence, 0) / dataPoints.length,
          commonIssues
        }
      }
    }
  }
}

