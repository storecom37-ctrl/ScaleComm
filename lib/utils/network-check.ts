/**
 * Network connectivity utilities
 */

export async function checkNetworkConnectivity(): Promise<boolean> {
  try {
    // Try to fetch a simple endpoint to check connectivity
    const response = await fetch('/api/health', {
      method: 'HEAD',
      cache: 'no-cache',
      signal: AbortSignal.timeout(5000) // 5 second timeout
    })
    return response.ok
  } catch (error) {
    console.warn('Network connectivity check failed:', error)
    return false
  }
}

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error
      
      if (attempt === maxRetries) {
        throw lastError
      }

      // Exponential backoff with jitter
      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000
    
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw lastError!
}

export function isNetworkError(error: any): boolean {
  return (
    error instanceof TypeError ||
    error?.message?.includes('Failed to fetch') ||
    error?.message?.includes('NetworkError') ||
    error?.message?.includes('ERR_NETWORK_IO_SUSPENDED')
  )
}
