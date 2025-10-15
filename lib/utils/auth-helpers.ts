import { cookies } from 'next/headers'
import { getAndRefreshTokensIfNeeded } from './token-refresh'

export interface AuthTokens {
  access_token: string
  refresh_token?: string
  token_type?: string
  scope?: string
  expires_at?: number
  expiry_date?: number
  id_token?: string
}

/**
 * Get GMB tokens from request cookies
 * This will automatically refresh tokens if they're expired
 */
export async function getGmbTokensFromRequest(): Promise<AuthTokens | null> {
  try {
    // Use the centralized token refresh utility
    const result = await getAndRefreshTokensIfNeeded()
    
    if (!result.success || !result.tokens) {
      console.log('🔍 Failed to get tokens:', result.error)
      return null
    }

    return result.tokens as AuthTokens
  } catch (error) {
    console.error('Error getting GMB tokens:', error)
    return null
  }
}

/**
 * Get all GMB accounts accessible by current user
 */
export async function getAllAccessibleAccounts(tokens: AuthTokens): Promise<Array<{id: string, name: string, email?: string}> | null> {
  const maxRetries = 3
  let lastError: Error | null = null
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout
      
      const response = await fetch('https://mybusinessaccountmanagement.googleapis.com/v1/accounts', {
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`,
          'Accept': 'application/json'
        },
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)

      if (!response.ok) {
        console.error(`Failed to fetch GMB accounts (attempt ${attempt}):`, response.status, response.statusText)
        if (attempt === maxRetries) {
          return null
        }
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
        continue
      }

      const data = await response.json()
      const accounts = data.accounts || []
      
      console.log('🔍 Raw GMB accounts response:', JSON.stringify(data, null, 2))
      
      const mappedAccounts = accounts.map((account: any) => ({
        id: account.name?.replace('accounts/', '') || '',
        name: account.accountName || account.name || 'Unknown Account',
        email: account.email
      }))
      
      
      return mappedAccounts
      
    } catch (error) {
      lastError = error as Error
      console.error(`Error fetching accounts (attempt ${attempt}):`, error)
      
      if (attempt === maxRetries) {
        console.error('All retry attempts failed. Last error:', lastError)
        return null
      }
      
      // Wait before retry with exponential backoff
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt - 1)))
    }
  }
  
  return null
}

/**
 * Get current user's email from OAuth tokens
 */
export async function getCurrentUserEmail(tokens: AuthTokens): Promise<string | null> {
  try {
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`,
        'Accept': 'application/json'
      }
    })

    if (!response.ok) {
      console.error('Failed to fetch user info:', response.status, response.statusText)
      return null
    }

    const userInfo = await response.json()
    console.log('🔍 Current user email from tokens:', userInfo.email)
    
    return userInfo.email || null
  } catch (error) {
    console.error('Error fetching current user email:', error)
    return null
  }
}

/**
 * Get current user's full profile information from OAuth tokens
 */
export async function getCurrentUserProfile(tokens: AuthTokens): Promise<{
  email: string | null
  name: string | null
  given_name: string | null
  family_name: string | null
  picture: string | null
  verified_email: boolean
} | null> {
  try {
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`,
        'Accept': 'application/json'
      }
    })

    if (!response.ok) {
      console.error('Failed to fetch user profile:', response.status, response.statusText)
      return null
    }

    const userInfo = await response.json()
    console.log('🔍 Current user profile from tokens:', userInfo)
    
    return {
      email: userInfo.email || null,
      name: userInfo.name || null,
      given_name: userInfo.given_name || null,
      family_name: userInfo.family_name || null,
      picture: userInfo.picture || null,
      verified_email: userInfo.verified_email || false
    }
  } catch (error) {
    console.error('Error fetching current user profile:', error)
    return null
  }
}

/**
 * Get current user's primary account ID (for backward compatibility)
 */
export async function getCurrentAccountId(tokens: AuthTokens): Promise<string | null> {
  const accounts = await getAllAccessibleAccounts(tokens)
  return accounts && accounts.length > 0 ? accounts[0].id : null
}

/**
 * Get all account IDs that belong to the current brand/platform
 * This should return only the accounts that the current authenticated user has access to
 */
export async function getAllBrandAccountIds(): Promise<string[]> {
  try {
    const tokens = await getGmbTokensFromRequest()
    if (!tokens) {
      console.log('🔍 No GMB tokens found in request')
      return []
    }

    console.log('🔍 Found GMB tokens, fetching accessible accounts...')

    // Get accounts that the current user actually has access to
    const accessibleAccounts = await getAllAccessibleAccounts(tokens)
    if (!accessibleAccounts) {
      console.log('🔍 No accessible accounts found')
      return []
    }

    // Return only the account IDs that the user has access to
    const accountIds = accessibleAccounts.map(account => account.id).filter(id => id)
    console.log('🔍 Final accessible account IDs:', accountIds)
    
    return accountIds
  } catch (error) {
    console.error('Error getting brand account IDs:', error)
    return []
  }
}

/**
 * Check if user has access to a specific account ID
 */
export async function hasAccountAccess(tokens: AuthTokens, accountId: string): Promise<boolean> {
  try {
    const response = await fetch('https://mybusinessaccountmanagement.googleapis.com/v1/accounts', {
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`,
        'Accept': 'application/json'
      }
    })

    if (!response.ok) {
      return false
    }

    const data = await response.json()
    const accounts = data.accounts || []
    
    // Check if the user has access to this account
    return accounts.some((account: any) => 
      account.name === `accounts/${accountId}` || account.name === accountId
    )
  } catch (error) {
    console.error('Error checking account access:', error)
    return false
  }
}
