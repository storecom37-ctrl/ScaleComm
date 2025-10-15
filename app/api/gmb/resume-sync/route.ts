import { NextRequest, NextResponse } from 'next/server'
import { ImprovedSyncService } from '@/lib/services/improved-sync-service'
import { GmbErrorHandler } from '@/lib/utils/error-handler'

export async function POST(request: NextRequest) {
  try {
    const { syncStateId, tokens } = await request.json()
    
    if (!syncStateId || !tokens) {
      return NextResponse.json(
        { error: 'Sync state ID and tokens are required' },
        { status: 400 }
      )
    }

    // Create a streaming response
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      start(controller) {
        resumeSyncGmbData(syncStateId, tokens, controller, encoder)
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
    console.error('Error in resume-sync API:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to resume sync' },
      { status: 500 }
    )
  }
}

async function resumeSyncGmbData(
  syncStateId: string,
  tokens: any,
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder
) {
  let isControllerClosed = false
  
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
    // Step 1: Load existing sync state
    safeEnqueue({
      type: 'progress',
      progress: {
        step: 'resume',
        progress: 0,
        total: 100,
        message: 'Resuming sync process...'
      }
    })

    // In a real implementation, you'd load the sync state from database
    // For now, we'll create a mock state
    const syncState = {
      id: syncStateId,
      brandId: 'mock-brand-id', // This should be loaded from the actual sync state
      accountId: 'mock-account-id', // This should be loaded from the actual sync state
      status: 'paused' as const,
      currentStep: 'location_processing',
      progress: { total: 50, completed: 25, percentage: 50 },
      checkpoints: [],
      errors: [],
      startedAt: new Date(Date.now() - 3600000), // 1 hour ago
      lastUpdatedAt: new Date()
    }

    safeEnqueue({
      type: 'resume',
      syncState,
      message: 'Sync state loaded successfully'
    })

    // Step 2: Resume from last checkpoint
    safeEnqueue({
      type: 'progress',
      progress: {
        step: 'resume_sync',
        progress: 25,
        total: 100,
        message: 'Resuming data synchronization from last checkpoint...'
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
          message: `Resuming ${state.currentStep}... (${state.progress.completed}/${state.progress.total})`
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
    }

    // Resume sync from where it left off
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
        message: 'Resume sync completed successfully!'
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

    console.log('✅ Resume sync completed successfully!')
    safeClose()

  } catch (error: unknown) {
    console.error('Resume GMB sync failed:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to resume GMB sync'
    const errorInfo = GmbErrorHandler.classifyError(error)
    
    safeEnqueue({
      type: 'error',
      error: errorMessage,
      errorInfo: {
        isRetryable: errorInfo.isRetryable,
        category: errorInfo.category,
        severity: errorInfo.severity
      }
    })
    
    safeClose()
  }
}




