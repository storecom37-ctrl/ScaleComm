import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { GmbApiServerService } from '@/lib/server/gmb-api-server'

// GET - Fetch posts for all locations
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const tokens = cookieStore.get('gmb-tokens')
    
    if (!tokens) {
      return NextResponse.json(
        { error: 'Not authenticated with GMB' },
        { status: 401 }
      )
    }

    const tokenData = JSON.parse(tokens.value)
    const gmbService = new GmbApiServerService(tokenData)
    
    // Get all accounts and locations first
    const accounts = await gmbService.getAccounts()
    let allPosts: Record<string, unknown>[] = []
    
    for (const account of accounts) {
      try {
        const locations = await gmbService.getLocations(account.name)
        
        for (const location of locations) {
          try {
            const posts = await gmbService.getPosts(location.id)
            allPosts = [...allPosts, ...posts.map((post: any) => ({ ...post } as Record<string, unknown>))]
          } catch (error) {
            console.warn(`Failed to fetch posts for location ${location.name}:`, error)
          }
        }
      } catch (error) {
        console.warn(`Failed to fetch locations for account ${account.name}:`, error)
      }
    }

    return NextResponse.json({
      success: true,
      posts: allPosts
    })
  } catch (error: unknown) {
    console.error('Error fetching GMB posts:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch posts' },
      { status: 500 }
    )
  }
}

// POST - Create a new post
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const tokens = cookieStore.get('gmb-tokens')
    
    if (!tokens) {
      return NextResponse.json(
        { error: 'Not authenticated with GMB' },
        { status: 401 }
      )
    }

    const tokenData = JSON.parse(tokens.value)
    const gmbService = new GmbApiServerService(tokenData)
    
    const body = await request.json()
    const { locationName, postData } = body
    
    if (!locationName || !postData) {
      return NextResponse.json(
        { error: 'locationName and postData are required' },
        { status: 400 }
      )
    }

    // Validate required fields
    if (!postData.topicType || !postData.languageCode || !postData.summary) {
      return NextResponse.json(
        { error: 'topicType, languageCode, and summary are required' },
        { status: 400 }
      )
    }

    
    
    const createdPost = await gmbService.createPost(locationName, postData)
    
    

    return NextResponse.json({
      success: true,
      post: createdPost
    })
  } catch (error: unknown) {
    console.error('Error creating GMB post:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create post' },
      { status: 500 }
    )
  }
}


