import { create } from 'zustand'

export interface GmbAccount {
  id: string
  name: string
  email: string
  connectedAt: string
}

export interface GmbLocation {
  id: string
  name: string
  address: string
  phoneNumber?: string
  websiteUrl?: string
  categories: string[]
  verified: boolean
  accountId: string
}

export interface GmbReview {
  id: string
  reviewer: {
    displayName: string
    profilePhotoUrl?: string
  }
  starRating: number
  comment?: string
  createTime: string
  updateTime: string
  locationId: string
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
}

interface GmbStore {
  // Connection state
  isConnected: boolean
  isLoading: boolean
  error: string | null
  
  // Account data
  account: GmbAccount | null
  locations: GmbLocation[]
  reviews: GmbReview[]
  posts: GmbPost[]
  insights: Record<string, GmbInsights>
  
  // API availability state
  reviewsApiAvailable: boolean
  reviewsApiError: string | null
  
  // Sync state
  lastSyncAt: string | null
  isSyncing: boolean
  
  // Store filtering state
  selectedStores: string[]
  multiSelectMode: boolean
  
  // Actions
  setConnected: (connected: boolean) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setAccount: (account: GmbAccount | null) => void
  setLocations: (locations: GmbLocation[]) => void
  setReviews: (reviews: GmbReview[]) => void
  setPosts: (posts: GmbPost[]) => void
  setInsights: (locationId: string, insights: GmbInsights) => void
  setReviewsApiAvailable: (available: boolean) => void
  setReviewsApiError: (error: string | null) => void
  setSyncing: (syncing: boolean) => void
  setLastSyncAt: (timestamp: string) => void
  
  // Store filtering actions
  setSelectedStores: (stores: string[]) => void
  setMultiSelectMode: (enabled: boolean) => void
  addStoreToFilter: (storeId: string) => void
  removeStoreFromFilter: (storeId: string) => void
  clearStoreFilter: () => void
  
  // Complex actions
  addLocation: (location: GmbLocation) => void
  updateLocation: (locationId: string, updates: Partial<GmbLocation>) => void
  addReview: (review: GmbReview) => void
  addPost: (post: GmbPost) => void
  
  // Reset
  reset: () => void
  
  // Debug
  debugState: () => void
}

const initialState = {
  isConnected: false,
  isLoading: false,
  error: null,
  account: null,
  locations: [],
  reviews: [],
  posts: [],
  insights: {},
  reviewsApiAvailable: false,
  reviewsApiError: null,
  lastSyncAt: null,
  isSyncing: false,
  selectedStores: ["all"],
  multiSelectMode: false,
}

export const useGmbStore = create<GmbStore>()((set, get) => ({
  ...initialState,
  
  setConnected: (connected) => set({ isConnected: connected }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  setAccount: (account) => set({ account }),
  setLocations: (locations) => set({ locations }),
  setReviews: (reviews) => {
    set({ reviews })
  },
  setPosts: (posts) => {
    set({ posts })
  },
  setInsights: (locationId, insights) => 
    set((state) => ({
      insights: { ...state.insights, [locationId]: insights }
    })),
  setReviewsApiAvailable: (available) => set({ reviewsApiAvailable: available }),
  setReviewsApiError: (error) => set({ reviewsApiError: error }),
  setSyncing: (syncing) => set({ isSyncing: syncing }),
  setLastSyncAt: (timestamp) => set({ lastSyncAt: timestamp }),
  
  // Store filtering actions
  setSelectedStores: (stores) => set({ selectedStores: stores }),
  setMultiSelectMode: (enabled) => set({ multiSelectMode: enabled }),
  addStoreToFilter: (storeId) => 
    set((state) => {
      if (state.selectedStores.includes("all")) {
        return { selectedStores: [storeId] }
      }
      if (!state.selectedStores.includes(storeId)) {
        return { selectedStores: [...state.selectedStores, storeId] }
      }
      return state
    }),
  removeStoreFromFilter: (storeId) =>
    set((state) => ({
      selectedStores: state.selectedStores.filter(id => id !== storeId)
    })),
  clearStoreFilter: () => set({ selectedStores: ["all"] }),
  
  addLocation: (location) => 
    set((state) => ({
      locations: [...state.locations, location]
    })),
  
  updateLocation: (locationId, updates) =>
    set((state) => ({
      locations: state.locations.map(loc => 
        loc.id === locationId ? { ...loc, ...updates } : loc
      )
    })),
  
  addReview: (review) =>
    set((state) => ({
      reviews: [review, ...state.reviews]
    })),
  
  addPost: (post) =>
    set((state) => ({
      posts: [post, ...state.posts]
    })),
  
  reset: () => set(initialState),
  
  debugState: () => {
    const state = get()
    console.log('=== GMB Store Debug State ===')
    console.log('isConnected:', state.isConnected)
    console.log('locations count:', state.locations.length)
    console.log('reviews count:', state.reviews.length)
    console.log('posts count:', state.posts.length)
    console.log('reviewsApiAvailable:', state.reviewsApiAvailable)
    console.log('reviewsApiError:', state.reviewsApiError)
    console.log('lastSyncAt:', state.lastSyncAt)
    console.log('===========================')
    return state
  },
}))
