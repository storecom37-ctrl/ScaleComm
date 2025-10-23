import connectDB from '@/lib/database/connection'
import { Brand, Store } from '@/lib/database/models'
import { Review, Post } from '@/lib/database/separate-models'

export interface GmbSyncData {
  account: any
  locations: any[]
  reviews: any[]
  posts: any[]
  performance?: any
}

export class GmbSyncService {
  
  /**
   * Create or update brand from GMB location
   */
  static async createBrandFromLocation(location: any, accountId: string): Promise<any> {
    await connectDB()
    
    try {
      // Check if brand already exists by GMB location ID or name
      const existingBrand = await Brand.findOne({ 
        $or: [
          { name: location.name },
          { 'settings.gmbIntegration.gmbLocationId': location.id }
        ]
      })
      
      if (existingBrand) {
        // Update existing brand with GMB data
        const updatedBrand = await Brand.findOneAndUpdate(
          { _id: existingBrand._id },
          {
            name: location.name,
            description: existingBrand.description || `${location.name} - ${location.categories?.[0] || 'Business'} located at ${location.address}`,
            website: location.websiteUrl || existingBrand.website,
            phone: location.phoneNumber || existingBrand.phone,
            industry: location.categories?.[0] || existingBrand.industry || 'business',
            primaryCategory: location.categories?.[0] || existingBrand.primaryCategory || 'business',
            address: existingBrand.address || {
              line1: location.address.split(',')[0] || '',
              city: location.address.split(',')[location.address.split(',').length - 2]?.trim() || '',
              state: location.address.split(',')[location.address.split(',').length - 2]?.trim() || '',
              postalCode: location.address.split(',').pop()?.trim() || '',
              country: 'India'
            },
            settings: {
              ...existingBrand.settings,
              gmbIntegration: {
                connected: true,
                gmbLocationId: location.id,
                gmbAccountId: accountId,
                lastSyncAt: new Date()
              }
            }
          },
          { new: true }
        )
        
        return updatedBrand
      } else {
        // Create new brand from GMB location
        const newBrand = new Brand({
          name: location.name,
          slug: location.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
          description: `${location.name} - ${location.categories?.[0] || 'Business'} located at ${location.address}`,
          website: location.websiteUrl,
          phone: location.phoneNumber,
          industry: location.categories?.[0] || 'business',
          primaryCategory: location.categories?.[0] || 'business',
          address: {
            line1: location.address.split(',')[0] || '',
            city: location.address.split(',')[location.address.split(',').length - 2]?.trim() || '',
            state: location.address.split(',')[location.address.split(',').length - 2]?.trim() || '',
            postalCode: location.address.split(',').pop()?.trim() || '',
            country: 'India'
          },
          settings: {
            gmbIntegration: {
              connected: true,
              gmbLocationId: location.id,
              gmbAccountId: accountId,
              lastSyncAt: new Date()
            }
          }
        })
        
        const savedBrand = await newBrand.save()
        
        return savedBrand
      }
    } catch (error) {
      console.error('Error creating/updating brand from location:', error)
      throw error
    }
  }

  /**
   * Create or update store from GMB location
   */
  static async createStoreFromLocation(location: any, brandId: string): Promise<any> {
    await connectDB()
    
    try {
      // Check if store already exists
      const existingStore = await Store.findOne({ 
        $or: [
          { name: location.name },
          { gmbLocationId: location.id }
        ]
      })
      
      if (existingStore) {
        // Update existing store with GMB data (don't change slug for existing stores)
        const updatedStore = await Store.findOneAndUpdate(
          { _id: existingStore._id },
          {
            name: location.name,
            storeCode: location.name.replace(/\s+/g, '-').toLowerCase(),
            // Keep existing slug to avoid duplicates
            phone: (location as any).phoneNumbers?.primaryPhone || location.phoneNumber || existingStore.phone,
            address: {
              ...existingStore.address,
              line1: (location as any).storefrontAddress?.addressLines?.[0] || location.address?.split(',')[0] || '',
              line2: (location as any).storefrontAddress?.addressLines?.slice(1).join(', ') || '',
              locality: (location as any).storefrontAddress?.locality || location.address?.split(',')[location.address.split(',').length - 2]?.trim() || '',
              city: (location as any).storefrontAddress?.locality || location.address?.split(',')[location.address.split(',').length - 2]?.trim() || '',
              state: (location as any).storefrontAddress?.administrativeArea || location.address?.split(',')[location.address.split(',').length - 2]?.trim() || '',
              postalCode: (location as any).storefrontAddress?.postalCode || location.address?.split(',').pop()?.trim() || '',
              countryCode: (location as any).storefrontAddress?.regionCode || 'IN',
              // Extract coordinates from GMB API response
              latitude: (location as any).latlng?.latitude,
              longitude: (location as any).latlng?.longitude
            },
            primaryCategory: (location as any).categories?.primaryCategory?.displayName || location.categories?.[0] || existingStore.primaryCategory || 'Business',
            additionalCategories: (location as any).categories?.additionalCategories || [],
            brandId: brandId,
            gmbLocationId: location.name, // Use location.name as it contains the full GMB location path
            status: location.verified ? 'active' : (existingStore.status || 'draft'),
            verified: location.verified || false,
            lastSyncAt: new Date(),
            // Update microsite URL from GMB (websiteUri from Business Information API)
            'microsite.gmbUrl': (location as any).websiteUri || location.micrositeUrl || location.websiteUrl || existingStore.microsite?.gmbUrl,
            'microsite.mapsUrl': (location as any).metadata?.mapsUri || location.mapsUri, // Save Google Maps URL
            // Save complete GMB metadata
            'gmbData.metadata': {
              categories: (location as any).categories?.additionalCategories || [],
              websiteUrl: (location as any).websiteUri,
              phoneNumber: (location as any).phoneNumbers?.primaryPhone,
              businessStatus: (location as any).businessStatus || 'OPEN',
              priceLevel: (location as any).priceLevel || 'PRICE_LEVEL_UNSPECIFIED',
              primaryCategory: (location as any).categories?.primaryCategory?.displayName,
              additionalCategories: (location as any).categories?.additionalCategories || [],
              mapsUri: (location as any).metadata?.mapsUri || location.mapsUri // Save Google Maps URL
            },
            'gmbData.verified': location.verified || false,
            'gmbData.lastSyncAt': new Date()
          },
          { new: true }
        )
        
        return updatedStore
      } else {
        // Generate unique slug for new store
        const baseSlug = location.name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').trim()
        let slug = baseSlug
        let counter = 1
        
        // Check for duplicate slug and make it unique
        while (await Store.findOne({ slug })) {
          slug = `${baseSlug}-${counter}`
          counter++
        }
        
        // Create new store from GMB location with duplicate handling
        try {
          const newStore = new Store({
            brandId: brandId,
            name: location.name,
            storeCode: location.name.replace(/\s+/g, '-').toLowerCase(),
            slug: slug, // Use the unique slug we generated
            email: 'N/A',
            phone: (location as any).phoneNumbers?.primaryPhone || location.phoneNumber,
            address: {
              line1: (location as any).storefrontAddress?.addressLines?.[0] || location.address?.split(',')[0] || '',
              line2: (location as any).storefrontAddress?.addressLines?.slice(1).join(', ') || '',
              locality: (location as any).storefrontAddress?.locality || location.address?.split(',')[location.address.split(',').length - 2]?.trim() || '',
              city: (location as any).storefrontAddress?.locality || location.address?.split(',')[location.address.split(',').length - 2]?.trim() || '',
              state: (location as any).storefrontAddress?.administrativeArea || location.address?.split(',')[location.address.split(',').length - 2]?.trim() || '',
              postalCode: (location as any).storefrontAddress?.postalCode || location.address?.split(',').pop()?.trim() || '',
              countryCode: (location as any).storefrontAddress?.regionCode || 'IN',
              // Extract coordinates from GMB API response
              latitude: (location as any).latlng?.latitude,
              longitude: (location as any).latlng?.longitude
            },
            primaryCategory: (location as any).categories?.primaryCategory?.displayName || location.categories?.[0] || 'Business',
            additionalCategories: (location as any).categories?.additionalCategories || [],
            gmbLocationId: location.name, // Use location.name as it contains the full GMB location path
            status: location.verified ? 'active' : 'draft',
            verified: location.verified || false,
            lastSyncAt: new Date(),
            // Add microsite URL from GMB (websiteUri from Business Information API)
            microsite: {
              gmbUrl: (location as any).websiteUri || location.micrositeUrl || location.websiteUrl,
              mapsUrl: (location as any).metadata?.mapsUri || location.mapsUri // Save Google Maps URL
            },
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
            }
          })
          
          const savedStore = await newStore.save()
          
          return savedStore
        } catch (error: any) {
          if (error.code === 11000 && error.keyPattern?.slug) {
            // Handle duplicate slug error by using upsert
            
            const upsertedStore = await Store.findOneAndUpdate(
              { gmbLocationId: location.id },
              {
                brandId: brandId,
                name: location.name,
                storeCode: location.name.replace(/\s+/g, '-').toLowerCase(),
                slug: `${slug}-${Date.now()}`, // Use timestamp to ensure uniqueness
                email: 'N/A',
                phone: location.phoneNumber,
                address: {
                  line1: location.address.split(',')[0] || '',
                  city: location.address.split(',')[location.address.split(',').length - 2]?.trim() || '',
                  state: location.address.split(',')[location.address.split(',').length - 2]?.trim() || '',
                  postalCode: location.address.split(',').pop()?.trim() || '',
                  countryCode: 'IN'
                },
                primaryCategory: location.categories?.[0] || 'Business',
                gmbLocationId: location.id,
                status: location.verified ? 'active' : 'draft',
                // Add microsite URL from GMB (websiteUri from Business Information API)
                microsite: {
                  gmbUrl: (location as any).websiteUri || location.micrositeUrl || location.websiteUrl,
                  mapsUrl: (location as any).metadata?.mapsUri || location.mapsUri // Save Google Maps URL
                }
              },
              { upsert: true, new: true }
            )
            
            return upsertedStore
          } else {
            throw error
          }
        }
      }
    } catch (error) {
      console.error('Error creating/updating store from location:', error)
      throw error
    }
  }

  /**
   * Save reviews data to separate Review collection
   */
  static async saveReviewsToDatabase(reviews: any[]): Promise<number> {
    await connectDB()
    
    try {
      let savedCount = 0
      
      for (const review of reviews) {
        // Find store by GMB location ID
        const store = await Store.findOne({ gmbLocationId: review.locationId })
        
        if (store) {
          // Find brand for this store
          const brand = await Brand.findById(store.brandId)
          
          if (brand) {
            // Check if review already exists
            const existingReview = await Review.findOne({ gmbReviewId: review.id })
            
            const reviewData = {
              gmbReviewId: review.id,
              storeId: store._id,
              brandId: brand._id,
              accountId: brand.settings?.gmbIntegration?.gmbAccountId || '',
              reviewer: {
                displayName: review.reviewer?.displayName || 'Anonymous',
                profilePhotoUrl: review.reviewer?.profilePhotoUrl || '',
                isAnonymous: review.reviewer?.isAnonymous || false
              },
              starRating: review.starRating,
              comment: review.comment || '',
              gmbCreateTime: new Date(review.createTime),
              gmbUpdateTime: new Date(review.updateTime),
              hasResponse: !!review.response,
              response: review.response ? {
                comment: review.response.comment,
                responseTime: new Date(review.response.updateTime || review.response.createTime),
                respondedBy: 'GMB'
              } : undefined,
              status: 'active',
              source: 'gmb'
            }
            
            if (existingReview) {
              // Update existing review
              await Review.findOneAndUpdate(
                { gmbReviewId: review.id },
                reviewData,
                { new: true }
              )
            } else {
              // Create new review
              await Review.create(reviewData)
            }
            
            savedCount++
          }
        }
      }
      
      
      return savedCount
    } catch (error) {
      console.error('Error saving reviews to database:', error)
      throw error
    }
  }

  /**
   * Save posts data to separate Post collection
   */
  static async savePostsToDatabase(posts: any[]): Promise<number> {
    await connectDB()
    
    try {
      let savedCount = 0
      
      for (const post of posts) {
        // Find store by GMB location ID
        const store = await Store.findOne({ gmbLocationId: post.locationId })
        
        if (store) {
          // Find brand for this store
          const brand = await Brand.findById(store.brandId)
          
          if (brand) {
            // Check if post already exists
            const existingPost = await Post.findOne({ gmbPostId: post.id })
            
            const postData = {
              gmbPostId: post.id,
              storeId: store._id,
              brandId: brand._id,
              accountId: brand.settings?.gmbIntegration?.gmbAccountId || '',
              summary: post.summary || '',
              callToAction: post.callToAction ? {
                actionType: post.callToAction.actionType,
                url: post.callToAction.url
              } : undefined,
              media: post.media || [],
              gmbCreateTime: new Date(post.createTime),
              gmbUpdateTime: new Date(post.updateTime),
              languageCode: post.languageCode || 'en',
              state: post.state || 'LIVE',
              topicType: post.topicType || 'STANDARD',
              event: post.event || undefined,
              searchUrl: post.searchUrl || '',
              status: 'active',
              source: 'gmb'
            }
            
            if (existingPost) {
              // Update existing post
              await Post.findOneAndUpdate(
                { gmbPostId: post.id },
                postData,
                { new: true }
              )
            } else {
              // Create new post
              await Post.create(postData)
            }
            
            savedCount++
          }
        }
      }
      
      
      return savedCount
    } catch (error) {
      console.error('Error saving posts to database:', error)
      throw error
    }
  }

  /**
   * Complete sync of all GMB data to Brand and Store models
   */
  static async syncAllData(gmbData: GmbSyncData): Promise<any> {
    try {
      
      
      const results = {
        brands: 0,
        stores: 0,
        reviews: 0,
        posts: 0
      }
      
      // Process each location
      for (const location of gmbData.locations) {
        // 1. Create or update brand
        const brand = await this.createBrandFromLocation(location, gmbData.account.id)
        results.brands++
        
        // 2. Create or update store
        const store = await this.createStoreFromLocation(location, brand._id)
        results.stores++
      }
      
      // 3. Save reviews to separate collection
      if (gmbData.reviews && gmbData.reviews.length > 0) {
        results.reviews = await this.saveReviewsToDatabase(gmbData.reviews)
      }
      
      // 4. Save posts to separate collection
      if (gmbData.posts && gmbData.posts.length > 0) {
        results.posts = await this.savePostsToDatabase(gmbData.posts)
      }
      
      
      
      return {
        account: gmbData.account,
        locations: gmbData.locations.length,
        ...results
      }
    } catch (error) {
      console.error('Error in complete GMB sync:', error)
      throw error
    }
  }

  /**
   * Get sync statistics
   */
  static async getSyncStats(): Promise<any> {
    await connectDB()
    
    try {
      const [brandCount, storeCount] = await Promise.all([
        Brand.countDocuments({ 'settings.gmbIntegration.connected': true }),
        Store.countDocuments({ gmbLocationId: { $exists: true, $ne: null } })
      ])
      
      // Count reviews and posts from stores
      const storesWithReviews = await Store.countDocuments({ 
        reviews: { $exists: true, $ne: [] } 
      })
      const storesWithPosts = await Store.countDocuments({ 
        posts: { $exists: true, $ne: [] } 
      })
      
      return {
        brands: brandCount,
        stores: storeCount,
        reviews: storesWithReviews,
        posts: storesWithPosts
      }
    } catch (error) {
      console.error('Error getting sync stats:', error)
      throw error
    }
  }
}

export default GmbSyncService