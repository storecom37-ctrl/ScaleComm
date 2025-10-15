import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format large numbers with appropriate abbreviations and responsive design
 * @param num - The number to format
 * @param options - Formatting options
 * @returns Formatted number string
 */
export function formatLargeNumber(
  num: number | string | null | undefined,
  options: {
    compact?: boolean // Use K, M, B abbreviations
    decimals?: number // Number of decimal places
    fallback?: string // Fallback text for invalid numbers
    maxLength?: number // Maximum character length before using compact format
  } = {}
): string {
  const {
    compact = true,
    decimals = 1,
    fallback = "—",
    maxLength = 8
  } = options

  // Handle invalid inputs
  if (num === null || num === undefined || num === "" || isNaN(Number(num))) {
    return fallback
  }

  const number = typeof num === 'string' ? parseFloat(num) : num

  // Handle zero
  if (number === 0) {
    return "0"
  }

  // For very small numbers, show as is
  if (Math.abs(number) < 0.01) {
    return number.toFixed(4)
  }

  // Use Intl compact formatting for extremely large numbers or scientific notation
  const numStr = String(number)
  if (numStr.includes('e') || Math.abs(number) >= 1e12) {
    try {
      return new Intl.NumberFormat('en-US', {
        notation: 'compact',
        maximumFractionDigits: 1
      }).format(number)
    } catch (_) {
      // Fallback to custom compact below
    }
  }

  // If compact mode is disabled or number is small enough, use locale formatting
  if (!compact || Math.abs(number) < 1000) {
    const formatted = number.toLocaleString()
    return formatted.length <= maxLength ? formatted : formatCompactNumber(number, decimals)
  }

  // Use compact formatting for large numbers
  return formatCompactNumber(number, decimals)
}

/**
 * Format number with K, M, B abbreviations
 */
function formatCompactNumber(num: number, decimals: number): string {
  const absNum = Math.abs(num)
  const sign = num < 0 ? "-" : ""

  if (absNum >= 1e9) {
    return `${sign}${(absNum / 1e9).toFixed(decimals)}B`
  } else if (absNum >= 1e6) {
    return `${sign}${(absNum / 1e6).toFixed(decimals)}M`
  } else if (absNum >= 1e3) {
    return `${sign}${(absNum / 1e3).toFixed(decimals)}K`
  } else {
    return num.toString()
  }
}

/**
 * Format percentage with proper handling of edge cases
 */
export function formatPercentage(
  num: number | string | null | undefined,
  decimals: number = 1,
  fallback: string = "—"
): string {
  if (num === null || num === undefined || num === "" || isNaN(Number(num))) {
    return fallback
  }

  const number = typeof num === 'string' ? parseFloat(num) : num
  
  // Handle very small percentages
  if (Math.abs(number) < 0.001) {
    return "0%"
  }

  // Handle percentages that are already in decimal form (0-1)
  if (Math.abs(number) <= 1) {
    return `${(number * 100).toFixed(decimals)}%`
  }

  // Handle percentages that are already in percentage form (0-100)
  return `${number.toFixed(decimals)}%`
}

/**
 * Format currency with proper handling of large amounts
 */
export function formatCurrency(
  num: number | string | null | undefined,
  currency: string = "USD",
  fallback: string = "—"
): string {
  if (num === null || num === undefined || num === "" || isNaN(Number(num))) {
    return fallback
  }

  const number = typeof num === 'string' ? parseFloat(num) : num

  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(number)
  } catch (error) {
    return formatLargeNumber(number, { compact: true, decimals: 2 })
  }
}

/**
 * Get responsive text size class based on number length
 */
export function getResponsiveTextSize(num: string | number): string {
  const str = typeof num === 'number' ? num.toString() : num
  const length = str.length

  if (length <= 6) return "text-2xl"
  if (length <= 8) return "text-xl"
  if (length <= 10) return "text-lg"
  if (length <= 12) return "text-base"
  return "text-sm"
}

/**
 * Truncate text with ellipsis for very long numbers
 */
export function truncateNumber(
  num: string | number,
  maxLength: number = 12
): string {
  const str = typeof num === 'number' ? num.toString() : num
  if (str.length <= maxLength) return str
  return str.substring(0, maxLength - 3) + "..."
}
