import { NextRequest, NextResponse } from 'next/server'
import { ImprovedSyncService } from '@/lib/services/improved-sync-service'
import { GmbErrorHandler } from '@/lib/utils/error-handler'

export async function POST(request: NextRequest) {
  try {
    const { tokens } = await request.json()
    
    if (!tokens) {
      return NextResponse.json(
        { error: 'No tokens provided' },
        { status: 400 }
      )
    }


    // Create a streaming response
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      start(controller) {
        improvedSyncGmbData(tokens, controller, encoder)
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
      }
    })
  } catch (error: unknown) {
    console.error('Error in improved-sync API:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to sync data' },
      { status: 500 }
    )
  }
}

async function improvedSyncGmbData(
  tokens: any, 
  controller: ReadableStreamDefaultController, 
  encoder: TextEncoder
) {
  let isControllerClosed = false
  let syncState: any = null
  
  // Helper function to safely enqueue data
  const safeEnqueue = (data: any) => {
    if (!isControllerClosed && controller.desiredSize !== null) {
      try {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      } catch (error) {
        console.warn('Failed to enqueue data:', error)
        isControllerClosed = true
      }
    }
  }
  
  // Helper function to safely close controller
  const safeClose = () => {
    if (!isControllerClosed && controller.desiredSize !== null) {
      try {
        controller.close()
        isControllerClosed = true
      } catch (error) {
        console.warn('Failed to close controller:', error)
        isControllerClosed = true
      }
    }
  }
  
  try {
    // Step 1: Initialize sync state
    safeEnqueue({
      type: 'progress',
      progress: {
        step: 'initialization',
        progress: 0,
        total: 100,
        message: 'Initializing sync process...'
      }
    })

    // Get account info first
    const { googleOAuthServerClient } = await import('@/lib/server/google-oauth-server')
    googleOAuthServerClient.setCredentials(tokens)
    const oauth2 = (await import('googleapis')).google.oauth2({
      version: 'v2',
      auth: googleOAuthServerClient.getAuthClient()
    })
    
    const accountInfo = await oauth2.userinfo.get()
    const accountData = {
      id: accountInfo.data.id,
      name: accountInfo.data.name,
      email: accountInfo.data.email,
      connectedAt: new Date().toISOString()
    }

    // Initialize sync state
    syncState = await ImprovedSyncService.initializeSync(tokens, accountData)
    
    safeEnqueue({
      type: 'account',
      account: accountData,
      syncState: {
        id: syncState.id,
        status: syncState.status,
        progress: syncState.progress
      }
    })

    // Step 2: Start sync with checkpoints
    safeEnqueue({
      type: 'progress',
      progress: {
        step: 'sync_start',
        progress: 10,
        total: 100,
        message: 'Starting data synchronization...'
      }
    })

    // Progress callback for real-time updates
    const onProgress = (state: any) => {
      safeEnqueue({
        type: 'progress',
        progress: {
          step: state.currentStep,
          progress: state.progress.percentage,
          total: 100,
          message: `Processing ${state.currentStep}... (${state.progress.completed}/${state.progress.total})`
        }
      })

      // Send checkpoint updates
      if (state.checkpoints.length > 0) {
        const latestCheckpoint = state.checkpoints[state.checkpoints.length - 1]
        safeEnqueue({
          type: 'checkpoint',
          checkpoint: latestCheckpoint,
          totalCheckpoints: state.checkpoints.length
        })
      }

      // Send error updates
      if (state.errors.length > 0) {
        const latestErrors = state.errors.slice(-5) // Send last 5 errors
        safeEnqueue({
          type: 'errors',
          errors: latestErrors,
          totalErrors: state.errors.length
        })
      }
    }

    // Execute sync with progress tracking
    const finalSyncState = await ImprovedSyncService.syncWithCheckpoints(
      tokens, 
      syncState, 
      onProgress
    )

    // Final completion
    safeEnqueue({
      type: 'progress',
      progress: {
        step: 'complete',
        progress: 100,
        total: 100,
        message: 'Sync completed successfully!'
      }
    })

    safeEnqueue({
      type: 'complete',
      syncState: finalSyncState,
      summary: {
        totalLocations: finalSyncState.progress.total,
        completedSteps: finalSyncState.checkpoints.length,
        errors: finalSyncState.errors.length,
        duration: finalSyncState.completedAt ? 
          new Date(finalSyncState.completedAt).getTime() - new Date(finalSyncState.startedAt).getTime() : 0
      }
    })

    console.log('✅ Improved sync completed successfully!')
    safeClose()

  } catch (error: unknown) {
    console.error('Improved GMB sync failed:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to sync GMB data'
    const errorInfo = GmbErrorHandler.classifyError(error)
    
    safeEnqueue({
      type: 'error',
      error: errorMessage,
      errorInfo: {
        isRetryable: errorInfo.isRetryable,
        category: errorInfo.category,
        severity: errorInfo.severity
      },
      syncState: syncState ? {
        id: syncState.id,
        status: 'failed',
        progress: syncState.progress,
        errors: syncState.errors
      } : null
    })
    
    safeClose()
  }
}




