import { Store, Brand } from '@/lib/database/models'
import { GmbApiServerService, GmbLocation } from '@/lib/server/gmb-api-server'
import connectDB from '@/lib/database/connection'

export interface StoreManagementResult {
  success: boolean
  data?: any
  message: string
  error?: string
}

export interface StoreCreateData {
  // Basic store information
  name: string
  storeCode: string
  email: string
  phone?: string
  address: {
    line1: string
    line2?: string
    locality: string
    city: string
    state: string
    postalCode: string
    countryCode: string
  }
  primaryCategory?: string
  additionalCategories?: string[]
  
  // Brand information
  brandId?: string
  brandEmail?: string
  brandName?: string
  
  // GMB integration
  createInGmb?: boolean
  gmbAccountName?: string
}

export interface StoreUpdateData {
  name?: string
  phone?: string
  address?: {
    line1?: string
    line2?: string
    locality?: string
    city?: string
    state?: string
    postalCode?: string
    countryCode?: string
  }
  primaryCategory?: string
  website?: string
}

export class StoreManagementService {
  /**
   * Create a new store with optional GMB integration
   */
  static async createStore(
    storeData: StoreCreateData,
    gmbTokens?: any
  ): Promise<StoreManagementResult> {
    try {
      await connectDB()

      // Validate required fields
      const requiredFields = ['name', 'storeCode', 'email', 'address']
      for (const field of requiredFields) {
        if (!storeData[field as keyof StoreCreateData]) {
          return {
            success: false,
            message: `${field} is required`,
            error: `Missing required field: ${field}`
          }
        }
      }

      // Find or create brand
      let brand: any = null
      if (storeData.brandId) {
        brand = await Brand.findById(storeData.brandId)
        if (!brand) {
          return {
            success: false,
            message: 'Brand not found',
            error: 'Invalid brand ID provided'
          }
        }
      } else if (storeData.brandEmail) {
        brand = await Brand.findOne({ 
          $or: [
            { email: storeData.brandEmail },
            { 'users.owner.email': storeData.brandEmail }
          ]
        })

        if (!brand) {
          // Create brand automatically
          brand = new Brand({
            name: storeData.brandName || 'GMB Business',
            slug: (storeData.brandName || 'gmb-business').toLowerCase().replace(/[^a-z0-9]/g, '-'),
            email: storeData.brandEmail,
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
                name: storeData.brandName || 'Business Owner',
                email: storeData.brandEmail,
                password: 'gmb-auto-generated',
                role: 'owner'
              }
            },
            settings: {
              gmbIntegration: {
                connected: false
              }
            }
          })
          
          await brand.save()
          console.log('✅ Auto-created brand for store:', brand.name)
        }
      } else {
        return {
          success: false,
          message: 'Brand information is required',
          error: 'Either brandId or brandEmail must be provided'
        }
      }

      // Check if store code already exists
      const existingStore = await Store.findOne({ storeCode: storeData.storeCode })
      if (existingStore) {
        return {
          success: false,
          message: 'Store code already exists',
          error: 'A store with this code already exists'
        }
      }

      // Generate slug if not provided
      let slug = storeData.name
        .toLowerCase()
        .replace(/[^a-z0-9 -]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim()

      // Check if slug already exists and make it unique
      let counter = 1
      const originalSlug = slug
      while (await Store.findOne({ slug })) {
        slug = `${originalSlug}-${counter}`
        counter++
      }

      // Create store in database using atomic upsert to prevent duplicates
      const storeDataToSave = {
        brandId: brand._id,
        name: storeData.name,
        storeCode: storeData.storeCode,
        slug: slug,
        email: storeData.email,
        phone: storeData.phone,
        address: storeData.address,
        primaryCategory: storeData.primaryCategory || 'Business',
        additionalCategories: storeData.additionalCategories || [],
        status: 'active'
      }

      // Use findOneAndUpdate with upsert to prevent duplicates
      const store = await Store.findOneAndUpdate(
        { storeCode: storeData.storeCode },
        storeDataToSave,
        { 
          upsert: true, 
          new: true,
          runValidators: true
        }
      )

      // Create in GMB if requested and tokens provided
      let gmbLocation: GmbLocation | null = null
      if (storeData.createInGmb && gmbTokens && storeData.gmbAccountName) {
        try {
          const gmbService = new GmbApiServerService(gmbTokens)
          
          const locationData = {
            title: storeData.name,
            languageCode: 'en-US', // Required field for GMB API
            storefrontAddress: {
              addressLines: [storeData.address.line1, storeData.address.line2].filter((line): line is string => Boolean(line)),
              locality: storeData.address.locality,
              administrativeArea: storeData.address.state,
              postalCode: storeData.address.postalCode,
              regionCode: storeData.address.countryCode
            },
            phoneNumbers: storeData.phone ? {
              primaryPhone: storeData.phone
            } : undefined,
            categories: storeData.primaryCategory ? {
              primaryCategory: {
                name: storeData.primaryCategory,
                displayName: storeData.primaryCategory
              }
            } : undefined
          }

          gmbLocation = await gmbService.createLocation(storeData.gmbAccountName, locationData)
          
          if (gmbLocation) {
            // Update store with GMB location ID
            await Store.findByIdAndUpdate(store._id, {
              gmbLocationId: gmbLocation.id,
              gmbAccountId: storeData.gmbAccountName,
              lastSyncAt: new Date()
            })

            // Update brand GMB integration
            await Brand.findByIdAndUpdate(brand._id, {
              'settings.gmbIntegration.connected': true,
              'settings.gmbIntegration.gmbAccountId': storeData.gmbAccountName,
              'settings.gmbIntegration.lastSyncAt': new Date()
            })

            console.log('✅ Store created in GMB:', gmbLocation.name)
          }
        } catch (gmbError) {
          console.error('Error creating store in GMB:', gmbError)
          // Store was created in database, but GMB creation failed
          // This is not a fatal error
        }
      }

      // Populate brand info before returning
      await store.populate('brandId', 'name slug logo')

      return {
        success: true,
        data: {
          store,
          gmbLocation
        },
        message: gmbLocation 
          ? 'Store created successfully in database and GMB'
          : 'Store created successfully in database'
      }
    } catch (error) {
      console.error('Error creating store:', error)
      return {
        success: false,
        message: 'Failed to create store',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Update an existing store with optional GMB sync
   */
  static async updateStore(
    storeId: string,
    updateData: StoreUpdateData,
    gmbTokens?: any
  ): Promise<StoreManagementResult> {
    try {
      await connectDB()

      // Find store
      const store = await Store.findById(storeId)
      if (!store) {
        return {
          success: false,
          message: 'Store not found',
          error: 'Invalid store ID'
        }
      }

      // Update store in database
      const updatedStore = await Store.findByIdAndUpdate(
        storeId,
        {
          ...updateData,
          lastSyncAt: new Date()
        },
        { new: true }
      ).populate('brandId', 'name slug logo')

      // Update in GMB if store is connected and tokens provided
      let gmbLocation: GmbLocation | null = null
      if (store.gmbLocationId && gmbTokens) {
        try {
          const gmbService = new GmbApiServerService(gmbTokens)
          
          const locationData = {
            title: updateData.name || store.name,
            storefrontAddress: updateData.address ? {
              addressLines: [updateData.address.line1 || store.address.line1, updateData.address.line2 || store.address.line2].filter((line): line is string => Boolean(line)),
              locality: updateData.address.locality || store.address.locality,
              administrativeArea: updateData.address.state || store.address.state,
              postalCode: updateData.address.postalCode || store.address.postalCode,
              regionCode: updateData.address.countryCode || store.address.countryCode
            } : undefined,
            phoneNumbers: updateData.phone ? {
              primaryPhone: updateData.phone
            } : undefined,
            // Skip category updates for now since we don't have gmbCategoryId
            // categories: undefined
          }

          gmbLocation = await gmbService.updateLocation(store.gmbLocationId, locationData)
          console.log('✅ Store updated in GMB:', gmbLocation?.name)
        } catch (gmbError) {
          console.error('Error updating store in GMB:', gmbError)
          // Store was updated in database, but GMB update failed
          // This is not a fatal error
        }
      }

      return {
        success: true,
        data: {
          store: updatedStore,
          gmbLocation
        },
        message: gmbLocation 
          ? 'Store updated successfully in database and GMB'
          : 'Store updated successfully in database'
      }
    } catch (error) {
      console.error('Error updating store:', error)
      return {
        success: false,
        message: 'Failed to update store',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Sync stores from GMB to database
   */
  static async syncStoresFromGmb(gmbTokens: any): Promise<StoreManagementResult> {
    try {
      await connectDB()

      const gmbService = new GmbApiServerService(gmbTokens)

      // Get account info
      const accountInfo = await gmbService.getAccountInfo()
      console.log('🔄 Store Sync - Account info:', accountInfo)

      // Get all accounts
      const accounts = await gmbService.getAccounts()
      console.log('🔄 Store Sync - Available accounts:', accounts.length)

      if (accounts.length === 0) {
        return {
          success: true,
          data: [],
          message: 'No GMB accounts found'
        }
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
              // Check if store already exists
              let store = await Store.findOne({ 
                $or: [
                  { gmbLocationId: location.id },
                  { 'gmbData.locationId': location.id }
                ]
              })

              if (store) {
                // Update existing store
                const updateData = {
                  name: location.name,
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
                  primaryCategory: location.categories[0] || store.primaryCategory,
                  gmbLocationId: location.id,
                  gmbAccountId: account.name,
                  lastSyncAt: new Date()
                }

                await Store.findByIdAndUpdate(store._id, updateData)
                totalStoresUpdated++
                console.log(`✅ Updated store: ${store.name}`)
              } else {
                // Create new store
                const baseSlug = location.name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').trim()
                let slug = baseSlug
                let counter = 1
                
                // Check for duplicate slug and make it unique
                while (await Store.findOne({ slug })) {
                  slug = `${baseSlug}-${counter}`
                  counter++
                }

                const uniqueStoreCode = `GMB-${account.name}-${location.id.split('/').pop()}-${Date.now()}`
                const storeData = {
                  brandId: brand._id,
                  name: location.name,
                  storeCode: uniqueStoreCode,
                  slug: slug,
                  email: accountInfo.email,
                  phone: (location as any).phoneNumbers?.primaryPhone || location.phoneNumber,
                  address: {
                    line1: (location as any).storefrontAddress?.addressLines?.[0] || location.address?.split(',')[0] || '',
                    line2: (location as any).storefrontAddress?.addressLines?.slice(1).join(', ') || '',
                    locality: (location as any).storefrontAddress?.locality || location.address?.split(',')[location.address.split(',').length - 2]?.trim() || '',
                    city: (location as any).storefrontAddress?.locality || location.address?.split(',')[location.address.split(',').length - 2]?.trim() || '',
                    state: (location as any).storefrontAddress?.administrativeArea || location.address?.split(',')[location.address.split(',').length - 2]?.trim() || '',
                    postalCode: (location as any).storefrontAddress?.postalCode || location.address?.split(',').pop()?.trim() || '',
                    countryCode: (location as any).storefrontAddress?.regionCode || 'US',
                    // Extract coordinates from GMB API response
                    latitude: (location as any).latlng?.latitude,
                    longitude: (location as any).latlng?.longitude
                  },
                  primaryCategory: (location as any).categories?.primaryCategory?.displayName || location.categories?.[0] || 'Business',
                  additionalCategories: (location as any).categories?.additionalCategories || [],
                  gmbLocationId: location.name, // Use location.name as it contains the full GMB location path
                  gmbAccountId: account.name,
                  status: 'active',
                  verified: location.verified || false,
                  lastSyncAt: new Date(),
                  // Save complete GMB metadata
                  gmbData: {
                    metadata: {
                      categories: (location as any).categories?.additionalCategories || [],
                      websiteUrl: (location as any).websiteUri,
                      phoneNumber: (location as any).phoneNumbers?.primaryPhone,
                      businessStatus: (location as any).businessStatus || 'OPEN',
                      priceLevel: (location as any).priceLevel || 'PRICE_LEVEL_UNSPECIFIED',
                      primaryCategory: (location as any).categories?.primaryCategory?.displayName,
                      additionalCategories: (location as any).categories?.additionalCategories || [],
                      mapsUri: (location as any).metadata?.mapsUri || location.mapsUri // Save Google Maps URL
                    },
                    verified: location.verified || false,
                    lastSyncAt: new Date()
                  },
                  microsite: {
                    gmbUrl: (location as any).websiteUri,
                    mapsUrl: (location as any).metadata?.mapsUri || location.mapsUri // Save Google Maps URL
                  }
                }

                store = await Store.findOneAndUpdate(
                  { gmbLocationId: location.id },
                  storeData,
                  { 
                    upsert: true, 
                    new: true,
                    runValidators: true
                  }
                )

                if (store?.isNew) {
                  totalStoresCreated++
                  console.log(`✅ Created new store: ${store.name}`)
                } else {
                  totalStoresUpdated++
                  console.log(`✅ Updated existing store: ${store?.name}`)
                }
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

      return {
        success: true,
        data: {
          accounts: accounts.length,
          storesCreated: totalStoresCreated,
          storesUpdated: totalStoresUpdated,
          totalStores: totalStores,
          errors: totalErrors
        },
        message: `GMB stores synced successfully. Created: ${totalStoresCreated}, Updated: ${totalStoresUpdated}, Errors: ${totalErrors}`,
        error: errors.length > 0 ? errors.join('; ') : undefined
      }
    } catch (error) {
      console.error('Error syncing stores from GMB:', error)
      return {
        success: false,
        message: 'Failed to sync stores from GMB',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Get stores with GMB integration
   */
  static async getGmbStores(
    page: number = 1,
    limit: number = 10,
    search?: string,
    status?: string,
    brandId?: string,
    includeGmbData: boolean = false,
    gmbTokens?: any
  ): Promise<StoreManagementResult> {
    try {
      await connectDB()

      const skip = (page - 1) * limit

      // Build query for stores with GMB integration
      const query: Record<string, unknown> = {
        gmbLocationId: { $exists: true, $ne: null }
      }
      
      if (search) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { storeCode: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { 'address.city': { $regex: search, $options: 'i' } },
          { 'address.state': { $regex: search, $options: 'i' } }
        ]
      }

      if (status) {
        query.status = status
      }

      if (brandId) {
        query.brandId = brandId
      }

      // Get stores with pagination and populate brand info
      const [stores, total] = await Promise.all([
        Store.find(query)
          .populate('brandId', 'name slug logo')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Store.countDocuments(query)
      ])

      // If requested, fetch latest GMB data for each store
      let storesWithGmbData = stores
      if (includeGmbData && gmbTokens) {
        try {
          // Initialize GMB API service
          const gmbService = new GmbApiServerService(gmbTokens)

          // Get all accounts
          const accounts = await gmbService.getAccounts()
          
          // Create a map of account names to locations
          const accountLocationsMap = new Map<string, any[]>()
          
          for (const account of accounts) {
            try {
              const locations = await gmbService.getLocations(account.name)
              accountLocationsMap.set(account.name, locations)
            } catch (error) {
              console.error(`Error fetching locations for account ${account.name}:`, error)
            }
          }

          // Update stores with latest GMB data
          storesWithGmbData = stores.map(store => {
            const gmbAccountId = (store as any).gmbAccountId
            const gmbLocationId = (store as any).gmbLocationId
            
            if (gmbAccountId && gmbLocationId) {
              const accountLocations = accountLocationsMap.get(gmbAccountId) || []
              const gmbLocation = accountLocations.find((loc: any) => loc.id === gmbLocationId)
              
              if (gmbLocation) {
                return {
                  ...store,
                  gmbData: {
                    name: gmbLocation.name,
                    address: gmbLocation.address,
                    phone: gmbLocation.phoneNumber,
                    website: gmbLocation.websiteUrl,
                    categories: gmbLocation.categories,
                    verified: gmbLocation.verified,
                    lastSyncAt: new Date()
                  }
                }
              }
            }
            
            return store
          })
        } catch (error) {
          console.error('Error fetching GMB data:', error)
          // Return stores without GMB data if there's an error
        }
      }

      const totalPages = Math.ceil(total / limit)
      const hasNextPage = page < totalPages
      const hasPrevPage = page > 1

      return {
        success: true,
        data: {
          stores: storesWithGmbData,
          pagination: {
            page,
            limit,
            total,
            totalPages,
            hasNextPage,
            hasPrevPage
          }
        },
        message: `Found ${total} GMB stores`
      }
    } catch (error) {
      console.error('Error fetching GMB stores:', error)
      return {
        success: false,
        message: 'Failed to fetch GMB stores',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
}

export default StoreManagementService
