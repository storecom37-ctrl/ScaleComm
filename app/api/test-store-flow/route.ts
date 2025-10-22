import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/database/connection'
import { StoreManagementService } from '@/lib/services/store-management-service'
import { getGmbTokensFromRequest } from '@/lib/utils/auth-helpers'

// POST /api/test-store-flow - Test the complete store management flow
export async function POST(request: NextRequest) {
  try {
    await connectDB()

    // Get GMB tokens from request
    const tokens = await getGmbTokensFromRequest()
    if (!tokens) {
      return NextResponse.json(
        { success: false, error: 'GMB authentication required for testing' },
        { status: 401 }
      )
    }

    const testResults = {
      steps: [] as any[],
      summary: {
        totalSteps: 0,
        successfulSteps: 0,
        failedSteps: 0,
        errors: [] as string[]
      }
    }

    // Step 1: Test fetching stores from GMB
    testResults.steps.push({
      step: 1,
      name: 'Fetch stores from GMB',
      status: 'running'
    })

    try {
      const gmbStoresResult = await StoreManagementService.getGmbStores(
        1, 10, '', '', '', true, tokens
      )
      
      if (gmbStoresResult.success) {
        testResults.steps[testResults.steps.length - 1] = {
          step: 1,
          name: 'Fetch stores from GMB',
          status: 'success',
          data: {
            totalStores: gmbStoresResult.data?.pagination?.total || 0,
            stores: gmbStoresResult.data?.stores?.length || 0
          }
        }
        testResults.summary.successfulSteps++
      } else {
        testResults.steps[testResults.steps.length - 1] = {
          step: 1,
          name: 'Fetch stores from GMB',
          status: 'failed',
          error: gmbStoresResult.error
        }
        testResults.summary.failedSteps++
        testResults.summary.errors.push(`Step 1: ${gmbStoresResult.error}`)
      }
    } catch (error) {
      testResults.steps[testResults.steps.length - 1] = {
        step: 1,
        name: 'Fetch stores from GMB',
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
      testResults.summary.failedSteps++
      testResults.summary.errors.push(`Step 1: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    // Step 2: Test syncing stores from GMB to database
    testResults.steps.push({
      step: 2,
      name: 'Sync stores from GMB to database',
      status: 'running'
    })

    try {
      const syncResult = await StoreManagementService.syncStoresFromGmb(tokens)
      
      if (syncResult.success) {
        testResults.steps[testResults.steps.length - 1] = {
          step: 2,
          name: 'Sync stores from GMB to database',
          status: 'success',
          data: syncResult.data
        }
        testResults.summary.successfulSteps++
      } else {
        testResults.steps[testResults.steps.length - 1] = {
          step: 2,
          name: 'Sync stores from GMB to database',
          status: 'failed',
          error: syncResult.error
        }
        testResults.summary.failedSteps++
        testResults.summary.errors.push(`Step 2: ${syncResult.error}`)
      }
    } catch (error) {
      testResults.steps[testResults.steps.length - 1] = {
        step: 2,
        name: 'Sync stores from GMB to database',
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
      testResults.summary.failedSteps++
      testResults.summary.errors.push(`Step 2: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    // Step 3: Test creating a new store with GMB integration
    testResults.steps.push({
      step: 3,
      name: 'Create new store with GMB integration',
      status: 'running'
    })

    try {
      // Get first account for testing
      const { GmbApiServerService } = await import('@/lib/server/gmb-api-server')
      const gmbService = new GmbApiServerService(tokens)
      const accounts = await gmbService.getAccounts()
      
      if (accounts.length > 0) {
        const testStoreData = {
          name: `Test Store ${Date.now()}`,
          storeCode: `TEST-${Date.now()}`,
          email: 'test@example.com',
          phone: '+1234567890',
          address: {
            line1: '123 Test Street',
            line2: 'Suite 100',
            locality: 'Test City',
            city: 'Test City',
            state: 'TS',
            postalCode: '12345',
            countryCode: 'US'
          },
          primaryCategory: 'Test Business',
          brandEmail: 'test@example.com',
          brandName: 'Test Brand',
          createInGmb: true,
          gmbAccountName: accounts[0].name
        }

        const createResult = await StoreManagementService.createStore(testStoreData, tokens)
        
        if (createResult.success) {
          testResults.steps[testResults.steps.length - 1] = {
            step: 3,
            name: 'Create new store with GMB integration',
            status: 'success',
            data: {
              storeId: createResult.data?.store?._id,
              gmbLocationId: createResult.data?.gmbLocation?.id
            }
          }
          testResults.summary.successfulSteps++
        } else {
          testResults.steps[testResults.steps.length - 1] = {
            step: 3,
            name: 'Create new store with GMB integration',
            status: 'failed',
            error: createResult.error
          }
          testResults.summary.failedSteps++
          testResults.summary.errors.push(`Step 3: ${createResult.error}`)
        }
      } else {
        testResults.steps[testResults.steps.length - 1] = {
          step: 3,
          name: 'Create new store with GMB integration',
          status: 'skipped',
          reason: 'No GMB accounts available for testing'
        }
      }
    } catch (error) {
      testResults.steps[testResults.steps.length - 1] = {
        step: 3,
        name: 'Create new store with GMB integration',
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
      testResults.summary.failedSteps++
      testResults.summary.errors.push(`Step 3: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    // Step 4: Test fetching stores from database
    testResults.steps.push({
      step: 4,
      name: 'Fetch stores from database',
      status: 'running'
    })

    try {
      const dbStoresResult = await StoreManagementService.getGmbStores(
        1, 10, '', '', '', false
      )
      
      if (dbStoresResult.success) {
        testResults.steps[testResults.steps.length - 1] = {
          step: 4,
          name: 'Fetch stores from database',
          status: 'success',
          data: {
            totalStores: dbStoresResult.data?.pagination?.total || 0,
            stores: dbStoresResult.data?.stores?.length || 0
          }
        }
        testResults.summary.successfulSteps++
      } else {
        testResults.steps[testResults.steps.length - 1] = {
          step: 4,
          name: 'Fetch stores from database',
          status: 'failed',
          error: dbStoresResult.error
        }
        testResults.summary.failedSteps++
        testResults.summary.errors.push(`Step 4: ${dbStoresResult.error}`)
      }
    } catch (error) {
      testResults.steps[testResults.steps.length - 1] = {
        step: 4,
        name: 'Fetch stores from database',
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
      testResults.summary.failedSteps++
      testResults.summary.errors.push(`Step 4: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    testResults.summary.totalSteps = testResults.steps.length

    return NextResponse.json({
      success: testResults.summary.failedSteps === 0,
      data: testResults,
      message: `Store management flow test completed. ${testResults.summary.successfulSteps}/${testResults.summary.totalSteps} steps successful.`
    })
  } catch (error) {
    console.error('Error testing store flow:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to test store flow' },
      { status: 500 }
    )
  }
}
