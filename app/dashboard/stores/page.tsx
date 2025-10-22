"use client"

import { useState, useEffect } from "react"
import { useGmbStore } from "@/lib/stores/gmb-store"
import { useGmbData } from "@/lib/hooks/use-gmb-data"
import { useBrands } from "@/lib/hooks/use-gmb-data"
import { useStores } from "@/lib/hooks/use-stores"
import { useAuth } from "@/lib/hooks/use-auth"
import StoreCreateModal from "@/components/dashboard/store-create-modal"
import GmbSyncButton from "@/components/dashboard/gmb-sync-button"
import { VerificationModal } from "@/components/dashboard/verification-modal"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { 
  Store, 
  MapPin, 
  Phone, 
  Globe, 
  Star, 
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Shield,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  TrendingUp,
  Archive,
  Download,
  ExternalLink
} from "lucide-react"


export default function StoresPage() {
  const { user, hasPermission } = useAuth()
  
  // Helper function to format address
  const formatAddress = (address: any): string => {
    if (typeof address === 'string') return address
    if (!address) return 'No address'
    const parts = [
      address.line1,
      address.line2,
      address.city,
      address.state,
      address.postalCode
    ].filter(Boolean)
    return parts.join(', ')
  }

  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(5)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [cityFilter, setCityFilter] = useState("all")
  
  // Fetch stores from API
  const { stores, isLoading: storesLoading, refresh: refreshStores, totalStores } = useStores({
    status: 'active',
    limit: 10000 // Fetch all stores linked to the account
  })
  
  // Store management state
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [selectedStore, setSelectedStore] = useState<any>(null)
  
  // Toast notification state
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [toastType, setToastType] = useState<'success' | 'error'>('success')
  
  // Debug selectedStore changes
  useEffect(() => {
    console.log('Stores Page - selectedStore changed:', selectedStore)
  }, [selectedStore])
  
  // Debug editModalOpen changes
  useEffect(() => {
    console.log('Stores Page - editModalOpen changed:', editModalOpen)
  }, [editModalOpen])
  
  // Auto-hide toast after 5 seconds
  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => {
        setShowToast(false)
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [showToast])
  
  // Get GMB data for reviews only
  const {
    reviews: dbReviews,
  } = useGmbData()
  
  // Fetch brands data
  const { brands, isLoading: brandsLoading } = useBrands()
  
  // Transform stores data to include calculated fields
  const storesData = stores.map((store: any) => {
    // Get reviews for this store if it has a GMB location ID
    const storeReviews = store.gmbLocationId 
      ? (dbReviews || []).filter((review: any) => 
          review.locationId === store.gmbLocationId || 
          review.locationId.includes(store.gmbLocationId) ||
          store.gmbLocationId.includes(review.locationId)
        )
      : []
    
    const avgRating = storeReviews.length > 0 
      ? storeReviews.reduce((sum: number, review: any) => sum + review.starRating, 0) / storeReviews.length 
      : 0
    
    return {
      ...store,
      rating: Math.round(avgRating * 10) / 10 || 0,
      reviews: storeReviews.length || 0,
      status: store.status === 'active' ? 'Live' : store.status === 'draft' ? 'Draft' : 'Archived',
      category: store.primaryCategory || 'Business',
      city: store.address?.city || 'Unknown',
      phone: store.phone || 'N/A',
      website: store.socialMedia?.website || 'N/A',
      gmbConnected: !!store.gmbLocationId,
      performance: Math.min(95, Math.max(60, Math.round((avgRating || 0) * 20 + Math.random() * 10))),
      isTopPerformer: avgRating >= 4.5,
      monthlyViews: Math.floor(Math.random() * 10000) + 2000,
      monthlyClicks: Math.floor(Math.random() * 800) + 200,
      callClicks: Math.floor(Math.random() * 150) + 50,
    }
  })

  // Generate microsite URL with priority to GMB micrositeUrl first, then our generated URL when onlystore is true
  const getMicrositeUrl = (store: any) => {
    // First priority: Use GMB microsite URL if available
    if (store.microsite?.gmbUrl) {
      return store.microsite.gmbUrl
    }
    
    // Second priority: Check if we have our generated microsite URL (localhost:3001) when onlystore is true
    if (store.onlystore && store.brandId && typeof store.brandId === 'object' && store.brandId._id && store.slug) {
      return `http://localhost:3001/${store.brandId.slug}/stores/${store.slug}`
    }
    
    // For GMB stores with brand information (also localhost:3001) when onlystore is true
    if (store.onlystore && store.gmbConnected && store.brandId && store.slug) {
      return `http://localhost:3001/${store.brandId.slug}/stores/${store.slug}`
    }
    
    return null
  }

  // Handle microsite link click
  const handleMicrositeView = (store: any) => {
    const micrositeUrl = getMicrositeUrl(store)
    const ourUrl = store.brandId && store.slug ? `http://localhost:3001/${store.brandId.slug}/stores/${store.slug}` : null
    const gmbUrl = store.microsite?.gmbUrl
    
    console.log('Microsite URL Debug:', {
      storeId: store.id || store._id,
      storeName: store.name,
      gmbConnected: store.gmbConnected,
      brandId: store.brandId,
      slug: store.slug,
      ourUrl,
      gmbUrl,
      selectedUrl: micrositeUrl,
      priority: ourUrl ? 'Our URL (localhost:3001)' : gmbUrl ? 'GMB URL' : 'None'
    })
    
    if (micrositeUrl) {
      window.open(micrositeUrl, '_blank')
    } else {
      console.warn('No microsite URL generated for store:', store.name)
    }
  }

  const handleStoreCreated = (store: any, message?: string) => {
    refreshStores()
    
    // Show success toast
    if (message) {
      setToastMessage(message)
      setToastType('success')
      setShowToast(true)
    }
  }

  const handleStoreUpdated = (store: any, message?: string) => {
    refreshStores()
    setEditModalOpen(false)
    setSelectedStore(null)
    
    // Show success toast
    if (message) {
      setToastMessage(message)
      setToastType('success')
      setShowToast(true)
    }
  }

  const transformGMBStoreToEditFormat = (store: any) => {
    
    const addressString = typeof store.address === 'string' ? store.address : 
                         (store.address?.line1 ? `${store.address.line1}, ${store.address.city || ''}, ${store.address.state || ''}, ${store.address.postalCode || ''}` : '')
    
    const addressParts = addressString.split(',')
    
    // Parse address components from the string
    let line1 = '', city = '', state = '', postalCode = ''
    if (addressParts.length >= 1) line1 = addressParts[0]?.trim() || ''
    if (addressParts.length >= 2) city = addressParts[addressParts.length - 2]?.trim() || ''
    if (addressParts.length >= 3) state = addressParts[addressParts.length - 2]?.trim() || ''
    if (addressParts.length >= 1) postalCode = addressParts[addressParts.length - 1]?.trim() || ''
    
    // Use store.city if available, otherwise extract from address
    const finalCity = store.city || city || 'Unknown'
    const transformedData = {
      _id: store._id || store.id, // Use database _id first, fallback to GMB id
      brandId: store.brandId || '', // GMB stores don't have brand association
      name: store.name || '',
      storeCode: (store.name || '').replace(/\s+/g, '-').toLowerCase(), // Generate store code from name
      slug: (store.name || '').replace(/\s+/g, '-').toLowerCase(),
      email: store.email || 'N/A',
      phone: store.phone || '',
      address: {
        line1: line1 || store.address?.line1 || '',
        line2: store.address?.line2 || '',
        locality: finalCity,
        city: finalCity,
        state: state || store.address?.state || '',
        postalCode: postalCode || store.address?.postalCode || '',
        countryCode: store.address?.countryCode || 'IN',
        latitude: store.address?.latitude || undefined,
        longitude: store.address?.longitude || undefined
      },
      primaryCategory: store.primaryCategory || 'Business',
      additionalCategories: store.additionalCategories || [],
      tags: store.tags || [],
      hoursOfOperation: {
        monday: { isOpen: store.hoursOfOperation?.monday?.isOpen || true, openTime: store.hoursOfOperation?.monday?.openTime || "09:00", closeTime: store.hoursOfOperation?.monday?.closeTime || "17:00" },
        tuesday: { isOpen: store.hoursOfOperation?.tuesday?.isOpen || true, openTime: store.hoursOfOperation?.tuesday?.openTime || "09:00", closeTime: store.hoursOfOperation?.tuesday?.closeTime || "17:00" },
        wednesday: { isOpen: store.hoursOfOperation?.wednesday?.isOpen || true, openTime: store.hoursOfOperation?.wednesday?.openTime || "09:00", closeTime: store.hoursOfOperation?.wednesday?.closeTime || "17:00" },
        thursday: { isOpen: store.hoursOfOperation?.thursday?.isOpen || true, openTime: store.hoursOfOperation?.thursday?.openTime || "09:00", closeTime: store.hoursOfOperation?.thursday?.closeTime || "17:00" },
        friday: { isOpen: store.hoursOfOperation?.friday?.isOpen || true, openTime: store.hoursOfOperation?.friday?.openTime || "09:00", closeTime: store.hoursOfOperation?.friday?.closeTime || "17:00" },
        saturday: { isOpen: store.hoursOfOperation?.saturday?.isOpen || true, openTime: store.hoursOfOperation?.saturday?.openTime || "09:00", closeTime: store.hoursOfOperation?.saturday?.closeTime || "17:00" },
        sunday: { isOpen: store.hoursOfOperation?.sunday?.isOpen || false, openTime: store.hoursOfOperation?.sunday?.openTime || "09:00", closeTime: store.hoursOfOperation?.sunday?.closeTime || "17:00" }
      },
      amenities: {
        parkingAvailable: store.amenities?.parkingAvailable || false,
        deliveryOption: store.amenities?.deliveryOption || false
      },
      microsite: {
        tagline: store.microsite?.tagline || '',
        gmbUrl: store.microsite?.gmbUrl || store.website || '',
        mapsUrl: store.microsite?.mapsUrl || store.gmbData?.metadata?.mapsUri || '',
        heroImage: store.microsite?.heroImage || null,
        existingImages: store.microsite?.existingImages || []
      },
      socialMedia: {
        website: store.website && store.website !== 'N/A' ? store.website : '',
        facebook: store.socialMedia?.facebook || '',
        instagram: store.socialMedia?.instagram || '',
        twitter: store.socialMedia?.twitter || '',
        yelp: store.socialMedia?.yelp || ''
      },
      seo: {
        metaTitle: store.name || '',
        metaDescription: `${store.name || ''} - ${store.category || 'Business'} in ${finalCity}`,
        keywords: [store.category || 'Business', finalCity].filter(Boolean)
      },
      gmbLocationId: store.gmbLocationId || store.id || '',
      placeId: '',
      status: (store.status || '').toLowerCase() === 'live' ? 'active' : 'draft'
    }
    
    console.log('Transform output:', {
      _id: transformedData._id,
      name: transformedData.name,
      gmbLocationId: transformedData.gmbLocationId,
      originalStoreId: store._id || store.id,
      originalGmbLocationId: store.gmbLocationId,
      originalId: store.id,
      micrositeData: {
        original: store.microsite,
        transformed: transformedData.microsite,
        gmbData: store.gmbData?.metadata
      }
    })
    return transformedData
  }

  const handleStoreEdit = async (store: any) => {
    try {
      let storeToEdit = store
      
      // If this is a GMB store (has gmbConnected flag), we need to find the database store
      if (store.gmbConnected && store.id) {
        console.log('Looking up database store for GMB location:', store.id)
        
        // Try multiple GMB location ID formats
        const gmbLocationIdFormats = [
          store.id, // Original format
          `accounts/102362177139815885148/locations/${store.id}`, // Full format
          store.id.split('/').pop(), // Just the location ID part
          store.id.trim(), // Trimmed version
          store.id.toLowerCase(), // Lowercase version
          store.id.toUpperCase() // Uppercase version
        ]
        
        let foundStore = null
        for (const gmbId of gmbLocationIdFormats) {
          console.log('Trying GMB location ID format:', gmbId)
          const response = await fetch(`/api/stores?gmbLocationId=${encodeURIComponent(gmbId)}`)
          const result = await response.json()
          
          if (result.success && result.data && result.data.length > 0) {
            foundStore = result.data[0]
            console.log('Found database store with format:', gmbId, foundStore)
            break
          }
        }
        
        // If still not found, try a broader search by name
        if (!foundStore) {
          console.log('Trying to find store by name:', store.name)
          const nameResponse = await fetch(`/api/stores?search=${encodeURIComponent(store.name)}`)
          const nameResult = await nameResponse.json()
          
          if (nameResult.success && nameResult.data && nameResult.data.length > 0) {
            // Look for a store with similar GMB location ID
            const similarStore = nameResult.data.find((s: any) => 
              s.gmbLocationId && (
                s.gmbLocationId.includes(store.id) || 
                store.id.includes(s.gmbLocationId) ||
                s.gmbLocationId.split('/').pop() === store.id.split('/').pop()
              )
            )
            if (similarStore) {
              foundStore = similarStore
              console.log('Found store by name and similar GMB ID:', foundStore)
            }
          }
        }
        
        if (foundStore) {
          // Use the database store instead of the GMB store
          storeToEdit = foundStore
          console.log('Using database store:', storeToEdit)
        } else {
          // If no database store found, create one
          console.log('No database store found, creating new one for GMB location')
          const createResponse = await fetch('/api/stores', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              brandId: store.brandId?._id || store.brandId || '',
              name: store.name,
              storeCode: store.name.replace(/\s+/g, '-').toLowerCase(),
              email: 'N/A',
              address: {
                line1: store.address?.split(',')[0] || store.address || '',
                city: store.city || 'Unknown',
                state: 'Unknown',
                postalCode: '00000',
                countryCode: 'IN'
              },
              primaryCategory: store.category || 'Business',
              gmbLocationId: store.id,
              status: 'active'
            })
          })
          
          const createResult = await createResponse.json()
          if (createResult.success) {
            storeToEdit = createResult.data
            console.log('Created new database store:', storeToEdit)
          } else {
            console.error('Failed to create database store:', createResult.error)
            
            // If the error is "already exists", try to find the existing store
            if (createResult.error && createResult.error.includes('already exists')) {
              console.log('Store already exists, trying to find it again...')
              
              // Try one more comprehensive search
              const finalSearchResponse = await fetch(`/api/stores?search=${encodeURIComponent(store.name)}`)
              const finalSearchResult = await finalSearchResponse.json()
              
              if (finalSearchResult.success && finalSearchResult.data && finalSearchResult.data.length > 0) {
                // Find the store that matches this GMB location
                const existingStore = finalSearchResult.data.find((s: any) => 
                  s.name === store.name || 
                  (s.gmbLocationId && s.gmbLocationId.includes(store.id.split('/').pop()))
                )
                
                if (existingStore) {
                  storeToEdit = existingStore
                  console.log('Found existing store after creation error:', storeToEdit)
                } else {
                  alert('Store already exists but could not be found. Please refresh the page and try again.')
                  return
                }
              } else {
                alert('Store already exists but could not be found. Please refresh the page and try again.')
                return
              }
            } else {
              alert('Failed to create database store for editing. Please try again.')
              return
            }
          }
        }
      }
      
      // Transform store data to edit format
      const transformedStore = transformGMBStoreToEditFormat(storeToEdit)
      console.log('Editing store:', { 
        original: store, 
        databaseStore: storeToEdit, 
        transformed: transformedStore,
        finalId: transformedStore._id,
        isGmbStore: store.gmbConnected
      })
      console.log('Setting selectedStore to:', transformedStore)
      console.log('Setting editModalOpen to true')
      setSelectedStore(transformedStore)
      setEditModalOpen(true)
    } catch (error) {
      console.error('Error preparing store for edit:', error)
      alert('Failed to prepare store for editing. Please try again.')
    }
  }

  const handleStoreView = (store: any) => {
    // Transform GMB store data to edit format
    const transformedStore = transformGMBStoreToEditFormat(store)
    console.log('Viewing store:', { original: store, transformed: transformedStore })
    setSelectedStore(transformedStore)
    setEditModalOpen(true)
  }

  const handleEditModalClose = () => {
    setEditModalOpen(false)
    setSelectedStore(null)
  }

  const handleStoreDelete = async (storeId: string) => {
    if (!confirm('Are you sure you want to delete this store?')) return
    
    try {
      const response = await fetch(`/api/stores/${storeId}`, {
        method: 'DELETE'
      })
      const result = await response.json()
      if (result.success) {
        refreshStores()
      } else {
        alert(`Error: ${result.error}`)
      }
    } catch (error) {
      console.error('Error deleting store:', error)
      alert('Failed to delete store. Please try again.')
    }
  }
  
  const isLoadingData = storesLoading || brandsLoading
  
  // Get unique categories and cities for filters
  const categories = [...new Set(storesData.map((store: any) => store.primaryCategory || store.category))].filter(Boolean) as string[]
  const cities = [...new Set(storesData.map((store: any) => store.address?.city || store.city))].filter(Boolean) as string[]

  // Filter stores based on search term, status, category, and city
  const filteredStores = storesData.filter((store: any) => {
    const storeCity = store.address?.city || store.city || ''
    const storeCategory = store.primaryCategory || store.category || ''
    
    const matchesSearch = store.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         formatAddress(store.address).toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (store.phone || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         storeCity.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || store.status.toLowerCase() === statusFilter.toLowerCase()
    const matchesCategory = categoryFilter === "all" || storeCategory === categoryFilter
    const matchesCity = cityFilter === "all" || storeCity === cityFilter
    
    return matchesSearch && matchesStatus && matchesCategory && matchesCity
  })

  // Calculate pagination
  const totalPages = Math.ceil(filteredStores.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedStores = filteredStores.slice(startIndex, startIndex + itemsPerPage)

  const renderStars = (rating: number) => {
    return (
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
            }`}
          />
        ))}
      </div>
    )
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Live":
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            Live
          </Badge>
        )
      case "Archived":
        return (
          <Badge variant="secondary" className="bg-gray-100 text-gray-800">
            <Archive className="w-3 h-3 mr-1" />
            Archived
          </Badge>
        )
      case "Pending":
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
            <XCircle className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  // Verification status functions
  const getVerificationStatus = (store: any) => {
    const isVerified = store.gmbData?.verified || store.verified === true
    const isGmbConnected = store.gmbConnected || store.gmbLocationId
    
    if (isVerified) {
      return (
        <div className="flex items-center gap-2">
          <Badge className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            Verified
          </Badge>
        </div>
      )
    } else if (isGmbConnected) {
      return (
        <div className="flex items-center gap-2">
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
            <AlertCircle className="w-3 h-3 mr-1" />
            Not Verified
          </Badge>
        </div>
      )
    } else {
      return (
        <div className="flex items-center gap-2">
          <Badge className="bg-gray-100 text-gray-800 border-gray-200">
            <XCircle className="w-3 h-3 mr-1" />
            Not Connected
          </Badge>
        </div>
      )
    }
  }

  
  // Verification modal state
  const [verificationModalOpen, setVerificationModalOpen] = useState(false)
  const [selectedStoreForVerification, setSelectedStoreForVerification] = useState<any>(null)

  // Handle opening verification modal
  const handleOpenVerificationModal = (store: any) => {
    setSelectedStoreForVerification({
      _id: store._id || store.id,
      name: store.name,
      gmbLocationId: store.gmbLocationId || store.id,
      gmbAccountId: store.gmbAccountId || store.accountId,
      verified: store.verified || store.gmbData?.verified
    })
    setVerificationModalOpen(true)
  }

  // Handle closing verification modal
  const handleCloseVerificationModal = () => {
    setVerificationModalOpen(false)
    setSelectedStoreForVerification(null)
  }

  // Handle verification completion
  const handleVerificationComplete = () => {
    // Refresh stores data to show updated verification status
    refreshStores()
    handleCloseVerificationModal()
  }


  const handleBulkVerify = async () => {
    const gmbStores = filteredStores.filter(store => 
      (store.gmbConnected || store.gmbLocationId) && 
      !(store.gmbData?.verified || store.verified === true)
    )
    
    if (gmbStores.length === 0) {
      alert('No unverified GMB stores found to verify')
      return
    }

    const storeIds = gmbStores.map(store => store._id || store.id)
    const gmbLocationIds = gmbStores.map(store => store.gmbLocationId || store.id)
    
    try {
      const response = await fetch('/api/gmb/verify-bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          storeIds,
          gmbLocationIds
        }),
      })

      const result = await response.json()
      
      if (result.success) {
        // Refresh stores data
        refreshStores()
        console.log('Bulk verification completed:', result.message)
        alert(`Bulk verification completed: ${result.message}`)
      } else {
        throw new Error(result.error || 'Bulk verification failed')
      }
    } catch (error) {
      console.error('Error in bulk verification:', error)
      alert(`Bulk verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Show loading state
  if (isLoadingData) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Stores</h1>
            <p className="text-muted-foreground">Loading your store locations...</p>
          </div>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-muted-foreground">Fetching stores from API...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Stores</h1>
          <p className="text-muted-foreground">
            {totalStores > 0 
              ? `Showing ${totalStores} stores from API`
              : 'No stores found - create stores or sync GMB account to populate data'
            }
          </p>
        </div>
        <div className="flex items-center gap-4">
          <GmbSyncButton onSyncComplete={refreshStores} />
          {hasPermission('create_store') && (
            <StoreCreateModal onStoreCreated={handleStoreCreated} />
          )}
        </div>
      </div>

     {/* Store Statistics */}
     <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Stores</CardTitle>
            <Store className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{storesData.length}</div>
            <p className="text-xs text-muted-foreground">Across all locations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Stores</CardTitle>
            <Badge className="bg-green-100 text-green-800">Active</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{storesData.filter((store: any) => store.status === "Live").length}</div>
            <p className="text-xs text-muted-foreground">Currently operational</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">GMB Connected</CardTitle>
            <Globe className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{storesData.filter((store: any) => store.gmbConnected).length}</div>
            <p className="text-xs text-muted-foreground">Google My Business linked</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Rating</CardTitle>
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {storesData.length > 0 ? (storesData.reduce((sum: number, store: any) => sum + store.rating, 0) / storesData.length).toFixed(1) : '0.0'}
            </div>
            <p className="text-xs text-muted-foreground">Across all stores</p>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Performance Analytics */}
      {/* <div className="grid gap-6 md:grid-cols-2">
      
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              Monthly Performance
            </CardTitle>
            <CardDescription>Key metrics for this month</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Eye className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="font-semibold text-sm">Total Views</p>
                    <p className="text-xs text-gray-600">Profile views this month</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-blue-600">
                    {storesData.reduce((sum: number, store: any) => sum + (store.monthlyViews || 0), 0).toLocaleString()}
                  </p>
                  <p className="text-xs text-green-600">+12.5%</p>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Globe className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-semibold text-sm">Website Clicks</p>
                    <p className="text-xs text-gray-600">Clicks to website</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-green-600">
                    {storesData.reduce((sum: number, store: any) => sum + (store.monthlyClicks || 0), 0).toLocaleString()}
                  </p>
                  <p className="text-xs text-green-600">+8.3%</p>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-orange-600" />
                  <div>
                    <p className="font-semibold text-sm">Call Clicks</p>
                    <p className="text-xs text-gray-600">Phone number clicks</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-orange-600">
                    {storesData.reduce((sum, store) => sum + (store.callClicks || 0), 0).toLocaleString()}
                  </p>
                  <p className="text-xs text-green-600">+15.7%</p>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-purple-600" />
                  <div>
                    <p className="font-semibold text-sm">Calls</p>
                    <p className="text-xs text-gray-600">Call clicks</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-purple-600">
                    {storesData.reduce((sum, store) => sum + (store.callClicks || 0), 0).toLocaleString()}
                  </p>
                  <p className="text-xs text-green-600">+22.1%</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

    
         <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              Performance Breakdown
            </CardTitle>
            <CardDescription>Store performance by category</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {categories.map((category, index) => {
                const categoryStores = storesData.filter(store => store.category === category)
                const avgPerformance = categoryStores.length > 0 
                  ? Math.round(categoryStores.reduce((sum, store) => sum + store.performance, 0) / categoryStores.length)
                  : 0
                const colors = [
                  { bg: 'bg-blue-100', text: 'text-blue-800', bar: 'bg-blue-500' },
                  { bg: 'bg-green-100', text: 'text-green-800', bar: 'bg-green-500' },
                  { bg: 'bg-purple-100', text: 'text-purple-800', bar: 'bg-purple-500' },
                  { bg: 'bg-orange-100', text: 'text-orange-800', bar: 'bg-orange-500' }
                ]
                const color = colors[index % colors.length]
                
                return (
                  <div key={category} className={`p-3 ${color.bg} rounded-lg`}>
                    <div className="flex justify-between items-center mb-2">
                      <span className={`font-semibold text-sm ${color.text}`}>{category}</span>
                      <span className={`font-bold text-sm ${color.text}`}>{avgPerformance}%</span>
                    </div>
                    <div className="w-full bg-white bg-opacity-50 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-700 ${color.bar}`}
                        style={{ width: `${avgPerformance}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between mt-2">
                      <span className={`text-xs ${color.text}`}>{categoryStores.length} locations</span>
                      <span className={`text-xs ${color.text}`}>
                        Avg: {categoryStores.length > 0 ? (categoryStores.reduce((sum, store) => sum + store.rating, 0) / categoryStores.length).toFixed(1) : '0.0'} ⭐
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card> 
      </div> */}

      {/* Store Performance Overview */}
      {/* <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              Top Performing Locations
            </CardTitle>
            <CardDescription>Highest rated and most engaged store locations</CardDescription>
          </div>
          <Button variant="outline" size="sm">
            <TrendingUp className="h-4 w-4 mr-2" />
            View Analytics
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
       
            <div>
              <h4 className="font-semibold mb-4 flex items-center gap-2">
                <Star className="h-4 w-4 text-yellow-500" />
                Top Performing Stores
              </h4>
              <div className="space-y-3">
                {storesData
                  .filter(store => store.isTopPerformer)
                  .sort((a, b) => b.performance - a.performance)
                  .slice(0, 3)
                  .map((store) => (
                    <div key={store.id} className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-100">
                      <div className="flex items-center gap-3">
                        <div className="h-3 w-3 bg-gradient-to-r from-green-500 to-blue-500 rounded-full animate-pulse"></div>
                        <div>
                          <p className="font-semibold text-sm text-gray-800">{store.name}</p>
                          <p className="text-xs text-gray-600">{store.city}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-sm text-green-600">{store.performance}%</p>
                        <div className="flex items-center gap-1 mt-1">
                          {renderStars(store.rating)}
                          <span className="text-xs text-gray-600">({store.reviews})</span>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

           
            <div>
              <h4 className="font-semibold mb-4 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                Recent Activity
              </h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-100">
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
                    <div>
                      <p className="font-medium text-sm text-gray-800">New reviews received</p>
                      <p className="text-xs text-gray-600">Last 7 days</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm text-green-600">
                      {storesData.reduce((sum, store) => sum + store.reviews, 0)}
                    </p>
                    <p className="text-xs text-green-600">+18 this week</p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-100">
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse"></div>
                    <div>
                      <p className="font-medium text-sm text-gray-800">Profile updates</p>
                      <p className="text-xs text-gray-600">Business info changes</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm text-blue-600">3</p>
                    <p className="text-xs text-gray-600">Last updated</p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-100">
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-2 bg-orange-500 rounded-full animate-pulse"></div>
                    <div>
                      <p className="font-medium text-sm text-gray-800">Photo uploads</p>
                      <p className="text-xs text-gray-600">New business photos</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm text-orange-600">12</p>
                    <p className="text-xs text-gray-600">This month</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card> */}

      {/* Filters & Search */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-gray-600" />
              Filters & Search
            </CardTitle>
            <CardDescription>Find specific stores using the filters below</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleBulkVerify}
              className="flex items-center gap-2"
              variant="outline"
            >
              <RefreshCw className="h-4 w-4" />
              Bulk Verify
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search stores..." 
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Live & Archived" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Live & Archived</SelectItem>
                <SelectItem value="live">Live</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>{category}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={cityFilter} onValueChange={setCityFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Cities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cities</SelectItem>
                {cities.map((city) => (
                  <SelectItem key={city} value={city}>{city}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* GMB Locations Header */}
          <div className="mt-8 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="outline" className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Advanced Filter
              </Button>
              <Button variant="outline" className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                Export
              </Button>
            </div>
          </div>

          {/* Enhanced Table */}
          <div className="mt-4">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="font-semibold">Store Location</TableHead>
                  <TableHead className="font-semibold">Address</TableHead>
                  <TableHead className="font-semibold">Category</TableHead>
                  <TableHead className="font-semibold">Performance</TableHead>

                  <TableHead className="font-semibold">Verification</TableHead>
                  <TableHead className="font-semibold">Microsite</TableHead>
                  <TableHead className="font-semibold text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedStores.map((store: any, index: number) => (
                  <TableRow key={store._id || store.id || `store-${index}`} className="hover:bg-gray-50 transition-colors">
                    <TableCell className="font-medium">
                      <div className="flex items-center space-x-3">
                        <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <Store className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-semibold">{store.name}</p>
                          <p className="text-xs text-gray-600">{store.city}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <div className="flex items-start space-x-2">
                        <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-gray-700 truncate" title={formatAddress(store.address)}>
                            {formatAddress(store.address)}
                          </p>
                          <div className="flex items-center space-x-2 mt-1">
                            <Phone className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-gray-600">{store.phone}</span>
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        {store.primaryCategory || store.category || 'Business'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className={`text-sm font-bold ${
                            store.performance >= 80 ? 'text-green-600' : 
                            store.performance >= 60 ? 'text-yellow-600' : 'text-red-600'
                          }`}>{store.performance}%</span>
                          <div className="flex items-center gap-1">
                            {renderStars(store.rating)}
                            <span className="text-xs font-medium text-gray-700 ml-1">{store.rating}</span>
                          </div>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 shadow-inner">
                          <div 
                            className={`h-2 rounded-full transition-all duration-500 ${
                              store.performance >= 80 ? 'bg-gradient-to-r from-green-400 to-green-600' : 
                              store.performance >= 60 ? 'bg-gradient-to-r from-yellow-400 to-yellow-600' : 'bg-gradient-to-r from-red-400 to-red-600'
                            }`}
                            style={{ width: `${store.performance}%` }}
                          ></div>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-600">{store.reviews} reviews</span>
                          <span className="text-xs font-medium text-blue-600">
                            {(store.monthlyViews || 0).toLocaleString()} views
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getVerificationStatus(store)}
                    </TableCell>
                    <TableCell>
                      {getMicrositeUrl(store) ? (
                        <div className="flex flex-col gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleMicrositeView(store)}
                            className="flex items-center gap-2 text-blue-600 hover:text-blue-800 w-fit font-medium"
                          >
                            <Globe className="h-4 w-4" />
                            View Microsite
                          </Button>

                        </div>
                      ) : store.brandId && store.slug ? (
                        <div className="flex flex-col gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const brandSlug = typeof store.brandId === 'object' ? store.brandId.slug : store.brandId
                              window.open(`/${brandSlug}/stores/${store.slug}`, '_blank')
                            }}
                            className="flex items-center gap-2 text-blue-600 hover:text-blue-800 w-fit"
                          >
                            <Globe className="h-4 w-4" />
                            View Microsite
                          </Button>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-1">
                          <span className="text-gray-400 text-sm">No microsite</span>
                          {store.gmbConnected && (
                            <span className="text-xs text-blue-600">GMB Location</span>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          
                          {/* Priority 1: GMB Microsite URL (if exists) */}
                          {getMicrositeUrl(store) && (
                            <DropdownMenuItem onClick={() => handleMicrositeView(store)}>
                              <Globe className="mr-2 h-4 w-4" />
                              <span className="text-orange-600 font-medium">GMB Microsite</span>
                            </DropdownMenuItem>
                          )}
                          
                          {/* Priority 2: Dashboard Microsite (if GMB doesn't exist but has brand+slug) */}
                          {!getMicrositeUrl(store) && store.brandId && store.slug && (
                            <DropdownMenuItem onClick={() => {
                              const brandSlug = typeof store.brandId === 'object' ? store.brandId.slug : store.brandId
                              window.open(`/${brandSlug}/stores/${store.slug}`, '_blank')
                            }}>
                              <ExternalLink className="mr-2 h-4 w-4" />
                              <span className="text-blue-600 font-medium">View Store Microsite</span>
                            </DropdownMenuItem>
                          )}
                          
                          {/* Alternative: Dashboard Microsite (if GMB exists, show as secondary option) */}
                          {getMicrositeUrl(store) && store.brandId && store.slug && (
                            <DropdownMenuItem onClick={() => {
                              const brandSlug = typeof store.brandId === 'object' ? store.brandId.slug : store.brandId
                              window.open(`/${brandSlug}/stores/${store.slug}`, '_blank')
                            }}>
                              <ExternalLink className="mr-2 h-4 w-4" />
                              <span className="text-blue-600">Dashboard Microsite</span>
                            </DropdownMenuItem>
                          )}
                          
                          {/* GMB Profile URL (if different from microsite) */}
                          {store.microsite?.gmbUrl && store.microsite.gmbUrl !== getMicrositeUrl(store) && (
                            <DropdownMenuItem onClick={() => window.open(store.microsite.gmbUrl, '_blank')}>
                              <Globe className="mr-2 h-4 w-4" />
                              <span className="text-gray-600">Google Business Profile</span>
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => handleStoreView(store)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>

                          {/* Verification action for GMB connected stores */}
                          {(store.gmbConnected || store.gmbLocationId) && (
                            <DropdownMenuItem onClick={() => handleOpenVerificationModal(store)}>
                              <Shield className="mr-2 h-4 w-4" />
                              <span className="text-blue-600">
                                {store.gmbData?.verified || store.verified === true ? 'Manage Verification' : 'Verify Store'}
                              </span>
                            </DropdownMenuItem>
                          )}

                          {hasPermission('edit_store') && (
                            <DropdownMenuItem onClick={() => handleStoreEdit(store)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit Store
                            </DropdownMenuItem>
                          )}
                          {hasPermission('delete_store') && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                className="text-red-600"
                                onClick={() => handleStoreDelete(store._id || store.id)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete Store
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Pagination */}
            <div className="flex items-center justify-between space-x-2 py-4">
              <div className="flex items-center space-x-2">
                <p className="text-sm text-muted-foreground">
                  Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredStores.length)} of {filteredStores.length} stores
                </p>
              </div>
              
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-2">
                  <p className="text-sm text-muted-foreground">Rows per page:</p>
                  <Select value={itemsPerPage.toString()} onValueChange={(value: string) => {
                    setItemsPerPage(Number(value))
                    setCurrentPage(1)
                  }}>
                    <SelectTrigger className="h-8 w-[70px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent side="top">
                      <SelectItem value="5">5</SelectItem>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  
                  <div className="flex items-center space-x-1">
                    <span className="text-sm text-muted-foreground">
                      Page {currentPage} of {totalPages}
                  </span>
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
                </div>
              </div>
            </CardContent>
          </Card>

      {/* Edit Modal */}
      {selectedStore && (() => {
        console.log('Rendering StoreCreateModal with:', { selectedStore, editModalOpen })
        return (
          <StoreCreateModal
            key={`edit-${selectedStore._id || selectedStore.id || Date.now()}`}
            editStore={selectedStore}
            isOpen={editModalOpen}
            onClose={handleEditModalClose}
            onStoreUpdated={handleStoreUpdated}
          />
        )
      })()}

      {/* Verification Modal */}
      {selectedStoreForVerification && (
        <VerificationModal
          isOpen={verificationModalOpen}
          onClose={handleCloseVerificationModal}
          store={selectedStoreForVerification}
          onVerificationComplete={handleVerificationComplete}
        />
      )}

      {/* Success Toast Notification */}
      {showToast && (
        <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-5">
          <div className={`flex items-center gap-3 rounded-lg px-4 py-3 shadow-lg ${
            toastType === 'success' 
              ? 'bg-green-50 border border-green-200' 
              : 'bg-red-50 border border-red-200'
          }`}>
            {toastType === 'success' ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <XCircle className="h-5 w-5 text-red-600" />
            )}
            <div className="flex-1">
              <p className={`text-sm font-medium ${
                toastType === 'success' ? 'text-green-800' : 'text-red-800'
              }`}>
                {toastMessage}
              </p>
            </div>
            <button
              onClick={() => setShowToast(false)}
              className={`${
                toastType === 'success' ? 'text-green-600 hover:text-green-800' : 'text-red-600 hover:text-red-800'
              }`}
            >
              <XCircle className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
 
    </div>
  )
}
