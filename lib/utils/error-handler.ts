// Error handling utilities for GMB API and database operations

export interface ErrorInfo {
  code: string
  message: string
  isRetryable: boolean
  category: 'api' | 'database' | 'network' | 'validation' | 'unknown'
  severity: 'low' | 'medium' | 'high' | 'critical'
}

export class GmbErrorHandler {
  static classifyError(error: any): ErrorInfo {
    // Network/timeout errors
    if (error.name === 'AbortError' || error.name === 'TimeoutError') {
      return {
        code: 'TIMEOUT',
        message: 'Request timed out',
        isRetryable: true,
        category: 'network',
        severity: 'medium'
      }
    }

    // HTTP errors
    if (error.message?.includes('HTTP error')) {
      const status = this.extractHttpStatus(error.message)
      
      switch (status) {
        case 400:
          return {
            code: 'BAD_REQUEST',
            message: 'Invalid request parameters',
            isRetryable: false,
            category: 'api',
            severity: 'medium'
          }
        case 401:
          return {
            code: 'UNAUTHORIZED',
            message: 'Authentication failed',
            isRetryable: false,
            category: 'api',
            severity: 'high'
          }
        case 403:
          return {
            code: 'PERMISSION_DENIED',
            message: 'API access not available for this account',
            isRetryable: false,
            category: 'api',
            severity: 'low' // Common for GMB APIs
          }
        case 404:
          return {
            code: 'NOT_FOUND',
            message: 'API endpoint not found',
            isRetryable: false,
            category: 'api',
            severity: 'low'
          }
        case 408:
        case 429:
          return {
            code: status === 408 ? 'REQUEST_TIMEOUT' : 'RATE_LIMITED',
            message: status === 408 ? 'Request timeout' : 'Rate limit exceeded',
            isRetryable: true,
            category: 'api',
            severity: 'medium'
          }
        case 500:
        case 502:
        case 503:
        case 504:
          return {
            code: 'SERVER_ERROR',
            message: 'Server error',
            isRetryable: true,
            category: 'api',
            severity: 'high'
          }
        default:
          return {
            code: 'UNKNOWN_HTTP_ERROR',
            message: `HTTP ${status} error`,
            isRetryable: status >= 500,
            category: 'api',
            severity: 'medium'
          }
      }
    }

    // Database errors
    if (error.code === 11000) {
      return {
        code: 'DUPLICATE_KEY',
        message: 'Duplicate key error',
        isRetryable: false,
        category: 'database',
        severity: 'low'
      }
    }

    if (error.name === 'MongoError' || error.name === 'MongoServerError') {
      return {
        code: 'DATABASE_ERROR',
        message: 'Database operation failed',
        isRetryable: true,
        category: 'database',
        severity: 'high'
      }
    }

    // Connection errors
    if (error.message?.includes('ECONNREFUSED') || error.message?.includes('ENOTFOUND')) {
      return {
        code: 'CONNECTION_ERROR',
        message: 'Connection failed',
        isRetryable: true,
        category: 'network',
        severity: 'high'
      }
    }

    // Validation errors
    if (error.message?.includes('Invalid') || error.message?.includes('required')) {
      return {
        code: 'VALIDATION_ERROR',
        message: 'Data validation failed',
        isRetryable: false,
        category: 'validation',
        severity: 'medium'
      }
    }

    // Default unknown error
    return {
      code: 'UNKNOWN_ERROR',
      message: error.message || 'Unknown error occurred',
      isRetryable: false,
      category: 'unknown',
      severity: 'medium'
    }
  }

  private static extractHttpStatus(message: string): number {
    const match = message.match(/HTTP\s+(\d+)/i)
    return match ? parseInt(match[1]) : 0
  }

  static shouldRetry(error: any, retryCount: number, maxRetries: number): boolean {
    const errorInfo = this.classifyError(error)
    return errorInfo.isRetryable && retryCount < maxRetries
  }

  static getRetryDelay(retryCount: number, baseDelay = 1000): number {
    // Exponential backoff with jitter
    const exponentialDelay = baseDelay * Math.pow(2, retryCount)
    const jitter = Math.random() * 0.1 * exponentialDelay
    return Math.min(exponentialDelay + jitter, 30000) // Max 30 seconds
  }

  static formatErrorForUser(error: any): string {
    const errorInfo = this.classifyError(error)
    
    switch (errorInfo.category) {
      case 'api':
        if (errorInfo.code === 'PERMISSION_DENIED') {
          return 'This Google My Business API feature is not available for your account type. This is common and expected.'
        }
        if (errorInfo.code === 'NOT_FOUND') {
          return 'The requested API endpoint is not available. Some features may not be enabled for your Google Cloud project.'
        }
        return `API Error: ${errorInfo.message}`
      
      case 'database':
        if (errorInfo.code === 'DUPLICATE_KEY') {
          return 'Data already exists in the database. This is normal during sync operations.'
        }
        return 'Database operation failed. Data may not have been saved properly.'
      
      case 'network':
        return 'Network connection issue. The operation will be retried automatically.'
      
      case 'validation':
        return 'Invalid data format. Please check your input.'
      
      default:
        return errorInfo.message
    }
  }

  static logError(error: any, context: string): void {
    const errorInfo = this.classifyError(error)
    const emoji = this.getSeverityEmoji(errorInfo.severity)
    
    console.error(`${emoji} [${context}] ${errorInfo.category.toUpperCase()}_${errorInfo.code}:`, errorInfo.message)
    
    if (errorInfo.severity === 'critical') {
      console.error('Stack trace:', error.stack)
    }
  }

  private static getSeverityEmoji(severity: string): string {
    switch (severity) {
      case 'low': return '⚠️'
      case 'medium': return '❌'
      case 'high': return '🔥'
      case 'critical': return '💥'
      default: return '❌'
    }
  }
}

