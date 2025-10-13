// Temporarily disabled middleware - will re-enable after testing
// export { auth as middleware } from '@/lib/auth/auth'

// export const config = {
//   matcher: ['/dashboard/:path*'],
// }

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Let all routes through for now
  return NextResponse.next()
}

export const config = {
  matcher: [],
}

