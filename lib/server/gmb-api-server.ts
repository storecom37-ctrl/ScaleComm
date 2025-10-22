// Server-side only GMB API service
import { google } from 'googleapis'
import { GoogleTokens, googleOAuthServerClient } from './google-oauth-server'

export interface GmbLocation {
  id: string
  name: string
  address: string
  phoneNumber?: string
  websiteUrl?: string
  micrositeUrl?: string // Added for database compatibility
  categories: string[]
  primaryCategory?: string
  verified: boolean
  mapsUri?: string // Google Maps URL from metadata
  accountId: string
}

export interface GmbReview {
  id: string
  reviewer: {
    displayName: string
    profilePhotoUrl?: string
    isAnonymous?: boolean
  }
  starRating: number
  comment?: string
  createTime: string
  updateTime: string
  locationId: string
  reviewReply?: {
    comment: string
    updateTime: string
  }
  response?: {
    comment: string
    responseTime: string
    respondedBy?: string
  }
  hasResponse?: boolean
}

export interface GmbPost {
  id: string
  summary?: string
  callToAction?: {
    actionType: string
    url?: string
  }
  media?: Array<{
    mediaFormat: string
    sourceUrl: string
  }>
  createTime: string
  updateTime: string
  locationId: string
  // Additional fields from v4 API
  languageCode?: string
  state?: string
  topicType?: string
  event?: {
    title?: string
    schedule?: {
      startDate?: {
        year: number
        month: number
        day: number
      }
      startTime?: any
      endDate?: {
        year: number
        month: number
        day: number
      }
      endTime?: {
        hours?: number
        minutes?: number
        seconds?: number
      }
    }
  }
  searchUrl?: string
}

export interface GmbInsights {
  locationId: string
  period: {
    startTime: string
    endTime: string
  }
  queries: number
  views: number
  actions: number
  photoViews: number
  callClicks: number
  websiteClicks: number
  directionRequests: number
  businessBookings: number
  businessFoodOrders: number
  businessMessages: number
  desktopSearchImpressions: number
  mobileSearchImpressions: number
  desktopMapsImpressions: number
  mobileMapsImpressions: number
  // Additional fields from new API
  dailyMetrics?: GmbDailyMetrics[]
  websiteClicksSeries?: GmbDailyMetricsTimeSeries | null
  callClicksSeries?: GmbDailyMetricsTimeSeries | null
}

export interface GmbSearchKeyword {
  locationId: string
  keyword: string
  impressions: number
  period: {
    year: number
    month: number
  }
  clicks?: number
  ctr?: number
  position?: number
}

export interface GmbDailyMetrics {
  locationId: string
  date: {
    year: number
    month: number
    day: number
  }
  metrics: {
    websiteClicks?: number
    callClicks?: number
    directionRequests?: number
    businessBookings?: number
    businessFoodOrders?: number
    businessMessages?: number
    desktopSearchImpressions?: number
    mobileMapsImpressions?: number
    [key: string]: number | undefined
  }
}

export interface GmbDailyMetricsTimeSeries {
  locationId: string
  metricType: string
  dailyValues: Array<{
    date: { year: number; month: number; day: number }
    value: number
  }>
}

export class GmbApiServerService {
  private authClient: any

  
  // Use actual location ID instead of hardcoded override
  private getWorkingLocationId(originalLocationId: string): string {
    // Return the original location ID to ensure each store gets its own data
    console.log(`📍 Using actual location ID: ${originalLocationId}`)
    return originalLocationId
  }

  // Helper method to make HTTP requests with retries, backoff, and proper SSL handling
  private async makeRequest(url: string, options: RequestInit = {}): Promise<Response> {
    const defaultOptions: RequestInit = {
      headers: {
        'User-Agent': 'StoreCom-Dashboard/1.0',
        'Accept': 'application/json',
        'Connection': 'keep-alive',
        ...options.headers
      },
      // Bump default timeout to reduce premature aborts on slower Google endpoints
      signal: AbortSignal.timeout(60000)
    }

    const mergedOptions = {
      ...defaultOptions,
      ...options,
      headers: {
        ...defaultOptions.headers,
        ...options.headers
      }
    }

    const maxAttempts = 3
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await fetch(url, mergedOptions)

        // Retry on transient HTTP statuses
        if (!response.ok) {
          const retryableStatus = response.status === 408 || response.status === 429 || (response.status >= 500 && response.status < 600)
          if (retryableStatus && attempt < maxAttempts) {
            const backoffMs = Math.min(1000 * Math.pow(2, attempt - 1) + Math.floor(Math.random() * 250), 5000)
            console.warn(`Transient HTTP ${response.status} for ${url}. Retrying in ${backoffMs}ms (attempt ${attempt}/${maxAttempts})`)
            await new Promise(resolve => setTimeout(resolve, backoffMs))
            continue
          }
        }

        return response
      } catch (error: any) {
        // Handle SSL/TLS errors specifically
        if (error?.message?.includes('SSL') || error?.message?.includes('TLS') || error?.message?.includes('ssl3_read_bytes')) {
          console.error('SSL/TLS error detected:', error.message)
          throw new Error(`SSL connection failed: ${error.message}. This may be due to network configuration or Google API access issues.`)
        }

        const isAbort = error?.name === 'AbortError' || error?.message?.toLowerCase?.().includes('timeout')
        const isNetwork = error?.code === 'ECONNRESET' || error?.code === 'ETIMEDOUT' || error?.message?.includes('network')

        if ((isAbort || isNetwork) && attempt < maxAttempts) {
          const backoffMs = Math.min(1000 * Math.pow(2, attempt - 1) + Math.floor(Math.random() * 250), 5000)
          console.warn(`Network/timeout error for ${url}. Retrying in ${backoffMs}ms (attempt ${attempt}/${maxAttempts})`, error?.message || error)
          await new Promise(resolve => setTimeout(resolve, backoffMs))
          continue
        }

        throw error
      }
    }

    // Fallback (should not reach here)
    throw new Error('Request failed after retries')
  }
  private oauth2: any

  constructor(tokens: GoogleTokens) {
    googleOAuthServerClient.setCredentials(tokens)
    this.authClient = googleOAuthServerClient.getAuthClient()
    
    this.oauth2 = google.oauth2({
      version: 'v2',
      auth: this.authClient
    })
  }

  async getAccountInfo() {
    try {
      const response = await this.oauth2.userinfo.get()
      return {
        id: response.data.id,
        email: response.data.email,
        name: response.data.name,
        picture: response.data.picture
      }
    } catch (error) {
      console.error('Error fetching account info:', error)
      throw new Error('Failed to fetch account information')
    }
  }

  async getAccounts() {
    try {
      // Check if access token exists and is valid
      if (!this.authClient.credentials.access_token) {
        throw new Error('No access token available - please reconnect to GMB')
      }

      console.log('🔍 Fetching GMB accounts...')
      
      // Use the Business Information API to get accounts
      const response = await this.makeRequest('https://mybusinessbusinessinformation.googleapis.com/v1/accounts', {
        headers: {
          'Authorization': `Bearer ${this.authClient.credentials.access_token}`
        }
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('GMB API Error:', response.status, errorText)
        
        // If 401 Unauthorized, token has expired
        if (response.status === 401) {
          console.error('❌ Received 401 Unauthorized - token expired')
          throw new Error('Authentication failed - token expired. Please refresh the page or reconnect to GMB.')
        }
        
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`)
      }

      const data = await response.json()
      console.log(`✅ Successfully fetched ${data.accounts?.length || 0} GMB accounts`)
      return data.accounts || []
    } catch (error) {
      console.error('❌ Error fetching GMB accounts:', error)
      if (error instanceof Error) {
        throw error
      }
      throw new Error('Failed to fetch GMB accounts')
    }
  }

  /**
   * Fetch valid GMB categories
   */
  async getCategories(regionCode: string = 'US', languageCode: string = 'en-US'): Promise<any[]> {
    try {
      console.log(`Fetching GMB categories for region: ${regionCode}, language: ${languageCode}`)
      
      const categoriesUrl = `https://mybusinessbusinessinformation.googleapis.com/v1/categories?regionCode=${regionCode}&languageCode=${languageCode}&view=FULL`
      
      const response = await this.makeRequest(categoriesUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.authClient.credentials.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`GMB Categories API Error:`, response.status, errorText)
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`)
      }

      const data = await response.json()
      console.log(`✅ Fetched ${data.categories?.length || 0} GMB categories`)
      
      // Log some sample categories for debugging
      if (data.categories && data.categories.length > 0) {
        console.log(`📋 Sample categories from API:`, data.categories.slice(0, 3).map((c: any) => ({ name: c.name, displayName: c.displayName })))
      }
      
      return data.categories || []
    } catch (error) {
      console.error('Error fetching GMB categories:', error)
      throw error
    }
  }

  /**
   * Find the best matching GMB category for a given category name
   */
  async findBestCategoryMatch(userCategory: string, regionCode: string = 'US', languageCode: string = 'en-US'): Promise<string | null> {
    try {
      console.log(`🔍 Starting category matching for: "${userCategory}"`)
      
      // First, try common mappings (faster and more reliable)
      const commonMappings: { [key: string]: string } = {
        'restaurant': 'gcid:restaurant',
        'food': 'gcid:restaurant',
        'cafe': 'gcid:cafe',
        'coffee': 'gcid:cafe',
        'hotel': 'gcid:lodging',
        'lodging': 'gcid:lodging',
        'retail': 'gcid:store',
        'store': 'gcid:store',
        'shop': 'gcid:store',
        'beauty': 'gcid:beauty_salon',
        'salon': 'gcid:beauty_salon',
        'health': 'gcid:health',
        'medical': 'gcid:hospital',
        'clinic': 'gcid:hospital',
        'automotive': 'gcid:automotive_repair',
        'car': 'gcid:automotive_repair',
        'repair': 'gcid:automotive_repair',
        'business': 'gcid:business_service',
        'service': 'gcid:business_service',
        'office': 'gcid:business_service'
      }
      
      const normalizedUserCategory = userCategory.toLowerCase().trim()
      const mappedCategory = commonMappings[normalizedUserCategory]
      if (mappedCategory) {
        console.log(`✅ Mapped category: ${userCategory} -> ${mappedCategory}`)
        return mappedCategory
      }
      
      // If no common mapping, try to fetch from GMB API
      console.log(`🔍 No common mapping found, fetching from GMB API...`)
      const categories = await this.getCategories(regionCode, languageCode)
      console.log(`📋 Fetched ${categories.length} categories from GMB API`)
      
      // Log first few categories for debugging
      if (categories.length > 0) {
        console.log(`📋 Sample categories:`, categories.slice(0, 5).map(c => ({ name: c.name, displayName: c.displayName })))
      }
      
      // First, try exact match
      for (const category of categories) {
        if (category.displayName?.toLowerCase() === normalizedUserCategory) {
          console.log(`✅ Exact category match found: ${category.displayName} -> ${category.name}`)
          return category.name
        }
      }
      
      // Then, try partial match
      for (const category of categories) {
        if (category.displayName?.toLowerCase().includes(normalizedUserCategory) || 
            normalizedUserCategory.includes(category.displayName?.toLowerCase() || '')) {
          console.log(`✅ Partial category match found: ${category.displayName} -> ${category.name} for ${userCategory}`)
          return category.name
        }
      }
      
      console.log(`⚠️ No category match found for: ${userCategory}`)
      return null
    } catch (error) {
      console.error('Error finding category match:', error)
      // Return a fallback category if API fails
      console.log(`🔄 Using fallback category due to error`)
      return 'gcid:business_service' // Generic business category
    }
  }

  /**
   * Get a single location by its location name
   */
  async getLocation(locationName: string): Promise<any> {
    try {
      console.log(`Fetching single location: ${locationName}`)
      
      // Extract location ID from locationName format: accounts/{accountId}/locations/{locationId}
      const pathParts = locationName.split('/')
      if (pathParts.length !== 4 || pathParts[0] !== 'accounts' || pathParts[2] !== 'locations') {
        throw new Error(`Invalid location name format: ${locationName}`)
      }
      
      const locationId = pathParts[3]
      const readMask = 'name,languageCode,storeCode,title,phoneNumbers,categories,storefrontAddress,websiteUri,regularHours,specialHours,serviceArea,labels,adWordsLocationExtensions,latlng,openInfo,metadata,profile,relationshipData,moreHours,serviceItems'
      const url = `https://mybusinessbusinessinformation.googleapis.com/v1/locations/${locationId}?readMask=${readMask}`
      
      console.log(`Fetching location at: ${url}`)
      
      const response = await this.makeRequest(url, {
        headers: {
          'Authorization': `Bearer ${this.authClient.credentials.access_token}`
        }
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('GMB Get Location API Error:', response.status, errorText)
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`)
      }

      const location = await response.json()
      console.log(`Successfully fetched location: ${location.title}`)
      return location
    } catch (error) {
      console.error('Error fetching location:', error)
      throw error
    }
  }

  async getLocations(accountName: string): Promise<GmbLocation[]> {
    try {
      // Extract account ID from accountName (format: accounts/112022557985287772374)
      const accountId = accountName.replace('accounts/', '')

      
      let allLocations: any[] = []
      let pageToken: string | undefined = undefined
      const pageSize = 100 // Maximum allowed by GMB API
      let pageCount = 0
      
      console.log(`📍 Starting to fetch locations for account: ${accountId}`)
      
      do {
        pageCount++
        // Build URL with pagination parameters
        let url = `https://mybusinessbusinessinformation.googleapis.com/v1/accounts/${accountId}/locations?readMask=name,languageCode,storeCode,title,phoneNumbers,categories,storefrontAddress,websiteUri,regularHours,specialHours,serviceArea,labels,adWordsLocationExtensions,latlng,openInfo,metadata,profile,relationshipData,moreHours,serviceItems&pageSize=${pageSize}`
        if (pageToken) {
          url += `&pageToken=${pageToken}`
        }

        console.log(`📄 Fetching page ${pageCount} (current total: ${allLocations.length} locations)`)
        
        // Use the Business Information API to get locations
        const response = await this.makeRequest(url, {
          headers: {
            'Authorization': `Bearer ${this.authClient.credentials.access_token}`
          }
        })

        if (!response.ok) {
          const errorText = await response.text()
          console.error('GMB Locations API Error:', response.status, errorText)
          throw new Error(`HTTP error! status: ${response.status} - ${errorText}`)
        }

        const data = await response.json()
        const locations = data.locations || []
        allLocations = [...allLocations, ...locations]
        
        console.log(`📄 Page ${pageCount}: Fetched ${locations.length} locations (total: ${allLocations.length})`)
        
        // Debug: Log metadata for first location to check mapsUri
        if (locations.length > 0 && pageCount === 1) {
          const firstLocation = locations[0]
          console.log('🔍 DEBUG - Raw GMB API Response for first location:', {
            name: firstLocation.title,
            hasMetadata: !!firstLocation.metadata,
            metadata: firstLocation.metadata,
            mapsUri: firstLocation.metadata?.mapsUri,
            allMetadataKeys: firstLocation.metadata ? Object.keys(firstLocation.metadata) : [],
            fullLocationKeys: Object.keys(firstLocation),
            // Check for alternative maps URL fields
            hasMapsUrl: !!firstLocation.mapsUrl,
            hasGoogleMapsUrl: !!firstLocation.googleMapsUrl,
            hasPlaceId: !!firstLocation.placeId,
            // Log the complete metadata object
            completeMetadata: JSON.stringify(firstLocation.metadata, null, 2)
          })
        }
        
        pageToken = data.nextPageToken
        
        if (pageToken) {
          console.log(`📄 More pages available, nextPageToken exists`)
        } else {
          console.log(`📄 No more pages, this was the last page`)
        }
      } while (pageToken)

      console.log(`✅ Completed fetching locations: ${allLocations.length} total locations across ${pageCount} pages`)
      
      return allLocations.map((location: any) => {
        // The location.name from the API comes as "locations/{locationId}"
        // We need to construct the full path as "accounts/{accountId}/locations/{locationId}"
        const locationId = location.name.replace('locations/', '')
        const fullLocationPath = `accounts/${accountId}/locations/${locationId}`

        
        return {
          id: fullLocationPath, // Use the full path format
          name: location.title || 'Unnamed Location',
          address: this.formatAddress(location.storefrontAddress),
          // Return original address components for proper database storage
          storefrontAddress: location.storefrontAddress,
          phoneNumber: location.phoneNumbers?.primaryPhone,
          websiteUrl: location.websiteUri,
          micrositeUrl: location.websiteUri, // Save websiteUri as micrositeUrl for database
          categories: location.categories?.primaryCategory ? [location.categories.primaryCategory.displayName] : [],
          primaryCategory: location.categories?.primaryCategory?.displayName,
          storeCode: location.storeCode,
          languageCode: location.languageCode,
          verified: location.metadata?.hasVoiceOfMerchant || false,
          mapsUri: location.metadata?.mapsUri || this.constructMapsUrl(location), // Save Google Maps URL or construct it
          regularHours: location.regularHours,
          specialHours: location.specialHours,
          serviceArea: location.serviceArea,
          labels: location.labels,
          latlng: location.latlng,
          openInfo: location.openInfo,
          profile: location.profile,
          relationshipData: location.relationshipData,
          moreHours: location.moreHours,
          serviceItems: location.serviceItems,
          accountId: accountName
        }
        
        // Debug: Log the mapped location data for first location
       
      })
    } catch (error) {
      console.error('Error fetching locations:', error)
      throw new Error('Failed to fetch locations')
    }
  }

  // Helper method to construct Google Maps URL from available location data
  private constructMapsUrl(location: any): string | null {
    try {
      // Try to construct from placeId if available
      if (location.placeId) {
        return `https://maps.google.com/maps/place/?q=place_id:${location.placeId}`
      }
      
      // Try to construct from coordinates if available
      if (location.latlng?.latitude && location.latlng?.longitude) {
        return `https://maps.google.com/maps?q=${location.latlng.latitude},${location.latlng.longitude}`
      }
      
      // Try to construct from address
      if (location.storefrontAddress) {
        const address = location.storefrontAddress.addressLines?.join(', ') || ''
        const city = location.storefrontAddress.locality || ''
        const state = location.storefrontAddress.administrativeArea || ''
        const country = location.storefrontAddress.regionCode || ''
        
        if (address && city) {
          const fullAddress = `${address}, ${city}, ${state}, ${country}`.trim()
          return `https://maps.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`
        }
      }
      
      // Try to construct from name and address
      if (location.title && location.storefrontAddress?.locality) {
        const query = `${location.title}, ${location.storefrontAddress.locality}`
        return `https://maps.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
      }
      
      return null
    } catch (error) {
      console.warn('Failed to construct maps URL:', error)
      return null
    }
  }

  async getReviews(locationName: string): Promise<GmbReview[]> {
    try {
      console.log(`Attempting to fetch reviews for location: ${locationName}`)
  
      // Validate and parse locationName
      // Expected format: accounts/{accountId}/locations/{locationId}
      const pathParts = locationName.split('/')
      if (pathParts.length !== 4 || pathParts[0] !== 'accounts' || pathParts[2] !== 'locations') {
        console.error(
          `Invalid location name format: ${locationName}. Expected format: accounts/{accountId}/locations/{locationId}`
        )
        throw new Error(`Invalid location name format: ${locationName}`)
      }
  
      const accountId = pathParts[1]
      const locationId = pathParts[3]
  
      console.log(`Parsed accountId: ${accountId}, locationId: ${locationId}`)
  
      // Candidate endpoints (you can add alternatives here if needed)
      const reviewsUrls = [
        `https://mybusiness.googleapis.com/v4/accounts/${accountId}/locations/${locationId}/reviews`
        // add other potential endpoints here if needed
      ]
  
      let reviews: any[] = []
      const allErrors: any[] = []
      let successfulEndpoint: string | null = null
  
      // Ensure we have an access token
      const accessToken = (this.authClient && this.authClient.credentials && this.authClient.credentials.access_token) || null
      if (!accessToken) {
        const msg = 'No access token available on authClient.credentials.access_token'
        console.error(msg)
        throw new Error(msg)
      }
  
      // Try each endpoint until one works
      for (const baseUrl of reviewsUrls) {
        console.log(`Trying reviews endpoint: ${baseUrl}`)
  
        try {
          let allReviews: any[] = []
          let pageToken: string | undefined = undefined
          const pageSize = 50
  
          // Loop pages
          while (true) {
            // Build URL with pagination params
            const url = new URL(baseUrl)
            url.searchParams.set('pageSize', String(pageSize))
            if (pageToken) url.searchParams.set('pageToken', pageToken)
  
            const reviewsUrl = url.toString()
            console.log(`Fetching reviews page: ${reviewsUrl}`)
  
            const response = await this.makeRequest(reviewsUrl, {
              headers: {
                Authorization: `Bearer ${accessToken}`
              }
            })
  
            if (response.ok) {
              const data = await response.json()
              console.log(`GMB Reviews Response for ${locationName}:`, JSON.stringify(data, null, 2))
  
              const pageReviews = Array.isArray(data.reviews) ? data.reviews : []
              allReviews = allReviews.concat(pageReviews)
  
              // Google sometimes uses nextPageToken; fallback to nextPageToken || nextToken
              pageToken = data.nextPageToken || data.nextToken || undefined
            
              // Mark success and break if no further pages
              successfulEndpoint = baseUrl
              if (!pageToken) break
              // otherwise loop to next page
            } else {
              // non-2xx status
              const errorText = await response.text()
              const error = {
                endpoint: baseUrl,
                status: response.status,
                statusText: response.statusText,
                error: errorText,
                timestamp: new Date().toISOString()
              }
              allErrors.push(error)
              console.warn(`GMB Reviews API Error for ${locationName} at ${reviewsUrl}:`, response.status, errorText)
  
              // If 403/404, try next endpoint; otherwise also try next endpoint
              if (response.status === 403 || response.status === 404) {
                console.log(`Reviews API not available at ${reviewsUrl} (status ${response.status}), trying next endpoint...`)
                break
              } else {
                console.log(`API returned ${response.status}, trying next endpoint...`)
                break
              }
            }
          } // end pagination loop
  
          // If we have success (even zero reviews), set final reviews and exit endpoint loop
          if (successfulEndpoint === baseUrl) {
            reviews = allReviews
            console.log(
              `GMB API: Found ${reviews.length} total reviews for location ${locationName} using endpoint: ${baseUrl}`
            )
          }
        } catch (err) {
          const errorObj = {
            endpoint: baseUrl,
            error: err instanceof Error ? err.message : String(err),
            stack: err instanceof Error ? err.stack : undefined,
            timestamp: new Date().toISOString()
          }
          allErrors.push(errorObj)
          console.warn(`Error trying reviews endpoint ${baseUrl}:`, err)
          // try next endpoint
          continue
        }
      } // end endpoints loop
  
      // If no endpoint worked, throw a detailed error
      if (!successfulEndpoint) {
        const errorMessage = `Reviews API not available for location ${locationName}. This is common - the Google My Business Reviews API requires special permissions that are not available to most standard Google Cloud projects.`
        console.error(errorMessage)
        console.error('All endpoint errors:', allErrors)
  
        const detailedError: any = new Error(errorMessage)
        detailedError.details = {
          locationName,
          accountId,
          locationId,
          errors: allErrors,
          availableEndpoints: reviewsUrls,
          helpMessage:
            'The Google My Business Reviews API requires special permissions. Consider requesting access or using an alternative approach (e.g., Google Business Profile API with proper permissions).'
        }
        throw detailedError
      }
  
       // Map results to your GmbReview shape
       console.log(`📝 Mapping ${reviews.length} reviews from GMB API...`)
       
       const mappedReviews: GmbReview[] = reviews.map((review: any) => {
         // Log each review's reply status
         const hasReviewReply = !!review.reviewReply
         const hasResponse = !!review.response
         
         if (hasReviewReply || hasResponse) {
           console.log(`📋 Review ${review.reviewId} has reply:`, {
             hasReviewReply,
             hasResponse,
             replyComment: (review.reviewReply || review.response)?.comment?.substring(0, 50)
           })
         }
         
         // Convert Google's string star rating to number
         let numericRating = 0
         if (typeof review.starRating === 'string') {
           switch (review.starRating.toLowerCase()) {
             case 'one': numericRating = 1; break
             case 'two': numericRating = 2; break
             case 'three': numericRating = 3; break
             case 'four': numericRating = 4; break
             case 'five': numericRating = 5; break
             default: numericRating = parseInt(review.starRating) || 0
           }
         } else if (typeof review.starRating === 'number') {
           numericRating = review.starRating
         }
         
          // Handle both reviewReply and response field names from GMB API
          const replyData = review.reviewReply || review.response
          
          return {
            id: review.name || `review-${Date.now()}-${Math.random()}`,
            reviewer: {
              displayName: review.reviewer?.displayName || 'Anonymous',
              profilePhotoUrl: review.reviewer?.profilePhotoUrl,
              isAnonymous: review.reviewer?.isAnonymous || false
            },
            starRating: numericRating,
            comment: review.comment || '',
            createTime: review.createTime,
            updateTime: review.updateTime,
            locationId: locationName,
            // Include existing reply if present (handles both reviewReply and response)
            reviewReply: replyData ? {
              comment: replyData.comment,
              updateTime: replyData.updateTime || replyData.createTime
            } : undefined,
            response: replyData ? {
              comment: replyData.comment,
              responseTime: replyData.updateTime || replyData.createTime,
              respondedBy: 'GMB'
            } : undefined,
            hasResponse: !!replyData
          }
       })
  
      console.log(`GMB API: Successfully returned ${mappedReviews.length} mapped reviews from ${successfulEndpoint}`)
      return mappedReviews
    } catch (error) {
      console.error(`Error fetching reviews for ${locationName}:`, error)
      throw error
    }
  }

  /**
   * Reply to a GMB review
   */
  async replyToReview(reviewName: string, comment: string): Promise<boolean> {
    try {
      console.log(`Replying to review: ${reviewName}`)
      console.log(`Reply comment: ${comment}`)
      
      // Get access token
      const accessToken = this.authClient.credentials.access_token
      if (!accessToken) {
        console.error('No access token available')
        throw new Error('No access token available')
      }

      // Extract account ID, location ID, and review ID from reviewName
      // Format: accounts/{accountId}/locations/{locationId}/reviews/{reviewId}
      const pathParts = reviewName.split('/')
      
      if (pathParts.length !== 6 || pathParts[0] !== 'accounts' || pathParts[2] !== 'locations' || pathParts[4] !== 'reviews') {
        console.error(`Invalid review name format: ${reviewName}. Expected format: accounts/{accountId}/locations/{locationId}/reviews/{reviewId}`)
        throw new Error('Invalid review name format')
      }
      
      const accountId = pathParts[1]
      const locationId = pathParts[3]
      const reviewId = pathParts[5]
      
      // Use the correct GMB API v4 endpoint for replying to reviews
      const replyUrl = `https://mybusiness.googleapis.com/v4/accounts/${accountId}/locations/${locationId}/reviews/${reviewId}/reply`
      console.log(`Replying to review at: ${replyUrl}`)
      
      const response = await this.makeRequest(replyUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          comment: comment
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`GMB Reply to Review API Error for ${reviewName}:`, response.status, errorText)
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`)
      }

      const data = await response.json()
      console.log(`✅ Reply posted successfully for review: ${reviewName}`)
      console.log('Reply response:', data)
      
      return true
    } catch (error) {
      console.error('Error replying to review:', error)
      throw error
    }
  }

  async getPosts(locationName: string): Promise<GmbPost[]> {
    try {
      console.log(`Attempting to fetch posts for location: ${locationName}`)
      
      // Extract account ID and location ID from locationName 
      // Format: accounts/112022557985287772374/locations/1234567890
      const pathParts = locationName.split('/')
      if (pathParts.length !== 4 || pathParts[0] !== 'accounts' || pathParts[2] !== 'locations') {
        console.error(`Invalid location name format: ${locationName}. Expected format: accounts/{accountId}/locations/{locationId}`)
        return []
      }
      
      const accountId = pathParts[1]
      const locationId = pathParts[3]
      
      console.log(`Parsed accountId: ${accountId}, locationId: ${locationId}`)
      
      // Use the correct v4 Posts API endpoint
      // Format: accounts/{accountId}/locations/{locationId}/localPosts
      const postsUrl = `https://mybusiness.googleapis.com/v4/accounts/${accountId}/locations/${locationId}/localPosts`
      console.log(`Fetching posts from: ${postsUrl}`)
      
      const response = await this.makeRequest(postsUrl, {
        headers: {
          'Authorization': `Bearer ${this.authClient.credentials.access_token}`
        }
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.warn(`GMB Posts API Error for ${locationName}:`, response.status, errorText)
        
        // If API returns 403/404, posts API may not be available for this account
        if (response.status === 403 || response.status === 404) {
          console.log(`Posts API not available for location ${locationName}`)
          return []
        }
        
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`)
      }

      const data = await response.json()
      console.log(`GMB Posts Response for ${locationName}:`, JSON.stringify(data, null, 2))
      const posts = data.localPosts || []
      
      return posts.map((post: any) => ({
        id: post.name || `post-${Date.now()}-${Math.random()}`,
        summary: post.summary,
        callToAction: post.callToAction ? {
          actionType: post.callToAction.actionType,
          url: post.callToAction.url
        } : undefined,
        media: post.media || [],
        createTime: post.createTime,
        updateTime: post.updateTime,
        locationId: locationName,
        // Additional fields from the API response
        languageCode: post.languageCode,
        state: post.state,
        topicType: post.topicType,
        event: post.event,
        searchUrl: post.searchUrl
      }))
    } catch (error) {
      console.error(`Error fetching posts for ${locationName}:`, error)
      return []
    }
  }

  async createPost(locationName: string, postData: {
    topicType: 'STANDARD' | 'EVENT' | 'OFFER' | 'PRODUCT'
    languageCode: string
    summary: string
    callToAction?: {
      actionType: string
      url?: string
    }
    event?: {
      title: string
      schedule: {
        startDate: { year: number; month: number; day: number }
        startTime?: { hours?: number; minutes?: number }
        endDate?: { year: number; month: number; day: number }
        endTime?: { hours?: number; minutes?: number; seconds?: number }
      }
    }
    media?: Array<{
      mediaFormat: string
      sourceUrl: string
    }>
  }): Promise<GmbPost | null> {
    try {
      console.log(`Creating post for location: ${locationName}`)
      
      // Extract account ID and location ID from locationName 
      const pathParts = locationName.split('/')
      if (pathParts.length !== 4 || pathParts[0] !== 'accounts' || pathParts[2] !== 'locations') {
        console.error(`Invalid location name format: ${locationName}. Expected format: accounts/{accountId}/locations/{locationId}`)
        return null
      }
      
      const accountId = pathParts[1]
      const locationId = pathParts[3]
      
      const createPostUrl = `https://mybusiness.googleapis.com/v4/accounts/${accountId}/locations/${locationId}/localPosts`
      console.log(`Creating post at: ${createPostUrl}`)
      
      const response = await this.makeRequest(createPostUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.authClient.credentials.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(postData)
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`GMB Create Post API Error for ${locationName}:`, response.status, errorText)
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`)
      }

      const data = await response.json()
      console.log(`GMB Create Post Response for ${locationName}:`, JSON.stringify(data, null, 2))
      
      return {
        id: data.name || `post-${Date.now()}-${Math.random()}`,
        summary: data.summary,
        callToAction: data.callToAction,
        media: data.media || [],
        createTime: data.createTime,
        updateTime: data.updateTime,
        locationId: locationName,
        languageCode: data.languageCode,
        state: data.state,
        topicType: data.topicType,
        event: data.event,
        searchUrl: data.searchUrl
      }
    } catch (error) {
      console.error(`Error creating post for ${locationName}:`, error)
      // Re-throw the error instead of returning null so the API can handle it properly
      throw error
    }
  }

  async updatePost(postId: string, postData: {
    topicType?: 'STANDARD' | 'EVENT' | 'OFFER' | 'PRODUCT'
    languageCode?: string
    summary?: string
    callToAction?: {
      actionType: string
      url?: string
    }
    event?: {
      title: string
      schedule: {
        startDate: { year: number; month: number; day: number }
        startTime?: { hours?: number; minutes?: number }
        endDate?: { year: number; month: number; day: number }
        endTime?: { hours?: number; minutes?: number; seconds?: number }
      }
    }
    media?: Array<{
      mediaFormat: string
      sourceUrl: string
    }>
  }): Promise<GmbPost | null> {
    try {
      console.log(`Updating post: ${postId}`)
      
      // Extract account ID, location ID, and post ID from postId
      // Format: accounts/{accountId}/locations/{locationId}/localPosts/{postId}
      const pathParts = postId.split('/')
      if (pathParts.length !== 6 || pathParts[0] !== 'accounts' || pathParts[2] !== 'locations' || pathParts[4] !== 'localPosts') {
        console.error(`Invalid post ID format: ${postId}. Expected format: accounts/{accountId}/locations/{locationId}/localPosts/{postId}`)
        return null
      }
      
      const accountId = pathParts[1]
      const locationId = pathParts[3]
      const actualPostId = pathParts[5]
      
      const updatePostUrl = `https://mybusiness.googleapis.com/v4/accounts/${accountId}/locations/${locationId}/localPosts/${actualPostId}`
      console.log(`Updating post at: ${updatePostUrl}`)
      
      const response = await this.makeRequest(updatePostUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${this.authClient.credentials.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(postData)
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`GMB Update Post API Error for ${postId}:`, response.status, errorText)
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`)
      }

      const data = await response.json()
      console.log(`GMB Update Post Response for ${postId}:`, JSON.stringify(data, null, 2))
      
      return {
        id: data.name || postId,
        summary: data.summary,
        callToAction: data.callToAction,
        media: data.media || [],
        createTime: data.createTime,
        updateTime: data.updateTime,
        locationId: `accounts/${accountId}/locations/${locationId}`,
        languageCode: data.languageCode,
        state: data.state,
        topicType: data.topicType,
        event: data.event,
        searchUrl: data.searchUrl
      }
    } catch (error) {
      console.error(`Error updating post ${postId}:`, error)
      throw error
    }
  }

  async getPost(postId: string): Promise<GmbPost | null> {
    try {
      console.log(`Fetching post: ${postId}`)
      
      // Extract account ID, location ID, and post ID from postId
      // Format: accounts/{accountId}/locations/{locationId}/localPosts/{postId}
      const pathParts = postId.split('/')
      if (pathParts.length !== 6 || pathParts[0] !== 'accounts' || pathParts[2] !== 'locations' || pathParts[4] !== 'localPosts') {
        console.error(`Invalid post ID format: ${postId}. Expected format: accounts/{accountId}/locations/{locationId}/localPosts/{postId}`)
        return null
      }
      
      const accountId = pathParts[1]
      const locationId = pathParts[3]
      const actualPostId = pathParts[5]
      
      const getPostUrl = `https://mybusiness.googleapis.com/v4/accounts/${accountId}/locations/${locationId}/localPosts/${actualPostId}`
      console.log(`Fetching post from: ${getPostUrl}`)
      
      const response = await this.makeRequest(getPostUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.authClient.credentials.access_token}`
        }
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`GMB Get Post API Error for ${postId}:`, response.status, errorText)
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`)
      }

      const postData = await response.json()
      console.log(`GMB Post ${postId} fetched successfully`)
      
      return {
        id: postId,
        summary: postData.summary,
        callToAction: postData.callToAction,
        media: postData.media,
        createTime: postData.createTime,
        updateTime: postData.updateTime,
        locationId: `accounts/${accountId}/locations/${locationId}`,
        languageCode: postData.languageCode,
        state: postData.state,
        topicType: postData.topicType,
        event: postData.event,
        searchUrl: postData.searchUrl
      }
    } catch (error) {
      console.error(`Error fetching post ${postId}:`, error)
      throw error
    }
  }

  async deletePost(postId: string): Promise<boolean> {
    try {
      console.log(`Deleting post: ${postId}`)
      
      // Extract account ID, location ID, and post ID from postId
      // Format: accounts/{accountId}/locations/{locationId}/localPosts/{postId}
      const pathParts = postId.split('/')
      if (pathParts.length !== 6 || pathParts[0] !== 'accounts' || pathParts[2] !== 'locations' || pathParts[4] !== 'localPosts') {
        console.error(`Invalid post ID format: ${postId}. Expected format: accounts/{accountId}/locations/{locationId}/localPosts/{postId}`)
        return false
      }
      
      const accountId = pathParts[1]
      const locationId = pathParts[3]
      const actualPostId = pathParts[5]
      
      const deletePostUrl = `https://mybusiness.googleapis.com/v4/accounts/${accountId}/locations/${locationId}/localPosts/${actualPostId}`
      console.log(`Deleting post at: ${deletePostUrl}`)
      
      const response = await this.makeRequest(deletePostUrl, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.authClient.credentials.access_token}`
        }
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`GMB Delete Post API Error for ${postId}:`, response.status, errorText)
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`)
      }

      console.log(`GMB Post ${postId} deleted successfully`)
      return true
    } catch (error) {
      console.error(`Error deleting post ${postId}:`, error)
      throw error
    }
  }

async getInsights(locationName: string, startDate: string, endDate: string): Promise<GmbInsights | null> {
  try {
    console.log(`Attempting to fetch insights for ${locationName} from ${startDate} to ${endDate}`)

    // Validate locationName (accounts/{accountId}/locations/{locationId})
    const parts = locationName.split('/')
    if (parts.length !== 4 || parts[0] !== 'accounts' || parts[2] !== 'locations') {
      console.error(`Invalid locationName format: ${locationName}`)
      throw new Error(`Invalid locationName format. Expected accounts/{accountId}/locations/{locationId}`)
    }

    // Convert ISO date strings to date objects for the new API
    const start = new Date(startDate)
    const end = new Date(endDate)

    // Validate dates
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      console.error(`Invalid date range: startDate=${startDate}, endDate=${endDate}`)
      throw new Error(`Invalid date range provided: startDate=${startDate}, endDate=${endDate}`)
    }

    // Use the new Business Profile Performance API
    const startDateObj = {
      year: start.getFullYear(),
      month: start.getMonth() + 1,
      day: start.getDate()
    }

    const endDateObj = {
      year: end.getFullYear(),
      month: end.getMonth() + 1,
      day: end.getDate()
    }

    // Validate the date objects
    if (isNaN(startDateObj.year) || isNaN(startDateObj.month) || isNaN(startDateObj.day) ||
        isNaN(endDateObj.year) || isNaN(endDateObj.month) || isNaN(endDateObj.day)) {
      console.error(`Invalid date objects created: startDateObj=${JSON.stringify(startDateObj)}, endDateObj=${JSON.stringify(endDateObj)}`)
      throw new Error(`Failed to create valid date objects from: startDate=${startDate}, endDate=${endDate}`)
    }

    console.log(`Using date range: ${startDateObj.year}-${startDateObj.month}-${startDateObj.day} to ${endDateObj.year}-${endDateObj.month}-${endDateObj.day}`)

    // Try to fetch insights using multiple approaches with fallbacks
    let dailyMetrics: any[] = []
    let websiteClicksSeries = null
    let callClicksSeries = null
    let desktopSearchImpressionsSeries = null
    let mobileMapsImpressionsSeries = null

    // Primary approach: Multi-daily metrics API
    try {
      // Start with core metrics that are most commonly supported
      const coreMetrics = [
        'WEBSITE_CLICKS', 
        'CALL_CLICKS', 
        'BUSINESS_DIRECTION_REQUESTS',
        'BUSINESS_IMPRESSIONS_DESKTOP_SEARCH', 
        'BUSINESS_IMPRESSIONS_MOBILE_SEARCH',
        'BUSINESS_IMPRESSIONS_DESKTOP_MAPS',
        'BUSINESS_IMPRESSIONS_MOBILE_MAPS'
      ]
      dailyMetrics = await this.getMultiDailyMetricsTimeSeries(locationName, coreMetrics, startDateObj, endDateObj)
      
    } catch (error) {
      console.warn('Multi-daily metrics API failed, trying individual metrics:', error)
    }

    // Fallback approach: Individual time series
    if (dailyMetrics.length === 0) {
      try {
        websiteClicksSeries = await this.getDailyMetricsTimeSeries(locationName, 'WEBSITE_CLICKS', startDateObj, endDateObj)
        callClicksSeries = await this.getDailyMetricsTimeSeries(locationName, 'CALL_CLICKS', startDateObj, endDateObj)
        const directionRequestsSeries = await this.getDailyMetricsTimeSeries(locationName, 'BUSINESS_DIRECTION_REQUESTS', startDateObj, endDateObj)
        desktopSearchImpressionsSeries = await this.getDailyMetricsTimeSeries(locationName, 'BUSINESS_IMPRESSIONS_DESKTOP_SEARCH', startDateObj, endDateObj)
        const mobileSearchImpressionsSeries = await this.getDailyMetricsTimeSeries(locationName, 'BUSINESS_IMPRESSIONS_MOBILE_SEARCH', startDateObj, endDateObj)
        const desktopMapsImpressionsSeries = await this.getDailyMetricsTimeSeries(locationName, 'BUSINESS_IMPRESSIONS_DESKTOP_MAPS', startDateObj, endDateObj)
        mobileMapsImpressionsSeries = await this.getDailyMetricsTimeSeries(locationName, 'BUSINESS_IMPRESSIONS_MOBILE_MAPS', startDateObj, endDateObj)
        
        
        // Convert time series to daily metrics format
        if (websiteClicksSeries || callClicksSeries || directionRequestsSeries || desktopSearchImpressionsSeries || mobileSearchImpressionsSeries || desktopMapsImpressionsSeries || mobileMapsImpressionsSeries) {
          const dateMap = new Map<string, any>()
          
          websiteClicksSeries?.dailyValues.forEach(dv => {
            const key = `${dv.date.year}-${dv.date.month}-${dv.date.day}`
            if (!dateMap.has(key)) {
              dateMap.set(key, {
                locationId: locationName,
                date: dv.date,
                metrics: {}
              })
            }
            dateMap.get(key)!.metrics.websiteClicks = dv.value
          })
          
          callClicksSeries?.dailyValues.forEach(dv => {
            const key = `${dv.date.year}-${dv.date.month}-${dv.date.day}`
            if (!dateMap.has(key)) {
              dateMap.set(key, {
                locationId: locationName,
                date: dv.date,
                metrics: {}
              })
            }
            dateMap.get(key)!.metrics.callClicks = dv.value
          })

          directionRequestsSeries?.dailyValues.forEach(dv => {
            const key = `${dv.date.year}-${dv.date.month}-${dv.date.day}`
            if (!dateMap.has(key)) {
              dateMap.set(key, {
                locationId: locationName,
                date: dv.date,
                metrics: {}
              })
            }
            dateMap.get(key)!.metrics.directionRequests = dv.value
          })

          desktopSearchImpressionsSeries?.dailyValues.forEach(dv => {
            const key = `${dv.date.year}-${dv.date.month}-${dv.date.day}`
            if (!dateMap.has(key)) {
              dateMap.set(key, {
                locationId: locationName,
                date: dv.date,
                metrics: {}
              })
            }
            dateMap.get(key)!.metrics.desktopSearchImpressions = dv.value
          })

          mobileSearchImpressionsSeries?.dailyValues.forEach(dv => {
            const key = `${dv.date.year}-${dv.date.month}-${dv.date.day}`
            if (!dateMap.has(key)) {
              dateMap.set(key, {
                locationId: locationName,
                date: dv.date,
                metrics: {}
              })
            }
            dateMap.get(key)!.metrics.mobileSearchImpressions = dv.value
          })

          desktopMapsImpressionsSeries?.dailyValues.forEach(dv => {
            const key = `${dv.date.year}-${dv.date.month}-${dv.date.day}`
            if (!dateMap.has(key)) {
              dateMap.set(key, {
                locationId: locationName,
                date: dv.date,
                metrics: {}
              })
            }
            dateMap.get(key)!.metrics.desktopMapsImpressions = dv.value
          })

          mobileMapsImpressionsSeries?.dailyValues.forEach(dv => {
            const key = `${dv.date.year}-${dv.date.month}-${dv.date.day}`
            if (!dateMap.has(key)) {
              dateMap.set(key, {
                locationId: locationName,
                date: dv.date,
                metrics: {}
              })
            }
            dateMap.get(key)!.metrics.mobileMapsImpressions = dv.value
          })
          dailyMetrics = Array.from(dateMap.values())
        }
      } catch (error) {
        console.warn('Individual time series API also failed:', error)
      }
    }

    // If we still have no data, create a minimal insights object with zeros
    if (dailyMetrics.length === 0) {
      console.log(`No performance data available for ${locationName}, returning zero values`)
      return {
        locationId: locationName,
        period: {
          startTime: startDate,
          endTime: endDate
        },
        queries: 0,
        views: 0,
        actions: 0,
        photoViews: 0,
        callClicks: 0,
        websiteClicks: 0,
        directionRequests: 0,
        businessBookings: 0,
        businessFoodOrders: 0,
        businessMessages: 0,
      desktopSearchImpressions: 0,
      mobileSearchImpressions: 0,
      desktopMapsImpressions: 0,
      mobileMapsImpressions: 0,
        dailyMetrics: [],
        websiteClicksSeries: null,
        callClicksSeries: null
      }
    }

    // Aggregate the daily metrics into totals
    let totalWebsiteClicks = 0
    let totalCallClicks = 0
    let totalDirectionRequests = 0
    let totalDesktopSearchImpressions = 0
    let totalMobileSearchImpressions = 0
    let totalDesktopMapsImpressions = 0
    let totalMobileMapsImpressions = 0

    dailyMetrics.forEach(metric => {
      // Safely add values, filtering out NaN and astronomical numbers
      const safeAdd = (current: number, value: any) => {
        const num = Number(value) || 0
        return (isNaN(num) || num < 0 || num > 1000000) ? current : current + num
      }
      
      totalWebsiteClicks = safeAdd(totalWebsiteClicks, metric.metrics.websiteClicks)
      totalCallClicks = safeAdd(totalCallClicks, metric.metrics.callClicks)
      totalDirectionRequests = safeAdd(totalDirectionRequests, metric.metrics.directionRequests)
      totalDesktopSearchImpressions = safeAdd(totalDesktopSearchImpressions, metric.metrics.desktopSearchImpressions)
      totalMobileSearchImpressions = safeAdd(totalMobileSearchImpressions, metric.metrics.mobileSearchImpressions)
      totalDesktopMapsImpressions = safeAdd(totalDesktopMapsImpressions, metric.metrics.desktopMapsImpressions)
      totalMobileMapsImpressions = safeAdd(totalMobileMapsImpressions, metric.metrics.mobileMapsImpressions)
    })

    // Calculate total views from impressions
    const totalViews = totalDesktopSearchImpressions + totalMobileSearchImpressions + totalDesktopMapsImpressions + totalMobileMapsImpressions

    // Create insights object with new API data
    const insights: GmbInsights = {
      locationId: locationName,
      period: {
        startTime: startDate,
        endTime: endDate
      },
      queries: 0, // Not available in new API
      views: totalViews,
      actions: totalWebsiteClicks + totalCallClicks + totalDirectionRequests,
      photoViews: 0, // Not available in new API
      callClicks: totalCallClicks,
      websiteClicks: totalWebsiteClicks,
      directionRequests: totalDirectionRequests,
      businessBookings: 0, // Not available in current API
      businessFoodOrders: 0, // Not available in current API
      businessMessages: 0, // Not available in current API
      desktopSearchImpressions: totalDesktopSearchImpressions,
      mobileSearchImpressions: totalMobileSearchImpressions,
      desktopMapsImpressions: totalDesktopMapsImpressions,
      mobileMapsImpressions: totalMobileMapsImpressions,
      // Include raw data for debugging
      dailyMetrics,
      websiteClicksSeries,
      callClicksSeries
    }

    console.log(`✅ Insights fetched for ${locationName.split('/').pop()}:`, {
      views: totalViews,
      websiteClicks: totalWebsiteClicks,
      callClicks: totalCallClicks,
      desktopSearchImpressions: totalDesktopSearchImpressions,
      mobileSearchImpressions: totalMobileSearchImpressions,
      desktopMapsImpressions: totalDesktopMapsImpressions,
      mobileMapsImpressions: totalMobileMapsImpressions
    })

    return insights
  } catch (error) {
    console.error(`Error fetching insights for ${locationName}:`, error)
    // Return a minimal insights object instead of null to ensure data consistency
    return {
      locationId: locationName,
      period: {
        startTime: startDate,
        endTime: endDate
      },
      queries: 0,
      views: 0,
      actions: 0,
      photoViews: 0,
      callClicks: 0,
      websiteClicks: 0,
      directionRequests: 0,
      businessBookings: 0,
      businessFoodOrders: 0,
      businessMessages: 0,
      desktopSearchImpressions: 0,
      mobileSearchImpressions: 0,
      desktopMapsImpressions: 0,
      mobileMapsImpressions: 0,
      dailyMetrics: [],
      websiteClicksSeries: null,
      callClicksSeries: null
    }
  }
}

/**
 * Fetch search keywords and impressions for a location using the Business Profile Performance API
 * Based on the endpoint: locations.searchkeywords.impressions.monthly
 * - locationName: "accounts/{accountId}/locations/{locationId}"
 * - monthlyRange: Object with start_month and end_month
 * 
 * Returns array of GmbSearchKeyword objects or empty array if not available.
 */
async getSearchKeywords(
  locationName: string, 
  startYear: number, 
  startMonth: number, 
  endYear: number, 
  endMonth: number
): Promise<GmbSearchKeyword[]> {
  try {
    console.log(`Attempting to fetch search keywords for ${locationName} from ${startYear}-${startMonth} to ${endYear}-${endMonth}`)

    // Validate locationName (accounts/{accountId}/locations/{locationId})
    const parts = locationName.split('/')
    if (parts.length !== 4 || parts[0] !== 'accounts' || parts[2] !== 'locations') {
      console.error(`Invalid locationName format: ${locationName}`)
      throw new Error(`Invalid locationName format. Expected accounts/{accountId}/locations/{locationId}`)
    }
    const accountId = parts[1]
    const originalLocationId = parts[3]
    
    // Use working location ID for testing
    const locationId = this.getWorkingLocationId(originalLocationId)

    // Ensure we have an access token
    const accessToken = (this.authClient && this.authClient.credentials && this.authClient.credentials.access_token) || null
    if (!accessToken) {
      const msg = 'No access token available on authClient.credentials.access_token'
      console.error(msg)
      throw new Error(msg)
    }

    // Build the Business Profile Performance API endpoint
    // Format from the screenshot: locations/{locationId}/searchkeywords/impressions/monthly
    const baseUrl = 'https://businessprofileperformance.googleapis.com/v1'
    const endpoint = `${baseUrl}/locations/${locationId}/searchkeywords/impressions/monthly`
    
    // Build query parameters for monthly range
    const params = new URLSearchParams({
      'monthlyRange.start_month.year': startYear.toString(),
      'monthlyRange.start_month.month': startMonth.toString(),
      'monthlyRange.end_month.year': endYear.toString(),
      'monthlyRange.end_month.month': endMonth.toString()
    })

    const fullUrl = `${endpoint}?${params.toString()}`
    console.log('Calling search keywords endpoint:', fullUrl)

    const response = await this.makeRequest(fullUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.warn(`Search keywords API error (${response.status} ${response.statusText}):`, errorText)
      
      // If 403/404, the API may not be available for this account
      if (response.status === 403) {
        console.warn('Search keywords API permission denied. This requires Business Profile Performance API access with proper permissions.')
        return [] // Return empty array instead of throwing
      }
      
      if (response.status === 404) {
        console.warn('Search keywords API endpoint not found. Ensure the Business Profile Performance API is enabled in your Google Cloud project.')
        return [] // Return empty array instead of throwing
      }
      
      throw new Error(`Search keywords request failed: ${response.status} ${response.statusText} - ${errorText}`)
    }

    const data = await response.json()
    console.log('Search keywords response:', JSON.stringify(data, null, 2))

    // Parse the response and convert to GmbSearchKeyword format
    const searchKeywords: GmbSearchKeyword[] = []
    
    if (data.searchKeywordsCounts && Array.isArray(data.searchKeywordsCounts)) {
      for (const item of data.searchKeywordsCounts) {
        if (item.searchKeyword) {
          // Handle different response formats
          if (item.monthlySearchCounts && Array.isArray(item.monthlySearchCounts)) {
            // Format with monthlySearchCounts array
            for (const monthlyCount of item.monthlySearchCounts) {
              if (monthlyCount.month && monthlyCount.searchCount !== undefined) {
                const impressions = monthlyCount.searchCount || 0
                const clicks = monthlyCount.clicks || 0
                // Calculate CTR from clicks and impressions if not provided
                const ctr = monthlyCount.ctr || (impressions > 0 ? clicks / impressions : 0)
                
                searchKeywords.push({
                  locationId: locationName,
                  keyword: item.searchKeyword,
                  impressions: impressions,
                  period: {
                    year: monthlyCount.month.year || startYear,
                    month: monthlyCount.month.month || startMonth
                  },
                  clicks: clicks,
                  ctr: ctr,
                  position: monthlyCount.averagePosition || 0
                })
              }
            }
          } else if (item.insightsValue) {
            // Alternative format with insightsValue (as seen in terminal output)
            const impressions = item.insightsValue.value ? parseInt(item.insightsValue.value) : 
                               (item.insightsValue.threshold ? parseInt(item.insightsValue.threshold) : 0)
            
            searchKeywords.push({
              locationId: locationName,
              keyword: item.searchKeyword,
              impressions: impressions,
              period: {
                year: startYear,
                month: startMonth
              },
              clicks: 0,
              ctr: 0,
              position: 0
            })
          }
        }
      }
    }

    console.log(`Search keywords API: Found ${searchKeywords.length} keyword records for ${locationName}`)
    return searchKeywords

  } catch (error) {
    console.error(`Error fetching search keywords for ${locationName}:`, error)
    // Return empty array for API availability issues, but throw for other errors
    if (error instanceof Error && error.message.includes('not available')) {
      return []
    }
    throw error
  }
}

/**
 * Fetch multiple daily metrics time series for a location
 * Based on endpoint: locations/{locationId}:fetchMultiDailyMetricsTimeSeries
 * 
 * @param locationName - "accounts/{accountId}/locations/{locationId}"
 * @param metrics - Array of metric types to fetch
 * @param startDate - Start date object {year, month, day}
 * @param endDate - End date object {year, month, day}
 * @returns Promise<GmbDailyMetrics[]>
 */
async getMultiDailyMetricsTimeSeries(
  locationName: string,
  metrics: string[],
  startDate: { year: number; month: number; day: number },
  endDate: { year: number; month: number; day: number }
): Promise<GmbDailyMetrics[]> {
  try {
    console.log(`Fetching multi daily metrics for ${locationName}:`, metrics)

    // Extract locationId from locationName
    const parts = locationName.split('/')
    if (parts.length !== 4 || parts[0] !== 'accounts' || parts[2] !== 'locations') {
      throw new Error(`Invalid locationName format: ${locationName}`)
    }
    const originalLocationId = parts[3]
    
    // Use working location ID for testing
    const locationId = this.getWorkingLocationId(originalLocationId)

    // Ensure access token - use manual token if available, otherwise use authClient
    const accessToken = this.authClient?.credentials?.access_token
    if (!accessToken) {
      throw new Error('No access token available')
    }

    console.log(`Using access token: ${accessToken.substring(0, 20)}...`)

    // Build endpoint URL
    const baseUrl = 'https://businessprofileperformance.googleapis.com/v1'
    const endpoint = `${baseUrl}/locations/${locationId}:fetchMultiDailyMetricsTimeSeries`
    
    // Build query parameters
    const params = new URLSearchParams()
    
    // Add multiple metrics
    metrics.forEach(metric => {
      params.append('dailyMetrics', metric)
    })
    
    // Add date range
    params.append('dailyRange.start_date.year', startDate.year.toString())
    params.append('dailyRange.start_date.month', startDate.month.toString())
    params.append('dailyRange.start_date.day', startDate.day.toString())
    params.append('dailyRange.end_date.year', endDate.year.toString())
    params.append('dailyRange.end_date.month', endDate.month.toString())
    params.append('dailyRange.end_date.day', endDate.day.toString())

    const fullUrl = `${endpoint}?${params.toString()}`
    console.log('Calling multi daily metrics endpoint:', fullUrl)

    const response = await this.makeRequest(fullUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.warn(`Multi daily metrics API error (${response.status}):`, errorText)
      
      if (response.status === 403) {
        console.warn('Business Profile Performance API permission denied. This is common for accounts without proper API access.')
        console.warn('Bypassing 403 error and returning zero values to prevent infinite loops...')
        
        // Return zero values for all requested metrics instead of trying fallbacks
        const zeroMetrics: GmbDailyMetrics[] = []
        const currentDate = new Date(startDate.year, startDate.month - 1, startDate.day)
        const endDateObj = new Date(endDate.year, endDate.month - 1, endDate.day)
        
        // Generate zero values for each day in the range
        while (currentDate <= endDateObj) {
          zeroMetrics.push({
            locationId: locationName,
            date: {
              year: currentDate.getFullYear(),
              month: currentDate.getMonth() + 1,
              day: currentDate.getDate()
            },
            metrics: {
              websiteClicks: 0,
              callClicks: 0,
              businessImpressionsDesktopSearch: 0,
              businessImpressionsMobileMaps: 0
            }
          })
          
          currentDate.setDate(currentDate.getDate() + 1)
        }
        
        console.log(`Returning ${zeroMetrics.length} zero-value daily metrics due to 403 permission error`)
        return zeroMetrics
      }
      
      if (response.status === 404) {
        console.warn('Business Profile Performance API endpoint not found. API may not be enabled for this project.')
        return []
      }
      
      if (response.status === 400) {
        console.warn('Invalid request to Business Profile Performance API. Some metrics may not be supported:', errorText)
        // Try to extract which metrics are invalid and retry without them
        let validMetrics = [...metrics]
        
        
        if (errorText.includes('BUSINESS_IMPRESSIONS_DESKTOP_SEARCH')) {
          console.log('Removing BUSINESS_IMPRESSIONS_DESKTOP_SEARCH metric...')
          validMetrics = validMetrics.filter(m => m !== 'BUSINESS_IMPRESSIONS_DESKTOP_SEARCH')
        }
        
        if (errorText.includes('BUSINESS_IMPRESSIONS_MOBILE_SEARCH')) {
          console.log('Removing BUSINESS_IMPRESSIONS_MOBILE_SEARCH metric...')
          validMetrics = validMetrics.filter(m => m !== 'BUSINESS_IMPRESSIONS_MOBILE_SEARCH')
        }
        
        if (errorText.includes('BUSINESS_IMPRESSIONS_DESKTOP_MAPS')) {
          console.log('Removing BUSINESS_IMPRESSIONS_DESKTOP_MAPS metric...')
          validMetrics = validMetrics.filter(m => m !== 'BUSINESS_IMPRESSIONS_DESKTOP_MAPS')
        }
        
        if (errorText.includes('BUSINESS_IMPRESSIONS_MOBILE_MAPS')) {
          console.log('Removing BUSINESS_IMPRESSIONS_MOBILE_MAPS metric...')
          validMetrics = validMetrics.filter(m => m !== 'BUSINESS_IMPRESSIONS_MOBILE_MAPS')
        }
        
        if (validMetrics.length > 0 && validMetrics.length !== metrics.length) {
          console.log(`Retrying with ${validMetrics.length} valid metrics:`, validMetrics)
          return this.getMultiDailyMetricsTimeSeries(locationName, validMetrics, startDate, endDate)
        }
        
        return []
      }
      
      throw new Error(`Multi daily metrics request failed: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    console.log('Multi daily metrics response:', JSON.stringify(data, null, 2))

    // Parse response into GmbDailyMetrics format
    const dailyMetrics: GmbDailyMetrics[] = []
    
    if (data.multiDailyMetricTimeSeries && Array.isArray(data.multiDailyMetricTimeSeries)) {
      // Create a map to group metrics by date
      const metricsMap = new Map<string, GmbDailyMetrics>()
      
      // The response structure has dailyMetricTimeSeries array inside each multiDailyMetricTimeSeries item
      for (const multiSeries of data.multiDailyMetricTimeSeries) {
        if (multiSeries.dailyMetricTimeSeries && Array.isArray(multiSeries.dailyMetricTimeSeries)) {
          for (const series of multiSeries.dailyMetricTimeSeries) {
            const metricType = series.dailyMetric
            
            if (series.timeSeries && series.timeSeries.datedValues) {
              for (const datedValue of series.timeSeries.datedValues) {
                const date = datedValue.date
                const dateKey = `${date.year}-${date.month}-${date.day}`
                
                if (!metricsMap.has(dateKey)) {
                  metricsMap.set(dateKey, {
                    locationId: locationName,
                    date: {
                      year: date.year,
                      month: date.month,
                      day: date.day
                    },
                    metrics: {}
                  })
                }
                
                const dailyMetric = metricsMap.get(dateKey)!
                const metricKey = this.mapMetricTypeToKey(metricType)
                // Convert string values to numbers, handle empty values and invalid numbers
                let value = 0
                if (datedValue.value) {
                  const parsed = parseInt(datedValue.value)
                  // Check for valid number and reasonable range (prevent astronomical values)
                  if (!isNaN(parsed) && parsed >= 0 && parsed <= 1000000) {
                    value = parsed
                  } else {
                    console.warn(`Invalid or out-of-range value for ${metricType}: ${datedValue.value}, using 0`)
                  }
                }
                dailyMetric.metrics[metricKey] = value
              }
            }
          }
        }
      }
      
      dailyMetrics.push(...metricsMap.values())
    }

    console.log(`Multi daily metrics: Found ${dailyMetrics.length} daily records`)
    
    // Log sample data for debugging
    if (dailyMetrics.length > 0) {
      console.log('Sample daily metrics data:', JSON.stringify(dailyMetrics.slice(0, 3), null, 2))
      
      // Calculate totals for verification
      let totalWebsiteClicks = 0
      let totalCallClicks = 0
      let totalDesktopImpressions = 0
      let totalMobileImpressions = 0
      
      dailyMetrics.forEach(metric => {
        totalWebsiteClicks += metric.metrics.websiteClicks || 0
        totalCallClicks += metric.metrics.callClicks || 0
        totalDesktopImpressions += metric.metrics.desktopSearchImpressions || 0
        totalMobileImpressions += metric.metrics.mobileMapsImpressions || 0
      })
      
      console.log('Aggregated totals:', {
        totalWebsiteClicks,
        totalCallClicks,
        totalDesktopImpressions,
        totalMobileImpressions,
        totalImpressions: totalDesktopImpressions + totalMobileImpressions
      })
    }
    
    return dailyMetrics.sort((a, b) => {
      const dateA = new Date(a.date.year, a.date.month - 1, a.date.day)
      const dateB = new Date(b.date.year, b.date.month - 1, b.date.day)
      return dateA.getTime() - dateB.getTime()
    })

  } catch (error) {
    console.error(`Error fetching multi daily metrics for ${locationName}:`, error)
    return []
  }
}

/**
 * Fetch single daily metric time series for a location
 * Based on endpoint: locations/{locationId}:getDailyMetricsTimeSeries
 * 
 * @param locationName - "accounts/{accountId}/locations/{locationId}"
 * @param metric - Single metric type to fetch
 * @param startDate - Start date object {year, month, day}
 * @param endDate - End date object {year, month, day}
 * @returns Promise<GmbDailyMetricsTimeSeries>
 */
async getDailyMetricsTimeSeries(
  locationName: string,
  metric: string,
  startDate: { year: number; month: number; day: number },
  endDate: { year: number; month: number; day: number }
): Promise<GmbDailyMetricsTimeSeries | null> {
  try {
    console.log(`Fetching daily metric time series for ${locationName}: ${metric}`)

    // Extract locationId
    const parts = locationName.split('/')
    if (parts.length !== 4 || parts[0] !== 'accounts' || parts[2] !== 'locations') {
      throw new Error(`Invalid locationName format: ${locationName}`)
    }
    const originalLocationId = parts[3]
    
    // Use working location ID for testing
    const locationId = this.getWorkingLocationId(originalLocationId)

    // Ensure access token - use manual token if available, otherwise use authClient
    const accessToken = this.authClient?.credentials?.access_token
    if (!accessToken) {
      throw new Error('No access token available')
    }

    // Build endpoint URL
    const baseUrl = 'https://businessprofileperformance.googleapis.com/v1'
    const endpoint = `${baseUrl}/locations/${locationId}:getDailyMetricsTimeSeries`
    
    // Build query parameters
    const params = new URLSearchParams({
      'dailyMetric': metric,
      'dailyRange.start_date.year': startDate.year.toString(),
      'dailyRange.start_date.month': startDate.month.toString(),
      'dailyRange.start_date.day': startDate.day.toString(),
      'dailyRange.end_date.year': endDate.year.toString(),
      'dailyRange.end_date.month': endDate.month.toString(),
      'dailyRange.end_date.day': endDate.day.toString()
    })

    const fullUrl = `${endpoint}?${params.toString()}`
    console.log('Calling daily metrics time series endpoint:', fullUrl)

    const response = await this.makeRequest(fullUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      
      if (response.status === 403) {
        console.warn('Business Profile Performance API permission denied for single metric time series. This is common for accounts without proper API access.')
        return null
      }
      
      if (response.status === 404) {
        console.warn('Business Profile Performance API endpoint not found for single metric time series.')
        return null
      }
      
      if (response.status === 400) {
        // Check if it's a metric-specific error
        if (errorText.includes('Invalid value at \'daily_metric\'')) {
          console.log(`Metric '${metric}' not supported for this location, skipping...`)
          return null
        }
        console.warn('Invalid request for daily metrics time series:', errorText)
        return null
      }
      
      console.warn(`Daily metrics time series API error (${response.status}):`, errorText)
      throw new Error(`Daily metrics time series request failed: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    console.log('Daily metrics time series response:', JSON.stringify(data, null, 2))

    // Parse response
    if (data.timeSeries && data.timeSeries.datedValues) {
      const dailyValues = data.timeSeries.datedValues.map((datedValue: any) => ({
        date: {
          year: datedValue.date.year,
          month: datedValue.date.month,
          day: datedValue.date.day
        },
        value: datedValue.value || 0
      }))

      return {
        locationId: locationName,
        metricType: metric,
        dailyValues: dailyValues.sort((a: any, b: any) => {
          const dateA = new Date(a.date.year, a.date.month - 1, a.date.day)
          const dateB = new Date(b.date.year, b.date.month - 1, b.date.day)
          return dateA.getTime() - dateB.getTime()
        })
      }
    }

    return null

  } catch (error) {
    console.error(`Error fetching daily metrics time series for ${locationName}:`, error)
    return null
  }
}

/**
 * Helper method to map API metric types to database keys
 */
private mapMetricTypeToKey(metricType: string): string {
  const mapping: { [key: string]: string } = {
    'WEBSITE_CLICKS': 'websiteClicks',
    'CALL_CLICKS': 'callClicks',
    'BUSINESS_DIRECTION_REQUESTS': 'directionRequests',
    'BUSINESS_BOOKINGS': 'businessBookings',
    'BUSINESS_FOOD_ORDERS': 'businessFoodOrders',
    'BUSINESS_MESSAGES': 'businessMessages',
    'BUSINESS_IMPRESSIONS_DESKTOP_SEARCH': 'desktopSearchImpressions',
    'BUSINESS_IMPRESSIONS_MOBILE_SEARCH': 'mobileSearchImpressions',
    'BUSINESS_IMPRESSIONS_DESKTOP_MAPS': 'desktopMapsImpressions',
    'BUSINESS_IMPRESSIONS_MOBILE_MAPS': 'mobileMapsImpressions'
  }
  
  return mapping[metricType] || metricType.toLowerCase()
}


  /**
   * Create a new location in GMB
   */
  async createLocation(accountName: string, locationData: {
    title: string
    languageCode: string
    storefrontAddress: {
      addressLines: string[]
      locality: string
      administrativeArea: string
      postalCode: string
      regionCode: string
    }
    phoneNumbers?: {
      primaryPhone: string
    }
    websiteUri?: string
    categories?: {
      primaryCategory: {
        displayName: string
      }
    }
  }): Promise<GmbLocation | null> {
    try {
      console.log(`Creating new location for account: ${accountName}`)
      
      // Extract account ID from accountName - handle both formats
      let accountId: string
      if (accountName.startsWith('accounts/')) {
        accountId = accountName.replace('accounts/', '')
      } else {
        // If it's just the numeric ID, use it directly
        accountId = accountName
      }
      
      // Validate account ID format (should be numeric)
      if (!accountId || !/^\d+$/.test(accountId)) {
        console.error(`Invalid GMB account ID format: ${accountId}`)
        throw new Error(`Invalid GMB account ID: ${accountId}`)
      }
      
      const createLocationUrl = `https://mybusinessbusinessinformation.googleapis.com/v1/accounts/${accountId}/locations`
      console.log(`Creating location at: ${createLocationUrl}`)
      
      const response = await this.makeRequest(createLocationUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.authClient.credentials.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(locationData)
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`GMB Create Location API Error:`, response.status, errorText)
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`)
      }

      const data = await response.json()
      console.log(`GMB Create Location Response:`, JSON.stringify(data, null, 2))
      
      // Extract location ID from the response
      const locationId = data.name?.replace('locations/', '')
      const fullLocationPath = `accounts/${accountId}/locations/${locationId}`

      return {
        id: fullLocationPath,
        name: data.title || locationData.title,
        address: this.formatAddress(data.storefrontAddress || locationData.storefrontAddress),
        phoneNumber: data.phoneNumbers?.primaryPhone || locationData.phoneNumbers?.primaryPhone,
        websiteUrl: data.websiteUri || locationData.websiteUri,
        categories: data.categories?.primaryCategory ? [data.categories.primaryCategory.displayName] : (locationData.categories?.primaryCategory ? [locationData.categories.primaryCategory.displayName] : []),
        verified: false, // New locations are not verified initially
        accountId: accountName
      }
    } catch (error) {
      console.error(`Error creating location:`, error)
      throw error
    }
  }

  /**
   * Update an existing location in GMB
   * Note: Latitude/longitude coordinates cannot be updated via GMB API
   * They are set automatically by Google based on address or through verification
   */
  async updateLocation(locationName: string, locationData: {
    title?: string
    storefrontAddress?: {
      addressLines: string[]
      locality: string
      administrativeArea: string
      postalCode: string
      regionCode: string
    }
    phoneNumbers?: {
      primaryPhone: string
    }
    websiteUri?: string
    categories?: {
      primaryCategory: {
        name: string // GMB category ID like "gcid:apartment_building"
      }
    }
  }): Promise<GmbLocation | null> {
    try {
      console.log(`Updating location: ${locationName}`)
      
      // Validate location name format and extract location ID
      const pathParts = locationName.split('/')
      if (pathParts.length !== 4 || pathParts[0] !== 'accounts' || pathParts[2] !== 'locations') {
        console.error(`Invalid location name format: ${locationName}`)
        return null
      }
      
      const locationId = pathParts[3]
      
      // Use the correct API format: locations/{locationId}
      const updateLocationUrl = `https://mybusinessbusinessinformation.googleapis.com/v1/locations/${locationId}`
      console.log(`Updating location at: ${updateLocationUrl}`)
      
      // Build update mask for fields being updated
      const updateMask = Object.keys(locationData).join(',')
      const urlWithMask = `${updateLocationUrl}?updateMask=${updateMask}`
      
      console.log('Update data:', JSON.stringify(locationData, null, 2))
      
      const response = await this.makeRequest(urlWithMask, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${this.authClient.credentials.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(locationData)
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`GMB Update Location API Error:`, response.status, errorText)
        
        // Parse GMB API errors for better error messages
        try {
          const errorData = JSON.parse(errorText)
          console.log('Parsed error data:', errorData)
          
          if (errorData.error && errorData.error.details && Array.isArray(errorData.error.details)) {
            const reasons = errorData.error.details.map((detail: any) => detail.reason).filter(Boolean)
            console.log('Error reasons:', reasons)
            
            if (reasons.includes('THROTTLED')) {
              throw new Error('Google My Business API rate limit exceeded. Please wait a moment and try again.')
            } else if (reasons.includes('PIN_DROP_REQUIRED')) {
              throw new Error('Address update requires location verification. Please contact support.')
            } else if (reasons.includes('INVALID_ADDRESS')) {
              throw new Error('Invalid address format. Please check your address details.')
            } else if (reasons.includes('ADDRESS_EDIT_CHANGES_COUNTRY')) {
              throw new Error('Cannot change country in address. Please contact support for country changes.')
            } else if (reasons.includes('INVALID_CATEGORY')) {
              throw new Error('Invalid business category. Please select a valid category from the list.')
            } else if (reasons.includes('INVALID_PHONE_NUMBER')) {
              // Extract the phone number value from error details for better error message
              const phoneError = errorData.error.details.find((d: any) => d.reason === 'INVALID_PHONE_NUMBER')
              const phoneValue = phoneError?.metadata?.value || ''
              throw new Error(`Invalid phone number: ${phoneValue}. This phone number cannot be verified by Google. Please ensure it's a valid, active phone number.`)
            } else if (reasons.includes('INVALID_ARGUMENT')) {
              throw new Error('Invalid store information provided. Please check your details and try again.')
            } else {
              throw new Error('Failed to update store in Google My Business. Please check your information and try again.')
            }
          } else {
            throw new Error('Failed to update store in Google My Business. Please check your information and try again.')
          }
        } catch (parseError) {
          console.error('Error parsing GMB response:', parseError)
          console.error('Raw error text:', errorText)
          // If we can't parse the error, use a generic message
          throw new Error(`Failed to update store in Google My Business. Please check your information and try again.`)
        }
        
        throw new Error(`Failed to update store in Google My Business. Please check your information and try again.`)
      }

      const data = await response.json()
      console.log(`GMB Update Location Response:`, JSON.stringify(data, null, 2))
      
      // Extract account ID from location name for the response
      const accountId = pathParts[1]
      
      return {
        id: locationName,
        name: data.title || locationData.title,
        address: this.formatAddress(data.storefrontAddress || locationData.storefrontAddress),
        phoneNumber: data.phoneNumbers?.primaryPhone || locationData.phoneNumbers?.primaryPhone,
        websiteUrl: data.websiteUri || locationData.websiteUri,
        categories: data.categories?.primaryCategory ? [data.categories.primaryCategory.displayName] : [],
        primaryCategory: data.categories?.primaryCategory?.displayName,
        verified: data.metadata?.hasVoiceOfMerchant || false,
        accountId: `accounts/${accountId}`
      }
    } catch (error) {
      console.error(`Error updating location:`, error)
      throw error
    }
  }

  /**
   * Delete a location from GMB
   */
  async deleteLocation(locationName: string): Promise<boolean> {
    try {
      console.log(`Deleting location: ${locationName}`)
      
      // Extract account ID and location ID from locationName
      const pathParts = locationName.split('/')
      if (pathParts.length !== 4 || pathParts[0] !== 'accounts' || pathParts[2] !== 'locations') {
        console.error(`Invalid location name format: ${locationName}`)
        return false
      }
      
      const accountId = pathParts[1]
      const locationId = pathParts[3]
      
      const deleteLocationUrl = `https://mybusinessbusinessinformation.googleapis.com/v1/accounts/${accountId}/locations/${locationId}`
      console.log(`Deleting location at: ${deleteLocationUrl}`)
      
      const response = await this.makeRequest(deleteLocationUrl, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.authClient.credentials.access_token}`
        }
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`GMB Delete Location API Error:`, response.status, errorText)
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`)
      }

      console.log(`GMB Location ${locationName} deleted successfully`)
      return true
    } catch (error) {
      console.error(`Error deleting location:`, error)
      throw error
    }
  }

  private formatAddress(address: any): string {
    if (!address) return 'No address available'
    
    const parts = [
      address.addressLines?.join(', '),
      address.locality,
      address.administrativeArea,
      address.postalCode,
      address.regionCode
    ].filter(Boolean)
    
    return parts.join(', ')
  }

  // ==================== VERIFICATION METHODS ====================

  /**
   * Fetch available verification options for a location
   * @param locationName - The GMB location name (e.g., "accounts/123/locations/456")
   * @param languageCode - Optional language code (default: 'en-US')
   */
  async fetchVerificationOptions(locationName: string, languageCode: string = 'en-US'): Promise<any> {
    try {
      console.log(`Fetching verification options for location: ${locationName}`)
      
      // First, let's verify the location exists using Business Information API
      const pathParts = locationName.split('/')
      if (pathParts.length !== 4 || pathParts[0] !== 'accounts' || pathParts[2] !== 'locations') {
        throw new Error(`Invalid location name format: ${locationName}. Expected format: accounts/{accountId}/locations/{locationId}`)
      }
      
      const accountId = pathParts[1]
      const locationId = pathParts[3]
      
      console.log(`Verifying location exists: accountId=${accountId}, locationId=${locationId}`)
      
      // Check if location exists using Business Information API
      try {
        const locationCheckUrl = `https://mybusinessbusinessinformation.googleapis.com/v1/locations/${locationId}?readMask=name,title,metadata`
        const locationCheckResponse = await this.makeRequest(locationCheckUrl, {
          headers: {
            'Authorization': `Bearer ${this.authClient.credentials.access_token}`
          }
        })
        
        if (!locationCheckResponse.ok) {
          console.error(`Location ${locationId} not found or not accessible. Status: ${locationCheckResponse.status}`)
          throw new Error(`Location ${locationId} not found or not accessible. Status: ${locationCheckResponse.status}`)
        }
        
        
        const locationData = await locationCheckResponse.json()
        console.log(`Location verified: ${locationData.name}`)
      } catch (locationError) {
        console.error(`Error verifying location ${locationId}:`, locationError)
        throw new Error(`Location ${locationId} verification failed: ${locationError instanceof Error ? locationError.message : 'Unknown error'}`)
      }
      
      // Extract just the location ID for the Verifications API
      // The Verifications API uses locations/{locationId} format, not accounts/{accountId}/locations/{locationId}
      const verificationUrl = `https://mybusinessverifications.googleapis.com/v1/locations/${locationId}:fetchVerificationOptions`
      
      const response = await this.makeRequest(verificationUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.authClient.credentials.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          languageCode: languageCode
        })
      })


      const data = await response.json();

      console.log('Verification options fetched successfully:', data)
      return data
    } catch (error) {
      console.error('Error fetching verification options:', error)
      throw error
    }
  }

  /**
   * Start the verification process for a location
   * @param locationName - The GMB location name
   * @param verificationOptions - The verification method and details
   */
  async startVerification(locationName: string, verificationOptions: any): Promise<any> {
    try {
      console.log(`Starting verification for location: ${locationName}`)
      console.log('Verification options being sent to API:', JSON.stringify(verificationOptions, null, 2))
      
      // Extract just the location ID for the Verifications API
      // The Verifications API uses locations/{locationId} format, not accounts/{accountId}/locations/{locationId}
      const pathParts = locationName.split('/')
      if (pathParts.length !== 4 || pathParts[0] !== 'accounts' || pathParts[2] !== 'locations') {
        throw new Error(`Invalid location name format: ${locationName}. Expected format: accounts/{accountId}/locations/{locationId}`)
      }
      const locationId = pathParts[3]
      const verificationUrl = `https://mybusinessverifications.googleapis.com/v1/locations/${locationId}:verify`

      // Clean up verification options - ensure languageCode and clean phone number
      if (verificationOptions.phoneNumber) {
        verificationOptions.phoneNumber = verificationOptions.phoneNumber.replace(/\s+/g, '')
      }
      if (!verificationOptions.languageCode) {
        verificationOptions.languageCode = 'en-US'
      }
      
      console.log('Verification URL:', verificationUrl)
      console.log('Cleaned verification options:', verificationOptions)
      
      const response = await this.makeRequest(verificationUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.authClient.credentials.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(verificationOptions)
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error(`Verification start API error: ${response.status}`, errorData)
        
        // Extract user-friendly error message from Google API response
        const errorMessage = errorData?.error?.message || 'Failed to start verification process'
        throw new Error(errorMessage)
      }

      const data = await response.json()
      console.log('Verification started successfully:', data)
      return data
    } catch (error) {
      console.error('Error starting verification:', error)
      throw error
    }
  }

  /**
   * Complete a pending verification
   * @param verificationName - The verification resource name (e.g., "accounts/123/locations/456/verifications/789")
   * @param completionDetails - The completion details (e.g., verification code)
   */
  async completeVerification(verificationName: string, completionDetails: any): Promise<any> {
    try {
      console.log(`Completing verification: ${verificationName}`)
      console.log('Completion details:', completionDetails)
      
      const verificationUrl = `https://mybusinessverifications.googleapis.com/v1/${verificationName}:complete`
      
      const response = await this.makeRequest(verificationUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.authClient.credentials.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(completionDetails)
      })

      const data = await response.json()
      console.log('Verification completed successfully:', data)
      return data
    } catch (error) {
      console.error('Error completing verification:', error)
      throw error
    }
  }

  /**
   * List all verifications for a location
   * @param locationName - The GMB location name
   */
  async listVerifications(locationName: string): Promise<any> {
    try {
      console.log(`Listing verifications for location: ${locationName}`)
      
      // First, let's verify the location exists using Business Information API
      const pathParts = locationName.split('/')
      if (pathParts.length !== 4 || pathParts[0] !== 'accounts' || pathParts[2] !== 'locations') {
        throw new Error(`Invalid location name format: ${locationName}. Expected format: accounts/{accountId}/locations/{locationId}`)
      }
      
      const accountId = pathParts[1]
      const locationId = pathParts[3]
      
      console.log(`Verifying location exists: accountId=${accountId}, locationId=${locationId}`)
      
      // Check if location exists using Business Information API
      try {
        const locationCheckUrl = `https://mybusinessbusinessinformation.googleapis.com/v1/locations/${locationId}?readMask=name,title,metadata`
        const locationCheckResponse = await this.makeRequest(locationCheckUrl, {
          headers: {
            'Authorization': `Bearer ${this.authClient.credentials.access_token}`
          }
        })
        
        if (!locationCheckResponse.ok) {
          console.error(`Location ${locationId} not found or not accessible. Status: ${locationCheckResponse.status}`)
          throw new Error(`Location ${locationId} not found or not accessible. Status: ${locationCheckResponse.status}`)
        }
        
        const locationData = await locationCheckResponse.json()
        console.log(`Location verified: ${locationData.name}`)
      } catch (locationError) {
        console.error(`Error verifying location ${locationId}:`, locationError)
        throw new Error(`Location ${locationId} verification failed: ${locationError instanceof Error ? locationError.message : 'Unknown error'}`)
      }
      
      // Extract just the location ID for the Verifications API
      // The Verifications API uses locations/{locationId} format, not accounts/{accountId}/locations/{locationId}
      const verificationUrl = `https://mybusinessverifications.googleapis.com/v1/locations/${locationId}/verifications`
      
      const response = await this.makeRequest(verificationUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.authClient.credentials.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()
      console.log('Verifications listed successfully:', data)
      return data
    } catch (error) {
      console.error('Error listing verifications:', error)
      throw error
    }
  }

  /**
   * Get the Voice of Merchant state for a location
   * @param locationName - The GMB location name
   */
  async getVoiceOfMerchantState(locationName: string): Promise<any> {
    try {
      console.log(`Getting Voice of Merchant state for location: ${locationName}`)
      
      // Extract just the location ID for the Verifications API
      // The Verifications API uses locations/{locationId} format, not accounts/{accountId}/locations/{locationId}
      const pathParts = locationName.split('/')
      if (pathParts.length !== 4 || pathParts[0] !== 'accounts' || pathParts[2] !== 'locations') {
        throw new Error(`Invalid location name format: ${locationName}. Expected format: accounts/{accountId}/locations/{locationId}`)
      }
      const locationId = pathParts[3]
      const verificationUrl = `https://mybusinessverifications.googleapis.com/v1/locations/${locationId}/VoiceOfMerchantState`
      
      const response = await this.makeRequest(verificationUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.authClient.credentials.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()
      console.log('Voice of Merchant state retrieved successfully:', data)
      return data
    } catch (error) {
      console.error('Error getting Voice of Merchant state:', error)
      throw error
    }
  }
}

export default GmbApiServerService
