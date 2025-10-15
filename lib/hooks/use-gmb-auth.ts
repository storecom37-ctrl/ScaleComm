import { useState, useCallback, useEffect } from 'react'
import { useGmbStore } from '../stores/gmb-store'

export interface GoogleTokens {
  access_token: string
  refresh_token?: string
  expires_at?: number
  token_type?: string
  scope?: string
}

interface AuthState {
  isAuthenticating: boolean
  authUrl: string | null
  error: string | null
}

export function useGmbAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticating: false,
    authUrl: null,
    error: null
  })
  
  const { isConnected, setConnected, setError } = useGmbStore()

  // Check if user is already authenticated on component mount
  useEffect(() => {
    checkAuthStatus()
  }, [])

  const checkAuthStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/gmb/status', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        // Add timeout to prevent hanging requests
        signal: AbortSignal.timeout(5000)
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.isAuthenticated && data.tokens) {
        setConnected(true)
      } else {
        setConnected(false)
      }
    } catch (error) {
      console.error('Failed to check auth status:', error)
      setConnected(false)
      setError(error instanceof Error ? error.message : 'Unknown error')
    }
  }, [setConnected, setError])

  const initiateAuth = useCallback(async () => {
    try {
      setAuthState(prev => ({ ...prev, isAuthenticating: true, error: null }))
      
      // Get auth URL from server
      const response = await fetch('/api/auth/gmb/auth-url')
      const data = await response.json()
      
      if (!data.authUrl) {
        throw new Error('Failed to generate authentication URL')
      }
      
      // Redirect in same tab for OAuth (avoid opening a new window/tab)
      setAuthState(prev => ({ ...prev, isAuthenticating: false }))
      window.location.href = data.authUrl
      return

    } catch (error: any) {
      setAuthState(prev => ({ 
        ...prev, 
        isAuthenticating: false, 
        error: error.message 
      }))
    }
  }, [checkAuthStatus])

  const refreshToken = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/gmb/refresh', {
        method: 'POST'
      })
      
      const data = await response.json()
      
      if (data.success) {
        setConnected(true)
        setError(null)
        return data.tokens
      } else {
        throw new Error(data.error || 'Failed to refresh token')
      }
    } catch (error: any) {
      console.error('Failed to refresh token:', error)
      setConnected(false)
      setError(error.message)
      return null
    }
  }, [setConnected, setError])

  const disconnect = useCallback(async () => {
    try {
      await fetch('/api/auth/gmb/disconnect', {
        method: 'POST'
      })
      
      setConnected(false)
      setError(null)
      
      // Clear local storage
      localStorage.removeItem('gmb-store')
      
      // Reset store
      useGmbStore.getState().reset()
      
    } catch (error: any) {
      console.error('Failed to disconnect:', error)
      setError(error.message)
    }
  }, [setConnected, setError])

  const getStoredTokens = useCallback(async (): Promise<GoogleTokens | null> => {
    try {
      const response = await fetch('/api/auth/gmb/tokens')
      const data = await response.json()
      
      if (data.tokens) {
        return data.tokens
      }
      
      return null
    } catch (error) {
      console.error('Failed to get stored tokens:', error)
      return null
    }
  }, [])

  return {
    isConnected,
    isAuthenticating: authState.isAuthenticating,
    authError: authState.error,
    initiateAuth,
    disconnect,
    refreshToken,
    getStoredTokens,
    checkAuthStatus
  }
}
