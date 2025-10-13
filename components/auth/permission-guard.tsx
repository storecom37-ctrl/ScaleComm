'use client'

import { ReactNode } from 'react'
import { useAuth } from '@/lib/hooks/use-auth'

interface PermissionGuardProps {
  children: ReactNode
  action: string
  fallback?: ReactNode
}

/**
 * Component that conditionally renders children based on user permissions
 */
export function PermissionGuard({ children, action, fallback = null }: PermissionGuardProps) {
  const { hasPermission, loading } = useAuth()

  if (loading) {
    return null
  }

  if (!hasPermission(action)) {
    return <>{fallback}</>
  }

  return <>{children}</>
}

/**
 * Higher-order component for permission-based rendering
 */
export function withPermission<P extends object>(
  Component: React.ComponentType<P>,
  action: string
) {
  return function PermissionWrappedComponent(props: P) {
    const { hasPermission, loading } = useAuth()

    if (loading) {
      return null
    }

    if (!hasPermission(action)) {
      return null
    }

    return <Component {...props} />
  }
}





