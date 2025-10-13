import { NextRequest, NextResponse } from 'next/server'
import { SyncOrchestrator } from '@/lib/services/sync-orchestrator'
import { GmbErrorHandler } from '@/lib/utils/error-handler'

export async function POST(request: NextRequest) {
  try {
    const { tokens, config } = await request.json()
    
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
        orchestratedSyncGmbData(tokens, config, controller, encoder)
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Keep-Alive': 'timeout=60, max=1000',
        'X-Accel-Buffering': 'no',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
      }
    })
  } catch (error: unknown) {
    console.error('Error in orchestrated-sync API:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to sync data' },
      { status: 500 }
    )
  }
}

async function orchestratedSyncGmbData(
  tokens: any,
  config: any,
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
    // Initialize orchestrator with configuration
    const orchestrator = new SyncOrchestrator(config)
    // Heartbeat to keep SSE connection alive
    const heartbeatIntervalMs = 15000
    const heartbeat = setInterval(() => {
      safeEnqueue({ type: 'heartbeat', ts: Date.now() })
    }, heartbeatIntervalMs)
    
    // Progress callback for real-time updates
    const onProgress = (progress: any) => {
      safeEnqueue({
        type: 'progress',
        progress: {
          step: progress.step,
          progress: progress.progress,
          total: progress.total,
          message: progress.message,
          dataType: progress.dataType,
          locationId: progress.locationId
        }
      })

      // Send errors and warnings if present
      if (progress.errors && progress.errors.length > 0) {
        safeEnqueue({
          type: 'errors',
          errors: progress.errors,
          step: progress.step,
          locationId: progress.locationId
        })
      }

      if (progress.warnings && progress.warnings.length > 0) {
        safeEnqueue({
          type: 'warnings',
          warnings: progress.warnings,
          step: progress.step,
          locationId: progress.locationId
        })
      }
    }

    // Start sync process
    safeEnqueue({
      type: 'sync_start',
      message: 'Starting orchestrated sync process...',
      config: orchestrator.getStats().config
    })

    const result = await orchestrator.startSync(tokens, onProgress)

    // Send final result
    if (result.success) {
      safeEnqueue({
        type: 'sync_complete',
        message: 'Sync completed successfully!',
        result: {
          syncState: result.syncState,
          stats: result.stats,
          orchestratorStats: orchestrator.getStats()
        }
      })

      console.log('✅ Orchestrated sync completed successfully!')
    } else {
      safeEnqueue({
        type: 'sync_failed',
        message: 'Sync failed with errors',
        result: {
          syncState: result.syncState,
          stats: result.stats,
          errors: result.errors,
          warnings: result.warnings
        }
      })

      console.error('❌ Orchestrated sync failed:', result.errors)
    }

    safeClose()
    clearInterval(heartbeat)

  } catch (error: unknown) {
    console.error('Orchestrated GMB sync failed:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to sync GMB data'
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
    // Ensure heartbeat is cleared on error
    // Attempt to clear even if already cleared
    try { clearInterval((globalThis as any).__noop as any) } catch {}
  }
}




