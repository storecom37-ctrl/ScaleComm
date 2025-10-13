import { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      role: string
      brandId?: string
    } & DefaultSession['user']
  }

  interface User {
    role?: string
    brandId?: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: string
    brandId?: string
  }
}


