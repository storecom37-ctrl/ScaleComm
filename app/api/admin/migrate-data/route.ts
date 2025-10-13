import { NextRequest, NextResponse } from 'next/server'
import { migrateStoreData, verifyMigration, cleanupEmbeddedData } from '@/lib/utils/data-migration'

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json()
    
    switch (action) {
      case 'migrate':
        console.log('Starting data migration...')
        const migrationStats = await migrateStoreData()
        
        return NextResponse.json({
          success: true,
          message: 'Data migration completed successfully',
          stats: migrationStats
        })
        
      case 'verify':
        console.log('Verifying migration...')
        const verification = await verifyMigration()
        
        return NextResponse.json({
          success: true,
          message: 'Migration verification completed',
          data: verification
        })
        
      case 'cleanup':
        console.log('Cleaning up embedded data...')
        await cleanupEmbeddedData()
        
        return NextResponse.json({
          success: true,
          message: 'Embedded data cleanup completed'
        })
        
      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action. Use "migrate", "verify", or "cleanup"'
        }, { status: 400 })
    }
    
  } catch (error) {
    console.error('Migration API error:', error)
    return NextResponse.json({
      success: false,
      error: 'Migration failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET() {
  try {
    const verification = await verifyMigration()
    
    return NextResponse.json({
      success: true,
      message: 'Migration status check completed',
      data: verification
    })
    
  } catch (error) {
    console.error('Verification error:', error)
    return NextResponse.json({
      success: false,
      error: 'Verification failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
