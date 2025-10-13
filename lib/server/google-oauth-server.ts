// Server-side only Google OAuth utilities
import { google } from 'googleapis'

// Google OAuth scopes for GMB API
export const GMB_SCOPES = [
  'https://www.googleapis.com/auth/business.manage',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile'
]

export interface GoogleTokens {
  access_token: string
  refresh_token?: string
  expires_at?: number
  expiry_date?: number  // Alternative name used by some Google APIs
  token_type?: string
  scope?: string
  id_token?: string
}

export class GoogleOAuthServerClient {
  private oauth2Client: any

  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI || `${process.env.NEXTAUTH_URL}/api/auth/gmb/callback`
    )
  }

  generateAuthUrl(): string {
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: GMB_SCOPES,
      prompt: 'consent'
    })
  }

  async getTokensFromCode(code: string): Promise<GoogleTokens> {
    const { tokens } = await this.oauth2Client.getToken(code)
    return tokens as GoogleTokens
  }

  async refreshAccessToken(refreshToken: string): Promise<GoogleTokens> {
    this.oauth2Client.setCredentials({ refresh_token: refreshToken })
    const { credentials } = await this.oauth2Client.refreshAccessToken()
    return credentials as GoogleTokens
  }

  setCredentials(tokens: GoogleTokens) {
    this.oauth2Client.setCredentials(tokens)
  }

  getAuthClient() {
    return this.oauth2Client
  }

  async verifyToken(accessToken: string): Promise<boolean> {
    try {
      const response = await fetch(`https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${accessToken}`)
      const tokenInfo = await response.json()
      
      if (tokenInfo.error) {
        return false
      }
      
      // Check if token has required scopes
      const tokenScopes = tokenInfo.scope?.split(' ') || []
      const hasRequiredScopes = GMB_SCOPES.every(scope => 
        tokenScopes.some((tokenScope: string) => tokenScope.includes(scope.split('/').pop() || ''))
      )
      
      return hasRequiredScopes
    } catch (error) {
      console.error('Token verification failed:', error)
      return false
    }
  }
}

export const googleOAuthServerClient = new GoogleOAuthServerClient()


