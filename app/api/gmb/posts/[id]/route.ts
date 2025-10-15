import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { GmbApiServerService } from '@/lib/server/gmb-api-server'

// DELETE - Delete a specific post
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    
    const { id: postId } = await params
    
    if (!postId) {
      return NextResponse.json(
        { error: 'Post ID is required' },
        { status: 400 }
      )
    }

    console.log('Deleting post with ID:', postId)
    
    // Delete the post from GMB
    const result = await gmbService.deletePost(postId)
    
    console.log('Post deletion result:', result)

    return NextResponse.json({
      success: true,
      message: 'Post deleted successfully',
      postId: postId
    })
  } catch (error: unknown) {
    console.error('Error deleting GMB post:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete post' },
      { status: 500 }
    )
  }
}

// GET - Get a specific post
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    
    const { id: postId } = await params
    
    if (!postId) {
      return NextResponse.json(
        { error: 'Post ID is required' },
        { status: 400 }
      )
    }

    console.log('Fetching post with ID:', postId)
    
    // Get the post from GMB
    const post = await gmbService.getPost(postId)
    
    console.log('Post fetch result:', post)

    return NextResponse.json({
      success: true,
      post: post
    })
  } catch (error: unknown) {
    console.error('Error fetching GMB post:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch post' },
      { status: 500 }
    )
  }
}

