import type { NextAuthConfig } from 'next-auth'
import Google from 'next-auth/providers/google'
import connectDB from '@/lib/database/connection'
import { Brand } from '@/lib/database/models'
import bcrypt from 'bcryptjs'

export const externalAuthConfig = {
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      }
    })
  ],
  pages: {
    signIn: '/brand/create',
    error: '/brand/create/error',
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === 'google') {
        await connectDB()
        
        const email = user.email?.toLowerCase()
        
        if (!email) {
          return false
        }
        
        // Check if brand already exists with this email as owner
        const existingBrand = await Brand.findOne({ 'users.owner.email': email })
        
        if (existingBrand) {
          // Brand already exists, redirect to dashboard login
          return '/dashboard/login?message=Brand already exists. Please use dashboard login.'
        }
        
        // Create a new brand with this email as owner
        const slug = email.split('@')[0].replace(/[^a-z0-9]/g, '-') + '-' + Date.now()
        
        // Create brand with minimal required fields
        const newBrand = new Brand({
          name: user.name || email.split('@')[0],
          slug,
          email,
          users: {
            owner: {
              email,
              password: await bcrypt.hash(Math.random().toString(36), 10), // Random password for Google OAuth users
              name: user.name || '',
              profilePicture: user.image || ''
            }
          },
          address: {
            line1: 'To be updated',
            locality: 'To be updated',
            city: 'To be updated',
            state: 'To be updated',
            postalCode: '000000',
            country: 'To be updated'
          },
          status: 'pending_verification', // New brands need verification
          createdAt: new Date(),
          updatedAt: new Date()
        })
        
        await newBrand.save()
        
        // Update user object
        user.id = String(newBrand._id)
        user.name = newBrand.name
        ;(user as any).role = 'owner'
        ;(user as any).brandId = String(newBrand._id)
        ;(user as any).isNewBrand = true // Flag to show welcome message
        
        return true
      }
      
      return true
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id
        token.role = (user as any).role
        token.brandId = (user as any).brandId
        token.isNewBrand = (user as any).isNewBrand
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
        session.user.brandId = token.brandId as string
        ;(session.user as any).isNewBrand = token.isNewBrand as boolean
      }
      return session
    }
  },
  session: {
    strategy: 'jwt' as const,
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
  secret: process.env.NEXTAUTH_SECRET,
} satisfies NextAuthConfig
