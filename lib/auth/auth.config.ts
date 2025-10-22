import type { NextAuthConfig } from 'next-auth'
import Google from 'next-auth/providers/google'
import Credentials from 'next-auth/providers/credentials'
import connectDB from '@/lib/database/connection'
import { User } from '@/lib/database/user-model'
import { Brand } from '@/lib/database/models'
import bcrypt from 'bcryptjs'

export const authConfig = {
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
    }),
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        await connectDB()
        
        const emailLower = (credentials.email as string).toLowerCase()
        
        // Try to find user in User collection first
        let user = await User.findOne({ email: emailLower })
        
        if (user) {
          // Check if user is active
          if (user.status !== 'active') {
            return null
          }
          
          // Verify password
          const isPasswordValid = await user.comparePassword(credentials.password as string)
          
          if (!isPasswordValid) {
            return null
          }
          
          // Update last login
          user.lastLoginAt = new Date()
          await user.save()
          
          return {
            id: String(user._id),
            email: user.email,
            name: user.name,
            role: user.role,
            brandId: user.brandId ? String(user.brandId) : undefined,
            image: user.profilePicture
          }
        }
        
        // If not found in User collection, check Brand collection
        const brand = await Brand.findOne({
          $or: [
            { 'users.owner.email': emailLower },
            { 'users.manager.email': emailLower }
          ]
        })
        
        if (!brand) {
          return null
        }
        
        // Check if it's owner or manager
        let userRole: 'owner' | 'manager' | null = null
        let storedPassword: string | null = null
        
        if (brand.users.owner.email === emailLower) {
          userRole = 'owner'
          storedPassword = brand.users.owner.password
        } else if (brand.users.manager && brand.users.manager.email === emailLower) {
          userRole = 'manager'
          storedPassword = brand.users.manager.password || null
        }
        
        if (!userRole || !storedPassword) {
          return null
        }
        
        // Verify password
        const isPasswordValid = await bcrypt.compare(credentials.password as string, storedPassword)
        
        if (!isPasswordValid) {
          return null
        }
        
        return {
          id: String(brand._id),
          email: emailLower,
          name: brand.name,
          role: userRole,
          brandId: String(brand._id)
        }
      }
    })
  ],
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === 'google') {
        await connectDB()
        
        const email = user.email?.toLowerCase()
        
        if (!email) {
          return false
        }
        
        // Check if user exists in User collection
        let existingUser = await User.findOne({ email })
        
        if (existingUser) {
          // Update last login
          existingUser.lastLoginAt = new Date()
          await existingUser.save()
          
          // Update user object with database info
          user.id = String(existingUser._id)
          user.name = existingUser.name
          user.role = existingUser.role
          user.brandId = existingUser.brandId ? String(existingUser.brandId) : undefined
          
          return true
        }
        
        // Check if brand exists with this email as owner
        let brand = await Brand.findOne({ 'users.owner.email': email })
        
        if (brand) {
          // User is an existing brand owner
          user.id = String(brand._id)
          user.name = brand.name
          user.role = 'owner'
          user.brandId = String(brand._id)
          
          return true
        }
        
        // Create a new brand with this email as owner
        // Generate a slug from email
        const slug = email.split('@')[0].replace(/[^a-z0-9]/g, '-') + '-' + Date.now()
        
        // Create brand with minimal required fields
        const newBrand = new Brand({
          name: user.name || email.split('@')[0],
          slug,
          email,
          users: {
            owner: {
              email,
              password: await bcrypt.hash(Math.random().toString(36), 10) // Random password for Google OAuth users
            }
          },
          address: {
            line1: 'Not provided',
            locality: 'Not provided',
            city: 'Not provided',
            state: 'Not provided',
            postalCode: '000000',
            country: 'Not provided'
          },
          status: 'active'
        })
        
        await newBrand.save()
        
        // Update user object
        user.id = String(newBrand._id)
        user.name = newBrand.name
        user.role = 'owner'
        user.brandId = String(newBrand._id)
        
        return true
      }
      
      return true
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id
        token.role = user.role
        token.brandId = user.brandId
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
        session.user.brandId = token.brandId as string
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


