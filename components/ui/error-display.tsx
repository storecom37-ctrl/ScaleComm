"use client"

import { AlertCircle, X, CheckCircle, Info, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"

interface ErrorDisplayProps {
  type?: 'error' | 'warning' | 'success' | 'info'
  title?: string
  message: string
  onDismiss?: () => void
  className?: string
  showIcon?: boolean
}

export function ErrorDisplay({ 
  type = 'error', 
  title, 
  message, 
  onDismiss, 
  className,
  showIcon = true 
}: ErrorDisplayProps) {
  const getIcon = () => {
    if (!showIcon) return null
    
    switch (type) {
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'info':
        return <Info className="h-5 w-5 text-blue-500" />
      default:
        return <AlertCircle className="h-5 w-5 text-red-500" />
    }
  }

  const getStyles = () => {
    switch (type) {
      case 'error':
        return {
          container: "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800",
          title: "text-red-800 dark:text-red-200",
          message: "text-red-700 dark:text-red-300"
        }
      case 'warning':
        return {
          container: "bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800",
          title: "text-yellow-800 dark:text-yellow-200",
          message: "text-yellow-700 dark:text-yellow-300"
        }
      case 'success':
        return {
          container: "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800",
          title: "text-green-800 dark:text-green-200",
          message: "text-green-700 dark:text-green-300"
        }
      case 'info':
        return {
          container: "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800",
          title: "text-blue-800 dark:text-blue-200",
          message: "text-blue-700 dark:text-blue-300"
        }
      default:
        return {
          container: "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800",
          title: "text-red-800 dark:text-red-200",
          message: "text-red-700 dark:text-red-300"
        }
    }
  }

  const styles = getStyles()

  return (
    <div className={cn(
      "rounded-lg border p-4",
      styles.container,
      className
    )}>
      <div className="flex items-start">
        {getIcon()}
        <div className="ml-3 flex-1">
          {title && (
            <h3 className={cn("text-sm font-medium", styles.title)}>
              {title}
            </h3>
          )}
          <div className={cn("text-sm", styles.message, title && "mt-1")}>
            {message}
          </div>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="ml-3 flex-shrink-0 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  )
}

interface FieldErrorProps {
  error?: string
  className?: string
}

export function FieldError({ error, className }: FieldErrorProps) {
  if (!error) return null

  return (
    <div className={cn("flex items-center gap-1 mt-1", className)}>
      <AlertCircle className="h-3 w-3 text-red-500" />
      <span className="text-xs text-red-600 dark:text-red-400">{error}</span>
    </div>
  )
}

interface ValidationErrorsProps {
  errors: Record<string, string>
  className?: string
}

export function ValidationErrors({ errors, className }: ValidationErrorsProps) {
  const errorEntries = Object.entries(errors).filter(([_, message]) => message)
  
  if (errorEntries.length === 0) return null

  return (
    <div className={cn("space-y-2", className)}>
      {errorEntries.map(([field, message]) => (
        <div key={field} className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
          <AlertCircle className="h-3 w-3 flex-shrink-0" />
          <span className="capitalize">{field.replace(/([A-Z])/g, ' $1').trim()}:</span>
          <span>{message}</span>
        </div>
      ))}
    </div>
  )
}
