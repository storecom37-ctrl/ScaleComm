"use client"

import { useState, useEffect } from "react"
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"

export interface Toast {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title?: string
  message: string
  duration?: number
}

interface ToastProps {
  toast: Toast
  onRemove: (id: string) => void
}

function ToastComponent({ toast, onRemove }: ToastProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isLeaving, setIsLeaving] = useState(false)

  useEffect(() => {
    setIsVisible(true)
    
    if (toast.duration !== 0) {
      const timer = setTimeout(() => {
        handleRemove()
      }, toast.duration || 5000)
      
      return () => clearTimeout(timer)
    }
  }, [toast.duration])

  const handleRemove = () => {
    setIsLeaving(true)
    setTimeout(() => {
      onRemove(toast.id)
    }, 300)
  }

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />
      case 'info':
        return <Info className="h-5 w-5 text-blue-500" />
    }
  }

  const getStyles = () => {
    switch (toast.type) {
      case 'success':
        return "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800"
      case 'error':
        return "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800"
      case 'warning':
        return "bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800"
      case 'info':
        return "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800"
    }
  }

  return (
    <div
      className={cn(
        "rounded-lg border p-4 shadow-lg transition-all duration-300 transform",
        getStyles(),
        isVisible && !isLeaving ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
      )}
    >
      <div className="flex items-start">
        {getIcon()}
        <div className="ml-3 flex-1">
          {toast.title && (
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {toast.title}
            </h3>
          )}
          <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
            {toast.message}
          </p>
        </div>
        <button
          onClick={handleRemove}
          className="ml-3 flex-shrink-0 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

interface ToastContainerProps {
  toasts: Toast[]
  onRemove: (id: string) => void
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'
}

export function ToastContainer({ toasts, onRemove, position = 'top-right' }: ToastContainerProps) {
  const getPositionClasses = () => {
    switch (position) {
      case 'top-right':
        return "top-4 right-4"
      case 'top-left':
        return "top-4 left-4"
      case 'bottom-right':
        return "bottom-4 right-4"
      case 'bottom-left':
        return "bottom-4 left-4"
    }
  }

  return (
    <div className={cn(
      "fixed z-50 space-y-2 max-w-sm w-full",
      getPositionClasses()
    )}>
      {toasts.map((toast) => (
        <ToastComponent
          key={toast.id}
          toast={toast}
          onRemove={onRemove}
        />
      ))}
    </div>
  )
}

// Hook for managing toasts
export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = (toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9)
    setToasts(prev => [...prev, { ...toast, id }])
  }

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }

  const showSuccess = (message: string, title?: string) => {
    addToast({ type: 'success', message, title })
  }

  const showError = (message: string, title?: string) => {
    addToast({ type: 'error', message, title })
  }

  const showWarning = (message: string, title?: string) => {
    addToast({ type: 'warning', message, title })
  }

  const showInfo = (message: string, title?: string) => {
    addToast({ type: 'info', message, title })
  }

  return {
    toasts,
    addToast,
    removeToast,
    showSuccess,
    showError,
    showWarning,
    showInfo
  }
}
