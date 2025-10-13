import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'
import { UserRole } from '../database/user-model'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'
const SESSION_COOKIE_NAME = 'session-token'

export interface SessionData {
  userId: string
  email: string
  name: string
  role: UserRole
  brandId?: string
  iat?: number
  exp?: number
}

/**
 * Create a session token
 */
export function createSessionToken(data: Omit<SessionData, 'iat' | 'exp'>): string {
  return jwt.sign(data, JWT_SECRET, {
    expiresIn: '7d' // 7 days
  })
}

/**
 * Verify and decode session token
 */
export function verifySessionToken(token: string): SessionData | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as SessionData
    return decoded
  } catch (error) {
    console.error('Invalid session token:', error)
    return null
  }
}

/**
 * Set session cookie
 */
export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/'
  })
}

/**
 * Get session from cookies
 */
export async function getSession(): Promise<SessionData | null> {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)
    
    if (!sessionCookie) {
      return null
    }

    return verifySessionToken(sessionCookie.value)
  } catch (error) {
    console.error('Error getting session:', error)
    return null
  }
}

/**
 * Clear session cookie
 */
export async function clearSession(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE_NAME)
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const session = await getSession()
  return session !== null
}

/**
 * Require authentication (throws error if not authenticated)
 */
export async function requireAuth(): Promise<SessionData> {
  const session = await getSession()
  
  if (!session) {
    throw new Error('Unauthorized - Please login')
  }
  
  return session
}

/**
 * Require specific role
 */
export async function requireRole(allowedRoles: UserRole[]): Promise<SessionData> {
  const session = await requireAuth()
  
  if (!allowedRoles.includes(session.role)) {
    throw new Error('Forbidden - Insufficient permissions')
  }
  
  return session
}





