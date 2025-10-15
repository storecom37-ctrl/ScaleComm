// Centralized token refresh utility
import { cookies } from 'next/headers'
import { googleOAuthServerClient, GoogleTokens } from '@/lib/server/google-oauth-server'

export interface RefreshResult {
  success: boolean
  tokens?: GoogleTokens
  error?: string
}

/**
 * Checks if a token is expired or about to expire (within 5 minutes)
 */
export function isTokenExpired(tokens: GoogleTokens): boolean {
  // Check both naming conventions
  const expiryTime = tokens.expires_at || tokens.expiry_date
  
  if (!expiryTime) {
    // If no expiry time, assume it might be expired and needs refresh
    return true
  }

  // Add 5 minute buffer to refresh before actual expiry
  const bufferMs = 5 * 60 * 1000
  const now = Date.now()
  
  return now >= (expiryTime - bufferMs)
}

/**
 * Refreshes tokens and updates the cookies
 * This should be used server-side to ensure tokens are persisted
 */
export async function refreshAndPersistTokens(currentTokens: GoogleTokens): Promise<RefreshResult> {
  try {
    if (!currentTokens.refresh_token) {
      return {
        success: false,
        error: 'No refresh token available'
      }
    }

    console.log('🔄 Refreshing access token...')
    
    // Refresh the access token
    const newTokens = await googleOAuthServerClient.refreshAccessToken(currentTokens.refresh_token)
    
    // Merge with existing tokens (preserve refresh token if not provided)
    const updatedTokens: GoogleTokens = {
      ...currentTokens,
      ...newTokens,
      refresh_token: newTokens.refresh_token || currentTokens.refresh_token,
      // Normalize the expiry field
      expires_at: newTokens.expiry_date || newTokens.expires_at,
      expiry_date: newTokens.expiry_date || newTokens.expires_at
    }

    // Update the cookie
    const cookieStore = await cookies()
    cookieStore.set('gmb-tokens', JSON.stringify(updatedTokens), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/'
    })

    console.log('✅ Access token refreshed and persisted')
    
    return {
      success: true,
      tokens: updatedTokens
    }
  } catch (error) {
    console.error('❌ Failed to refresh token:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to refresh token'
    
    return {
      success: false,
      error: errorMessage
    }
  }
}

/**
 * Gets tokens from cookies and refreshes them if expired
 * This is the main function to use in API routes
 */
export async function getAndRefreshTokensIfNeeded(): Promise<RefreshResult> {
  try {
    const cookieStore = await cookies()
    const tokensCookie = cookieStore.get('gmb-tokens')
    
    if (!tokensCookie) {
      return {
        success: false,
        error: 'No tokens found'
      }
    }

    const tokens: GoogleTokens = JSON.parse(tokensCookie.value)
    
    // Check if token is expired or about to expire
    if (isTokenExpired(tokens)) {
      console.log('⚠️ Token expired or expiring soon, refreshing...')
      return await refreshAndPersistTokens(tokens)
    }

    // Token is still valid
    return {
      success: true,
      tokens
    }
  } catch (error) {
    console.error('❌ Error getting/refreshing tokens:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to get tokens'
    
    return {
      success: false,
      error: errorMessage
    }
  }
}













