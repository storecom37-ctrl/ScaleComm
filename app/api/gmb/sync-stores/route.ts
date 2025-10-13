import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/database/connection'
import { Store, Brand } from '@/lib/database/models'
import { getGmbTokensFromRequest } from '@/lib/utils/auth-helpers'
import { GmbApiServerService } from '@/lib/server/gmb-api-server'

// POST /api/gmb/sync-stores - Sync all stores from GMB to database
export async function POST(request: NextRequest) {
  try {
    await connectDB()

    // Get GMB tokens from request
    const tokens = await getGmbTokensFromRequest()
    if (!tokens) {
      return NextResponse.json(
        { success: false, error: 'GMB authentication required' },
        { status: 401 }
      )
    }

    // Initialize GMB API service
    const gmbService = new GmbApiServerService(tokens)

    // Get account info
    const accountInfo = await gmbService.getAccountInfo()
    console.log('🔄 GMB Sync Stores - Account info:', accountInfo)

    // Get all accounts
    const accounts = await gmbService.getAccounts()
    console.log('🔄 GMB Sync Stores - Available accounts:', accounts.length)

    if (accounts.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        message: 'No GMB accounts found',
        stats: {
          accounts: 0,
          storesCreated: 0,
          storesUpdated: 0,
          errors: 0
        }
      })
    }

    let totalStoresCreated = 0
    let totalStoresUpdated = 0
    let totalErrors = 0
    const errors: string[] = []

    // Process each account
    for (const account of accounts) {
      try {
        console.log(`🔄 Processing account: ${account.name}`)
        
        // Get locations from GMB
        const locations = await gmbService.getLocations(account.name)
        console.log(`🔄 Found ${locations.length} locations in account ${account.name}`)

        // Find or create brand for this account
        let brand = await Brand.findOne({ 
          $or: [
            { email: accountInfo.email },
            { 'users.owner.email': accountInfo.email },
            { 'settings.gmbIntegration.gmbAccountId': account.name }
          ]
        })

        if (!brand) {
          // Create brand automatically
          brand = new Brand({
            name: account.accountName || accountInfo.name || 'GMB Business',
            slug: (account.accountName || accountInfo.name || 'gmb-business').toLowerCase().replace(/[^a-z0-9]/g, '-'),
            email: accountInfo.email,
            description: 'Business connected via Google My Business',
            address: {
              line1: 'Address not available',
              locality: 'Unknown',
              city: 'Unknown',
              state: 'Unknown',
              postalCode: '00000',
              country: 'US'
            },
            users: {
              owner: {
                name: accountInfo.name || 'Business Owner',
                email: accountInfo.email,
                password: 'gmb-auto-generated',
                role: 'owner'
              }
            },
            settings: {
              gmbIntegration: {
                connected: true,
                gmbAccountId: account.name,
                gmbAccountName: account.accountName || accountInfo.name,
                lastSyncAt: new Date()
              }
            }
          })
          
          await brand.save()
          console.log('✅ Auto-created brand for GMB sync:', brand.name)
        } else {
          // Update brand with latest GMB info
          await Brand.findByIdAndUpdate(brand._id, {
            'settings.gmbIntegration.gmbAccountId': account.name,
            'settings.gmbIntegration.gmbAccountName': account.accountName || accountInfo.name,
            'settings.gmbIntegration.lastSyncAt': new Date()
          })
          console.log('✅ Updated brand GMB integration:', brand.name)
        }

        // Process each location
        for (const location of locations) {
          try {
            // Use atomic upsert to prevent duplicates
            const baseSlug = location.name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').trim()
            const uniqueStoreCode = `GMB-${account.name}-${location.id.split('/').pop()}-${Date.now()}`
            
            const storeData = {
              brandId: brand._id,
              name: location.name,
              storeCode: uniqueStoreCode,
              slug: baseSlug,
              email: accountInfo.email,
              phone: location.phoneNumber,
              address: {
                line1: location.address.split(',')[0] || '',
                line2: '',
                locality: location.address.split(',')[location.address.split(',').length - 2]?.trim() || '',
                city: location.address.split(',')[location.address.split(',').length - 2]?.trim() || '',
                state: location.address.split(',')[location.address.split(',').length - 2]?.trim() || '',
                postalCode: location.address.split(',').pop()?.trim() || '',
                countryCode: 'US'
              },
              primaryCategory: location.categories[0] || 'Business',
              gmbLocationId: location.id,
              gmbAccountId: account.name,
              status: 'active',
              lastSyncAt: new Date(),
              // Save GMB websiteUri as microsite.gmbUrl and mapsUrl
              microsite: {
                gmbUrl: (location as any).websiteUri || location.micrositeUrl || location.websiteUrl,
                mapsUrl: (location as any).metadata?.mapsUri || location.mapsUri // Save Google Maps URL
              },
              // Save complete GMB metadata including mapsUri
              gmbData: {
                metadata: {
                  categories: (location as any).categories?.additionalCategories || [],
                  websiteUrl: (location as any).websiteUri || location.websiteUrl,
                  phoneNumber: (location as any).phoneNumbers?.primaryPhone || location.phoneNumber,
                  businessStatus: (location as any).businessStatus || 'OPEN',
                  priceLevel: (location as any).priceLevel || 'PRICE_LEVEL_UNSPECIFIED',
                  primaryCategory: (location as any).categories?.primaryCategory?.displayName || location.categories?.[0],
                  additionalCategories: (location as any).categories?.additionalCategories || [],
                  mapsUri: (location as any).metadata?.mapsUri || location.mapsUri // Save Google Maps URL
                },
                verified: location.verified || false,
                lastSyncAt: new Date()
              }
            }

            // Use findOneAndUpdate with upsert to atomically create or update
            const result = await Store.findOneAndUpdate(
              { gmbLocationId: location.id },
              storeData,
              { 
                upsert: true, 
                new: true,
                runValidators: true
              }
            )

            if (result.isNew) {
              totalStoresCreated++
              console.log(`✅ Created new store: ${result.name}`)
            } else {
              totalStoresUpdated++
              console.log(`✅ Updated existing store: ${result.name}`)
            }
          } catch (storeError) {
            console.error(`❌ Error processing store ${location.name}:`, storeError)
            totalErrors++
            errors.push(`Failed to process store ${location.name}: ${storeError instanceof Error ? storeError.message : 'Unknown error'}`)
          }
        }
      } catch (accountError) {
        console.error(`❌ Error processing account ${account.name}:`, accountError)
        totalErrors++
        errors.push(`Failed to process account ${account.name}: ${accountError instanceof Error ? accountError.message : 'Unknown error'}`)
      }
    }

    // Get final count of stores
    const totalStores = await Store.countDocuments({ gmbLocationId: { $exists: true } })

    return NextResponse.json({
      success: true,
      message: 'GMB stores synced successfully',
      stats: {
        accounts: accounts.length,
        storesCreated: totalStoresCreated,
        storesUpdated: totalStoresUpdated,
        totalStores: totalStores,
        errors: totalErrors
      },
      errors: errors.length > 0 ? errors : undefined
    })
  } catch (error) {
    console.error('Error syncing GMB stores:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to sync GMB stores' },
      { status: 500 }
    )
  }
}
