'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/lib/hooks/use-auth'

interface AuthWrapperProps {
  children: React.ReactNode
}

/**
 * Wrapper component that checks authentication and redirects if needed
 */
export function AuthWrapper({ children }: AuthWrapperProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { authenticated, loading } = useAuth()

  useEffect(() => {
    // Skip auth check for public pages
    const publicPages = ['/login', '/api']
    const isPublicPage = publicPages.some(page => pathname.startsWith(page))

    if (!loading && !authenticated && !isPublicPage) {
      router.push('/login')
    }
  }, [authenticated, loading, pathname, router])

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Show login page if not authenticated
  if (!authenticated && !pathname.startsWith('/login')) {
    return null
  }

  return <>{children}</>
}





