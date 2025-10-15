import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/database/connection'
import { Brand } from '@/lib/database/models'
import { getGmbTokensFromRequest, getAllAccessibleAccounts, getAllBrandAccountIds } from '@/lib/utils/auth-helpers'

export async function GET(request: NextRequest) {
  try {
    await connectDB()
    
    // Get all account IDs that belong to this brand/platform
    const brandAccountIds = await getAllBrandAccountIds()
    
    // Find all brands with GMB integration for these accounts
    const brands = await Brand.find({
      'settings.gmbIntegration.connected': true,
      'settings.gmbIntegration.gmbAccountId': { $in: brandAccountIds }
    }).select('name email settings.gmbIntegration').lean()

    // Create accounts for all brand account IDs
    const accounts = []
    
    for (const accountId of brandAccountIds) {
      const brand = brands.find(b => b.settings?.gmbIntegration?.gmbAccountId === accountId)
      
      // Determine account name based on stores
      let accountName = 'Unknown Account'
      if (accountId === '112022557985287772374') {
        accountName = 'Storecom & Flamboyant'
      } else if (accountId === '108373201951951441069') {
        accountName = 'Colive Properties'
      }
      
      accounts.push({
        id: accountId,
        name: accountName,
        email: brand?.email || 'storecom37@gmail.com',
        brandName: brand?.name || 'Storecom',
        lastSyncAt: brand?.settings?.gmbIntegration?.lastSyncAt,
        connected: !!brand
      })
    }

    // Remove duplicates (in case multiple brands have same GMB account)
    const uniqueAccounts = accounts.filter((account, index, self) => 
      index === self.findIndex(a => a.id === account.id)
    )

    return NextResponse.json({
      success: true,
      data: uniqueAccounts,
      count: uniqueAccounts.length,
      debug: {
        brandAccountIds,
        brandsFound: brands.length,
        uniqueAccountsFound: uniqueAccounts.length
      }
    })
    
  } catch (error: unknown) {
    console.error('Error fetching GMB accounts:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch accounts' 
      },
      { status: 500 }
    )
  }
}
