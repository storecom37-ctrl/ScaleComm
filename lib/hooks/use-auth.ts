'use client'

import { useState, useEffect, useCallback } from 'react'
import { UserRole } from '../database/user-model'

interface User {
  id: string
  email: string
  name: string
  role: UserRole
  brandId?: string
  phone?: string
  profilePicture?: string
  status: string
}

interface AuthState {
  user: User | null
  loading: boolean
  authenticated: boolean
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    loading: true,
    authenticated: false
  })

  // Check session on mount
  useEffect(() => {
    checkSession()
  }, [])

  const checkSession = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/session')
      const data = await response.json()

      if (data.success && data.authenticated) {
        setAuthState({
          user: data.data.user,
          loading: false,
          authenticated: true
        })
      } else {
        setAuthState({
          user: null,
          loading: false,
          authenticated: false
        })
      }
    } catch (error) {
      console.error('Session check error:', error)
      setAuthState({
        user: null,
        loading: false,
        authenticated: false
      })
    }
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      })

      const data = await response.json()

      if (data.success) {
        setAuthState({
          user: data.data.user,
          loading: false,
          authenticated: true
        })
        return { success: true }
      } else {
        return { success: false, error: data.error }
      }
    } catch (error) {
      console.error('Login error:', error)
      return { success: false, error: 'An error occurred during login' }
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST'
      })

      setAuthState({
        user: null,
        loading: false,
        authenticated: false
      })
      
      // Redirect to login
      window.location.href = '/login'
    } catch (error) {
      console.error('Logout error:', error)
    }
  }, [])

  const hasPermission = useCallback((action: string): boolean => {
    if (!authState.user) return false

    const role = authState.user.role

    // Super admin has all permissions
    if (role === 'super_admin') return true

    // Owner permissions
    if (role === 'owner') {
      return [
        'view_stores', 'create_store', 'edit_store', 'delete_store',
        'view_reviews', 'reply_review',
        'view_posts', 'create_post', 'edit_post', 'delete_post',
        'edit_brand'
      ].includes(action)
    }

    // Manager permissions (view only)
    if (role === 'manager') {
      return ['view_stores', 'view_reviews', 'view_posts', 'view_brand'].includes(action)
    }

    return false
  }, [authState.user])

  return {
    user: authState.user,
    loading: authState.loading,
    authenticated: authState.authenticated,
    login,
    logout,
    checkSession,
    hasPermission
  }
}





