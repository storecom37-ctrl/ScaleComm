"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { 
  Plus, 
  Upload, 
  Loader2, 
  X,
  Building2,
  MapPin,
  Briefcase,
  Globe,
  Search,
  Clock,
  Settings,
  Image as ImageIcon,
  TestTube
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface StoreFormData {
  // Basic Information
  brandId: string
  name: string
  storeCode: string
  slug: string
  email: string
  phone: string

  // Address
  address: {
    line1: string
    line2: string
    locality: string
    city: string
    state: string
    postalCode: string
    countryCode: string
    latitude?: number
    longitude?: number
  }

  // Business Information
  primaryCategory: string
  gmbCategoryId: string
  gmbCategoryDisplayName: string
  additionalCategories: string[]
  tags: string[]

  // Hours of Operation
  hoursOfOperation: {
    monday: { isOpen: boolean; openTime: string; closeTime: string }
    tuesday: { isOpen: boolean; openTime: string; closeTime: string }
    wednesday: { isOpen: boolean; openTime: string; closeTime: string }
    thursday: { isOpen: boolean; openTime: string; closeTime: string }
    friday: { isOpen: boolean; openTime: string; closeTime: string }
    saturday: { isOpen: boolean; openTime: string; closeTime: string }
    sunday: { isOpen: boolean; openTime: string; closeTime: string }
  }

  // Amenities
  amenities: {
    parkingAvailable: boolean
    deliveryOption: boolean
  }

  // Microsite Content
  microsite: {
    tagline: string
    gmbUrl: string
    mapsUrl: string
    heroImage: { url: string; key: string } | null
    existingImages: Array<{ url: string; key: string; caption: string }>
  }

  // Social Media & Website Links
  socialMedia: {
    website: string
    facebook: string
    instagram: string
    twitter: string
    yelp: string
  }

  // SEO Metadata
  seo: {
    metaTitle: string
    metaDescription: string
    keywords: string[]
  }

  // Google My Business Integration
  gmbLocationId: string
  placeId: string

  // Status
  status: string
}

const initialFormData: StoreFormData = {
  brandId: "",
  name: "",
  storeCode: "",
  slug: "",
  email: "",
  phone: "",
  address: {
    line1: "",
    line2: "",
    locality: "",
    city: "",
    state: "",
    postalCode: "",
    countryCode: "US",
    latitude: undefined,
    longitude: undefined
  },
  primaryCategory: "",
  gmbCategoryId: "",
  gmbCategoryDisplayName: "",
  additionalCategories: [],
  tags: [],
  hoursOfOperation: {
    monday: { isOpen: true, openTime: "09:00", closeTime: "17:00" },
    tuesday: { isOpen: true, openTime: "09:00", closeTime: "17:00" },
    wednesday: { isOpen: true, openTime: "09:00", closeTime: "17:00" },
    thursday: { isOpen: true, openTime: "09:00", closeTime: "17:00" },
    friday: { isOpen: true, openTime: "09:00", closeTime: "17:00" },
    saturday: { isOpen: true, openTime: "09:00", closeTime: "17:00" },
    sunday: { isOpen: false, openTime: "09:00", closeTime: "17:00" }
  },
  amenities: {
    parkingAvailable: false,
    deliveryOption: false
  },
  microsite: {
    tagline: "",
    gmbUrl: "",
    mapsUrl: "",
    heroImage: null,
    existingImages: []
  },
  socialMedia: {
    website: "",
    facebook: "",
    instagram: "",
    twitter: "",
    yelp: ""
  },
  seo: {
    metaTitle: "",
    metaDescription: "",
    keywords: []
  },
  gmbLocationId: "",
  placeId: "",
  status: "active"
}

interface StoreCreateModalProps {
  onStoreCreated?: (store: any, message?: string) => void
  onStoreUpdated?: (store: any, message?: string) => void
  editStore?: any
  isOpen?: boolean
  onClose?: () => void
}

export default function StoreCreateModal({ 
  onStoreCreated, 
  onStoreUpdated, 
  editStore, 
  isOpen, 
  onClose 
}: StoreCreateModalProps) {
  const [open, setOpen] = useState(false)
  
  // Debug open state changes
  useEffect(() => {
    console.log('StoreCreateModal - open state changed:', open)
  }, [open])
  const [currentTab, setCurrentTab] = useState("details")
  const [formData, setFormData] = useState<StoreFormData>(initialFormData)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [brands, setBrands] = useState<any[]>([])
  const [gmbCategories, setGmbCategories] = useState<any[]>([])
  const [loadingCategories, setLoadingCategories] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const isEditMode = !!editStore

  // Handle external modal state control
  useEffect(() => {
    console.log('StoreCreateModal - isOpen changed:', isOpen)
    if (isOpen !== undefined) {
      setOpen(isOpen)
      console.log('StoreCreateModal - Modal state set to:', isOpen)
    }
  }, [isOpen])

  // Fetch brands for dropdown
  useEffect(() => {
    const fetchBrands = async () => {
      try {
        const response = await fetch('/api/brands')
        const result = await response.json()
        if (result.success) {
          console.log('StoreCreateModal - Fetched brands:', result.data)
          setBrands(result.data)
        } else {
          console.error('StoreCreateModal - Failed to fetch brands:', result.error)
        }
      } catch (error) {
        console.error('Error fetching brands:', error)
      }
    }
    fetchBrands()
  }, [])

  // Fetch GMB categories for dropdown
  useEffect(() => {
    const fetchGmbCategories = async () => {
      setLoadingCategories(true)
      try {
        // First check if we need to sync categories
        const syncStatusResponse = await fetch('/api/gmb/categories/sync')
        const syncStatus = await syncStatusResponse.json()
        
        if (syncStatus.success && syncStatus.data.needsSync) {
          console.log('StoreCreateModal - Categories need syncing, syncing now...')
          // Sync categories from GMB API
          const syncResponse = await fetch('/api/gmb/categories/sync', { method: 'POST' })
          const syncResult = await syncResponse.json()
          
          if (syncResult.success) {
            console.log('StoreCreateModal - Categories synced successfully:', syncResult.data)
          } else {
            console.error('StoreCreateModal - Failed to sync categories:', syncResult.error)
          }
        }

        // Now fetch categories from database
        const response = await fetch('/api/gmb/categories/list')
        const result = await response.json()
        if (result.success) {
          console.log('StoreCreateModal - Fetched GMB categories:', result.data.categories.all)
          setGmbCategories(result.data.categories.all)
        } else {
          console.error('StoreCreateModal - Failed to fetch GMB categories:', result.error)
        }
      } catch (error) {
        console.error('Error fetching GMB categories:', error)
      } finally {
        setLoadingCategories(false)
      }
    }
    fetchGmbCategories()
  }, [])

  // Populate form data when editing
  useEffect(() => {
    if (editStore) {
      // Find matching GMB category from primaryCategory
      let matchedGmbCategoryId = editStore.gmbCategoryId || ''
      let matchedGmbCategoryDisplayName = editStore.gmbCategoryDisplayName || editStore.primaryCategory || ''
      
      // If we have primaryCategory but no gmbCategoryId, try to find a match
      if (!matchedGmbCategoryId && editStore.primaryCategory && gmbCategories.length > 0) {
        const matchedCategory = gmbCategories.find(
          cat => cat.label.toLowerCase() === editStore.primaryCategory.toLowerCase()
        )
        if (matchedCategory) {
          matchedGmbCategoryId = matchedCategory.value
          matchedGmbCategoryDisplayName = matchedCategory.label
        } else {
          // If no exact match, just use primaryCategory as displayName
          matchedGmbCategoryDisplayName = editStore.primaryCategory
        }
      }
      
      const newFormData = {
        brandId: editStore.brandId?._id || editStore.brandId || '',
        name: editStore.name || '',
        storeCode: editStore.storeCode || '',
        slug: editStore.slug || '',
        email: editStore.email || '',
        phone: editStore.phone || '',
        address: {
          line1: editStore.address?.line1 || '',
          line2: editStore.address?.line2 || '',
          locality: editStore.address?.locality || '',
          city: editStore.address?.city || '',
          state: editStore.address?.state || '',
          postalCode: editStore.address?.postalCode || '',
          countryCode: editStore.address?.countryCode || 'IN',
          latitude: editStore.address?.latitude || undefined,
          longitude: editStore.address?.longitude || undefined
        },
        primaryCategory: editStore.primaryCategory || 'Business',
        gmbCategoryId: matchedGmbCategoryId,
        gmbCategoryDisplayName: matchedGmbCategoryDisplayName,
        additionalCategories: editStore.additionalCategories || [],
        tags: editStore.tags || [],
        hoursOfOperation: editStore.hoursOfOperation || initialFormData.hoursOfOperation,
        amenities: {
          parkingAvailable: editStore.amenities?.parkingAvailable || false,
          deliveryOption: editStore.amenities?.deliveryOption || false
        },
        microsite: {
          tagline: editStore.microsite?.tagline || '',
          gmbUrl: editStore.microsite?.gmbUrl || editStore.gmbData?.metadata?.websiteUrl || '',
          mapsUrl: editStore.microsite?.mapsUrl || editStore.gmbData?.metadata?.mapsUri || '',
          heroImage: editStore.microsite?.heroImage || null,
          existingImages: editStore.microsite?.existingImages || []
        },
        socialMedia: {
          website: editStore.socialMedia?.website || '',
          facebook: editStore.socialMedia?.facebook || '',
          instagram: editStore.socialMedia?.instagram || '',
          twitter: editStore.socialMedia?.twitter || '',
          yelp: editStore.socialMedia?.yelp || ''
        },
        seo: {
          metaTitle: editStore.seo?.metaTitle || editStore.name || '',
          metaDescription: editStore.seo?.metaDescription || `${editStore.name || ''} - ${editStore.primaryCategory || 'Business'} in ${editStore.address?.city || ''}`,
          keywords: editStore.seo?.keywords || [editStore.primaryCategory || 'Business', editStore.address?.city || ''].filter(Boolean)
        },
        gmbLocationId: editStore.gmbLocationId || '',
        placeId: editStore.placeId || '',
        status: editStore.status || 'active'
      }
      
      console.log('StoreCreateModal - EditStore data:', {
        editStore: editStore,
        microsite: editStore.microsite,
        gmbUrl: editStore.microsite?.gmbUrl,
        mapsUrl: editStore.microsite?.mapsUrl,
        gmbData: editStore.gmbData
      })
      console.log('StoreCreateModal - New form data:', newFormData)
      setFormData(newFormData)
      console.log('StoreCreateModal - Form data set successfully')
    } else {
      console.log('StoreCreateModal - No editStore, using initial form data')
      setFormData(initialFormData)
    }
  }, [editStore, gmbCategories])

  const tabs = [
    { id: "details", label: "Details", icon: Building2 },
    { id: "business", label: "Business Info", icon: Briefcase },
    { id: "microsite", label: "Microsite", icon: Globe },
    { id: "social", label: "Social & Web", icon: Search },
    { id: "seo", label: "SEO", icon: Settings }
  ]

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9 -]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
  }

  const fillTestData = () => {
    const testData: StoreFormData = {
      brandId: brands.length > 0 ? brands[0]._id : "",
      name: "Main Street Branch",
      storeCode: "NYC-001",
      slug: "main-street-branch",
      email: "contact@mainstreet.com",
      phone: "+1-212-555-0123",
      address: {
        line1: "123 Main St",
        line2: "Suite 100",
        locality: "Midtown",
        city: "New York",
        state: "NY",
        postalCode: "10001",
        countryCode: "US",
        latitude: 40.7128,
        longitude: -74.0060
      },
      primaryCategory: "restaurant",
      gmbCategoryId: "gcid:restaurant",
      gmbCategoryDisplayName: "Restaurant",
      additionalCategories: ["fast food", "takeout", "delivery"],
      tags: ["Outdoor Seating", "Free WiFi", "Parking Available"],
      hoursOfOperation: {
        monday: { isOpen: true, openTime: "08:00", closeTime: "22:00" },
        tuesday: { isOpen: true, openTime: "08:00", closeTime: "22:00" },
        wednesday: { isOpen: true, openTime: "08:00", closeTime: "22:00" },
        thursday: { isOpen: true, openTime: "08:00", closeTime: "22:00" },
        friday: { isOpen: true, openTime: "08:00", closeTime: "23:00" },
        saturday: { isOpen: true, openTime: "09:00", closeTime: "23:00" },
        sunday: { isOpen: true, openTime: "09:00", closeTime: "21:00" }
      },
      amenities: {
        parkingAvailable: true,
        deliveryOption: true
      },
      microsite: {
        tagline: "A short, catchy phrase for this location",
        gmbUrl: "https://www.colive.com/bangalore/pg-in-marathahalli/main-street-branch",
        mapsUrl: "https://maps.google.com/maps?cid=12244601560303741346",
        heroImage: null,
        existingImages: []
      },
      socialMedia: {
        website: "https://yourstore.com",
        facebook: "https://facebook.com/yourstore",
        instagram: "https://instagram.com/yourstore",
        twitter: "https://twitter.com/yourstore",
        yelp: "https://yelp.com/biz/yourstore"
      },
      seo: {
        metaTitle: "Main Street Branch | New York, NY",
        metaDescription: "Visit our Main Street Branch in the heart of New York City. Great food, friendly service, and convenient location.",
        keywords: ["restaurant", "new york", "main street", "food", "dining", "takeout", "delivery"]
      },
      gmbLocationId: "",
      placeId: "",
      status: "active"
    }
    
    setFormData(testData)
    setErrors({})
  }

  const handleNameChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      name: value,
      slug: generateSlug(value)
    }))
  }

  const handleInputChange = (field: string, value: any) => {
    const keys = field.split('.')
    setFormData(prev => {
      const updated = { ...prev }
      let current: any = updated
      
      for (let i = 0; i < keys.length - 1; i++) {
        if (!(keys[i] in current)) {
          current[keys[i]] = {}
        }
        current = current[keys[i]]
      }
      
      current[keys[keys.length - 1]] = value
      return updated
    })
  }

  const handleGmbCategoryChange = (gmbCategoryId: string) => {
    const selectedCategory = gmbCategories.find(cat => cat.value === gmbCategoryId)
    setFormData(prev => ({
      ...prev,
      gmbCategoryId: gmbCategoryId,
      gmbCategoryDisplayName: selectedCategory?.label || '',
      primaryCategory: selectedCategory?.label || ''
    }))
  }

  const handleArrayChange = (field: string, value: string) => {
    const values = value.split(',').map(v => v.trim()).filter(v => v)
    handleInputChange(field, values)
  }

  const handleImageUpload = async (file: File, type: 'hero' | 'existing') => {
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('folder', 'stores')

      const response = await fetch('/api/stores/upload', {
        method: 'POST',
        body: formData
      })

      const result = await response.json()

      if (result.success) {
        if (type === 'hero') {
          handleInputChange('microsite.heroImage', result.data)
        } else {
          const newImage = { ...result.data, caption: '' }
          setFormData(prev => ({
            ...prev,
            microsite: {
              ...prev.microsite,
              existingImages: [...prev.microsite.existingImages, newImage]
            }
          }))
        }
      } else {
        setErrors(prev => ({ ...prev, upload: result.error }))
      }
    } catch (error) {
      setErrors(prev => ({ ...prev, upload: 'Failed to upload image' }))
    } finally {
      setUploading(false)
    }
  }

  const removeImage = async (type: 'hero' | 'existing', index?: number) => {
    try {
      let imageToDelete: any = null
      
      if (type === 'hero') {
        imageToDelete = formData.microsite.heroImage
        handleInputChange('microsite.heroImage', null)
      } else if (typeof index === 'number') {
        imageToDelete = formData.microsite.existingImages[index]
        const updatedImages = formData.microsite.existingImages.filter((_, i) => i !== index)
        handleInputChange('microsite.existingImages', updatedImages)
      }

      // Delete from S3
      if (imageToDelete?.key) {
        await fetch('/api/stores/upload', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: imageToDelete.key })
        })
      }
    } catch (error) {
      console.error('Error removing image:', error)
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    // Basic validation - brandId is optional for GMB stores
    if (!formData.brandId && !formData.gmbLocationId) newErrors.brandId = "Brand is required"
    if (!formData.name.trim()) newErrors.name = "Store name is required"
    if (!formData.storeCode.trim()) newErrors.storeCode = "Store code is required"
    if (!formData.email.trim()) newErrors.email = "Email is required"
    if (!formData.address.line1.trim()) newErrors.addressLine1 = "Address line 1 is required"
    if (!formData.address.city.trim()) newErrors.city = "City is required"
    if (!formData.address.state.trim()) newErrors.state = "State is required"
    if (!formData.address.postalCode.trim()) newErrors.postalCode = "Postal code is required"

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!validateForm()) return

    setLoading(true)
    try {      
      const url = isEditMode ? `/api/stores/${editStore._id}` : '/api/stores'
      const method = isEditMode ? 'PUT' : 'POST'
      
      console.log('Store Create Modal - Submit Debug:', {
        isEditMode,
        editStoreId: editStore?._id,
        editStoreName: editStore?.name,
        url,
        method
      })
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      })

      const result = await response.json()

      if (result.success) {
        const closeModal = () => {
          if (onClose) {
            onClose()
          } else {
            setOpen(false)
          }
          setFormData(initialFormData)
          setCurrentTab("details")
          setErrors({})
        }

        // Extract success message
        const successMessage = result.message || (isEditMode ? 'Store updated successfully' : 'Store created successfully')
        
        closeModal()
        
        if (isEditMode) {
          onStoreUpdated?.(result.data, successMessage)
        } else {
          onStoreCreated?.(result.data, successMessage)
        }
      } else {
        // Process error message to make it more user-friendly
        let errorMessage = result.error || 'An unexpected error occurred'
        
        // If it's a raw JSON error, try to extract meaningful information
        if (errorMessage.includes('Failed to update GMB') && errorMessage.includes('HTTP error')) {
          if (errorMessage.includes('THROTTLED')) {
            errorMessage = 'Google My Business API rate limit exceeded. Please wait a moment and try again.'
          } else if (errorMessage.includes('INVALID_CATEGORY')) {
            errorMessage = 'Invalid business category. Please select a valid category from the list.'
          } else if (errorMessage.includes('INVALID_PHONE_NUMBER')) {
            errorMessage = 'Invalid phone number format. Please enter a valid phone number.'
          } else if (errorMessage.includes('PIN_DROP_REQUIRED')) {
            errorMessage = 'Address update requires location verification. Please contact support.'
          } else if (errorMessage.includes('INVALID_ADDRESS')) {
            errorMessage = 'Invalid address format. Please check your address details.'
          } else if (errorMessage.includes('ADDRESS_EDIT_CHANGES_COUNTRY')) {
            errorMessage = 'Cannot change country in address. Please contact support for country changes.'
          } else {
            errorMessage = 'Failed to update store in Google My Business. Please check your information and try again.'
          }
        }
        
        setErrors(prev => ({ ...prev, submit: errorMessage }))
      }
    } catch (error) {
      const errorMessage = isEditMode ? 'Failed to update store' : 'Failed to create store'
      setErrors(prev => ({ ...prev, submit: errorMessage }))
    } finally {
      setLoading(false)
    }
  }

  const renderTabContent = () => {
    switch (currentTab) {
      case "details":
        return (
          <div className="space-y-8">
            {/* Basic Information */}
            <Card className="border-0 shadow-sm bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  Basic Information
                </CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-300">
                  Essential details about your store
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="brandId" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Brand *
                    </Label>
                    <Select 
                      value={formData.brandId} 
                      onValueChange={(value) => handleInputChange('brandId', value)}
                    >
                      <SelectTrigger className="h-11 border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-400">
                        <SelectValue placeholder="Select brand" />
                      </SelectTrigger>
                      <SelectContent>
                        {brands.map((brand) => (
                          <SelectItem key={brand._id} value={brand._id}>
                            <div className="flex items-center gap-2">
                              {brand.logo?.url && (
                                <img 
                                  src={brand.logo.url} 
                                  alt={brand.name}
                                  className="w-4 h-4 rounded object-cover"
                                />
                              )}
                              <div className="flex flex-col">
                                <span className="font-medium">{brand.name}</span>
                                {brand.industry && (
                                  <span className="text-xs text-gray-500 capitalize">
                                    {brand.industry}
                                  </span>
                                )}
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.brandId && <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                      <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                      {errors.brandId}
                    </p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="storeCode" className="text-sm font-medium text-gray-700 dark:text-gray-300">Store Code *</Label>
                    <Input
                      id="storeCode"
                      value={formData.storeCode}
                      onChange={(e) => handleInputChange('storeCode', e.target.value.toUpperCase())}
                      placeholder="e.g. NYC-001"
                      className="h-11 border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-400"
                    />
                    {errors.storeCode && <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                      <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                      {errors.storeCode}
                    </p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm font-medium text-gray-700 dark:text-gray-300">Store Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleNameChange(e.target.value)}
                      placeholder="Main Street Branch"
                      className="h-11 border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-400"
                    />
                    {errors.name && <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                      <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                      {errors.name}
                    </p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="slug" className="text-sm font-medium text-gray-700 dark:text-gray-300">Store Slug *</Label>
                    <Input
                      id="slug"
                      value={formData.slug}
                      onChange={(e) => handleInputChange('slug', e.target.value)}
                      placeholder="main-street-branch"
                      className="h-11 border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-400"
                    />
                    {errors.slug && <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                      <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                      {errors.slug}
                    </p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium text-gray-700 dark:text-gray-300">Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      placeholder="contact@store.com"
                      className="h-11 border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-400"
                    />
                    {errors.email && <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                      <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                      {errors.email}
                    </p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-sm font-medium text-gray-700 dark:text-gray-300">Landline Phone Number</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      placeholder="+1-212-555-0123"
                      className="h-11 border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-400"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Address */}
            <Card className="border-0 shadow-sm bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  Address Information
                </CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-300">
                  Physical location details for your store
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="addressLine1" className="text-sm font-medium text-gray-700 dark:text-gray-300">Address Line 1 *</Label>
                    <Input
                      id="addressLine1"
                      value={formData.address.line1}
                      onChange={(e) => handleInputChange('address.line1', e.target.value)}
                      placeholder="123 Main St"
                      className="h-11 border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-400"
                    />
                    {errors.addressLine1 && <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                      <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                      {errors.addressLine1}
                    </p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="addressLine2" className="text-sm font-medium text-gray-700 dark:text-gray-300">Address Line 2</Label>
                    <Input
                      id="addressLine2"
                      value={formData.address.line2}
                      onChange={(e) => handleInputChange('address.line2', e.target.value)}
                      placeholder="Suite 100"
                      className="h-11 border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="locality" className="text-sm font-medium text-gray-700 dark:text-gray-300">Locality</Label>
                    <Input
                      id="locality"
                      value={formData.address.locality}
                      onChange={(e) => handleInputChange('address.locality', e.target.value)}
                      placeholder="Midtown"
                      className="h-11 border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-400"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city" className="text-sm font-medium text-gray-700 dark:text-gray-300">City *</Label>
                    <Input
                      id="city"
                      value={formData.address.city}
                      onChange={(e) => handleInputChange('address.city', e.target.value)}
                      placeholder="New York"
                      className="h-11 border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-400"
                    />
                    {errors.city && <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                      <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                      {errors.city}
                    </p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="postalCode" className="text-sm font-medium text-gray-700 dark:text-gray-300">Postal Code *</Label>
                    <Input
                      id="postalCode"
                      value={formData.address.postalCode}
                      onChange={(e) => handleInputChange('address.postalCode', e.target.value)}
                      placeholder="10001"
                      className="h-11 border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-400"
                    />
                    {errors.postalCode && <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                      <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                      {errors.postalCode}
                    </p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state" className="text-sm font-medium text-gray-700 dark:text-gray-300">State *</Label>
                    <Input
                      id="state"
                      value={formData.address.state}
                      onChange={(e) => handleInputChange('address.state', e.target.value)}
                      placeholder="NY"
                      className="h-11 border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-400"
                    />
                    {errors.state && <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                      <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                      {errors.state}
                    </p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="countryCode" className="text-sm font-medium text-gray-700 dark:text-gray-300">Country Code</Label>
                    <Input
                      id="countryCode"
                      value={formData.address.countryCode}
                      onChange={(e) => handleInputChange('address.countryCode', e.target.value.toUpperCase())}
                      placeholder="US"
                      className="h-11 border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="latitude" className="text-sm font-medium text-gray-700 dark:text-gray-300">Latitude</Label>
                    <Input
                      id="latitude"
                      type="number"
                      step="any"
                      value={formData.address.latitude || ''}
                      onChange={(e) => handleInputChange('address.latitude', e.target.value ? parseFloat(e.target.value) : undefined)}
                      placeholder="40.7128"
                      className="h-11 border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-400"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="longitude" className="text-sm font-medium text-gray-700 dark:text-gray-300">Longitude</Label>
                    <Input
                      id="longitude"
                      type="number"
                      step="any"
                      value={formData.address.longitude || ''}
                      onChange={(e) => handleInputChange('address.longitude', e.target.value ? parseFloat(e.target.value) : undefined)}
                      placeholder="-74.0060"
                      className="h-11 border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-400"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )

      case "business":
        return (
          <div className="space-y-8">
            {/* Business Categories & Tags */}
            <Card className="border-0 shadow-sm bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  Business Categories & Tags
                </CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-300">
                  Define your business type and characteristics
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="primaryCategory" className="text-sm font-medium text-gray-700 dark:text-gray-300">Primary Category</Label>
                    <Select 
                      value={formData.gmbCategoryId} 
                      onValueChange={handleGmbCategoryChange}
                      disabled={loadingCategories}
                    >
                      <SelectTrigger className="h-11 border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-400">
                        <SelectValue placeholder={loadingCategories ? "Loading categories..." : "Select GMB category"} />
                      </SelectTrigger>
                      <SelectContent>
                        {gmbCategories.map((category) => (
                          <SelectItem key={category.value} value={category.value}>
                            {category.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {formData.gmbCategoryId && (
                      <p className="text-xs text-gray-500">
                        Selected: {formData.gmbCategoryDisplayName} ({formData.gmbCategoryId})
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="additionalCategories" className="text-sm font-medium text-gray-700 dark:text-gray-300">Additional Categories</Label>
                    <Input
                      id="additionalCategories"
                      value={formData.additionalCategories.join(', ')}
                      onChange={(e) => handleArrayChange('additionalCategories', e.target.value)}
                      placeholder="fast food, takeout, delivery (comma-separated)"
                      className="h-11 border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-400"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tags" className="text-sm font-medium text-gray-700 dark:text-gray-300">Tags</Label>
                    <Input
                      id="tags"
                      value={formData.tags.join(', ')}
                      onChange={(e) => handleArrayChange('tags', e.target.value)}
                      placeholder="e.g., Outdoor Seating, Free WiFi (comma-separated)"
                      className="h-11 border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-400"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Hours of Operation */}
            <Card className="border-0 shadow-sm bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  Hours of Operation
                </CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-300">
                  Set your store's operating hours for each day
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(formData.hoursOfOperation).map(([day, hours]) => (
                  <div key={day} className="flex items-center gap-4 p-4 bg-gray-50/50 dark:bg-gray-800/50 rounded-lg border border-gray-200/50 dark:border-gray-700/50">
                    <div className="w-24">
                      <span className="font-medium capitalize text-gray-700 dark:text-gray-300">{day}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={hours.isOpen}
                        onCheckedChange={(checked) => 
                          handleInputChange(`hoursOfOperation.${day}.isOpen`, checked)
                        }
                        className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                      />
                      <span className="text-sm text-gray-600 dark:text-gray-400">Open</span>
                    </div>
                    {hours.isOpen && (
                      <>
                        <Input
                          type="time"
                          value={hours.openTime}
                          onChange={(e) => handleInputChange(`hoursOfOperation.${day}.openTime`, e.target.value)}
                          className="w-32 h-9 border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-400"
                        />
                        <span className="text-gray-400">-</span>
                        <Input
                          type="time"
                          value={hours.closeTime}
                          onChange={(e) => handleInputChange(`hoursOfOperation.${day}.closeTime`, e.target.value)}
                          className="w-32 h-9 border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-400"
                        />
                      </>
                    )}
                    {!hours.isOpen && (
                      <span className="text-gray-500 dark:text-gray-400">Closed</span>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Amenities */}
            <Card className="border-0 shadow-sm bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Settings className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  Amenities & Services
                </CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-300">
                  Select available amenities and services
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-center space-x-3 p-3 bg-gray-50/50 dark:bg-gray-800/50 rounded-lg border border-gray-200/50 dark:border-gray-700/50">
                    <Checkbox
                      id="parkingAvailable"
                      checked={formData.amenities.parkingAvailable}
                      onCheckedChange={(checked) => handleInputChange('amenities.parkingAvailable', checked)}
                      className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                    />
                    <Label htmlFor="parkingAvailable" className="text-gray-700 dark:text-gray-300 font-medium">Parking Available</Label>
                  </div>
                  <div className="flex items-center space-x-3 p-3 bg-gray-50/50 dark:bg-gray-800/50 rounded-lg border border-gray-200/50 dark:border-gray-700/50">
                    <Checkbox
                      id="deliveryOption"
                      checked={formData.amenities.deliveryOption}
                      onCheckedChange={(checked) => handleInputChange('amenities.deliveryOption', checked)}
                      className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                    />
                    <Label htmlFor="deliveryOption" className="text-gray-700 dark:text-gray-300 font-medium">Delivery Option</Label>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )

      case "microsite":
        return (
          <div className="space-y-6">
            {/* Microsite Content */}
            <Card className="border-0 shadow-sm bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Globe className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  Microsite Content
                </CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-300">
                  Customize your store's online presence
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="tagline" className="text-sm font-medium text-gray-700 dark:text-gray-300">Tagline / Slogan</Label>
                  <Input
                    id="tagline"
                    value={formData.microsite.tagline}
                    onChange={(e) => handleInputChange('microsite.tagline', e.target.value)}
                    placeholder="A short, catchy phrase for this location"
                    className="h-11 border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-400"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gmbUrl" className="text-sm font-medium text-gray-700 dark:text-gray-300">Location Page URL (GMB)</Label>
                  <Input
                    id="gmbUrl"
                    value={formData.microsite.gmbUrl}
                    onChange={(e) => handleInputChange('microsite.gmbUrl', e.target.value)}
                    placeholder="https://www.colive.com/bangalore/pg-in-marathahalli/..."
                    className="h-11 border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-400"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400">The specific location page URL from Google My Business</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mapsUrl" className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    Google Maps URL
                  </Label>
                  <Input
                    id="mapsUrl"
                    value={formData.microsite.mapsUrl || ''}
                    onChange={(e) => handleInputChange('microsite.mapsUrl', e.target.value)}
                    placeholder="https://maps.google.com/maps?cid=12244601560303741346"
                    className={`h-11 border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-400`}
                  />
        
                  {/* Manual Sync Button */}
                  {isEditMode && editStore && !formData.microsite.mapsUrl && (
                    <div className="p-2 bg-yellow-50 border border-yellow-200 rounded-md">
                      <p className="text-xs text-yellow-700 font-medium mb-2">
                        Maps URL not found in microsite, but may be available in GMB data:
                      </p>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="text-xs h-8"
                        onClick={() => {
                          const gmbMapsUri = editStore.gmbData?.metadata?.mapsUri
                          if (gmbMapsUri) {
                            handleInputChange('microsite.mapsUrl', gmbMapsUri)
                          }
                        }}
                      >
                        Copy from GMB Data
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Microsite Preview */}
          

            {/* Hero Image */}
            <Card className="border-0 shadow-sm bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <ImageIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  Hero Image
                </CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-300">
                  Upload a main image for your store's microsite
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center bg-gradient-to-br from-gray-50 to-gray-100/50 dark:from-gray-800/50 dark:to-gray-900/50 hover:from-blue-50 hover:to-blue-100/50 dark:hover:from-blue-950/30 dark:hover:to-blue-900/30 transition-all duration-200 group">
                  {formData.microsite.heroImage ? (
                    <div className="flex flex-col items-center space-y-4">
                      <div className="relative group/image">
                        <img 
                          src={formData.microsite.heroImage.url} 
                          alt="Hero" 
                          className="h-40 w-full object-cover rounded-lg border-2 border-gray-200 dark:border-gray-700 shadow-md" 
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover/image:bg-black/20 transition-all duration-200 rounded-lg flex items-center justify-center">
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => removeImage('hero')}
                            className="opacity-0 group-hover/image:opacity-100 transition-opacity duration-200"
                          >
                            <X className="mr-2 h-4 w-4" />
                            Remove Image
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-col items-center space-y-4">
                        <div className="p-4 bg-white/80 dark:bg-gray-800/80 rounded-full group-hover:bg-blue-50 dark:group-hover:bg-blue-950/50 transition-colors duration-200">
                          <Upload className="h-12 w-12 text-gray-400 group-hover:text-blue-500 dark:text-gray-500 dark:group-hover:text-blue-400 transition-colors duration-200" />
                        </div>
                        <div className="space-y-3">
                          <div className="space-y-1">
                            <h4 className="text-lg font-semibold text-gray-700 dark:text-gray-300">Upload Hero Image</h4>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Drag and drop your image here, or click to browse</p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                            className="bg-white/80 hover:bg-blue-50 dark:bg-gray-800/80 dark:hover:bg-blue-950/50 border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 transition-all duration-200"
                          >
                            {uploading ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Uploading...
                              </>
                            ) : (
                              <>
                                <Upload className="mr-2 h-4 w-4" />
                                Choose File
                              </>
                            )}
                          </Button>
                          <p className="text-xs text-gray-400 dark:text-gray-500">
                            Supports: JPEG, PNG, WebP, GIF • Max size: 5MB
                          </p>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Existing Images */}
            <Card className="border-0 shadow-sm bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <ImageIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  Gallery Images
                </CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-300">
                  Add additional images to showcase your store
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {formData.microsite.existingImages.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {formData.microsite.existingImages.map((image, index) => (
                      <div key={index} className="relative group">
                        <img 
                          src={image.url} 
                          alt={`Gallery ${index + 1}`} 
                          className="w-full h-32 object-cover rounded-lg border-2 border-gray-200 dark:border-gray-700 shadow-sm" 
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-200 rounded-lg flex items-center justify-center">
                          <Button
                            variant="destructive"
                            size="sm"
                            className="opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                            onClick={() => removeImage('existing', index)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-400 dark:text-gray-500">
                    <ImageIcon className="mx-auto h-16 w-16 mb-4 opacity-50" />
                    <p className="text-lg font-medium mb-2">No gallery images yet</p>
                    <p className="text-sm">Upload images to showcase your store</p>
                  </div>
                )}
                <div className="text-center pt-4 border-t border-gray-200 dark:border-gray-700">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="bg-white/80 hover:bg-blue-50 dark:bg-gray-800/80 dark:hover:bg-blue-950/50 border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 transition-all duration-200"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Gallery Images
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">Recommended: 1200×600px or similar aspect ratio</p>
                </div>
              </CardContent>
            </Card>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={async (e) => {
                const files = Array.from(e.target.files || [])
                for (const file of files) {
                  if (!formData.microsite.heroImage) {
                    await handleImageUpload(file, 'hero')
                  } else {
                    await handleImageUpload(file, 'existing')
                  }
                }
                e.target.value = '' // Reset input
              }}
            />
          </div>
        )

      case "social":
        return (
          <div className="space-y-8">
            {/* Social Media & Website Links */}
            <Card className="border-0 shadow-sm bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Search className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  Social Media & Website Links
                </CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-300">
                  Connect your store's online presence
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="website" className="text-sm font-medium text-gray-700 dark:text-gray-300">Website URL</Label>
                    <Input
                      id="website"
                      value={formData.socialMedia.website}
                      onChange={(e) => handleInputChange('socialMedia.website', e.target.value)}
                      placeholder="https://yourstore.com"
                      className="h-11 border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-400"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="facebook" className="text-sm font-medium text-gray-700 dark:text-gray-300">Facebook URL</Label>
                    <Input
                      id="facebook"
                      value={formData.socialMedia.facebook}
                      onChange={(e) => handleInputChange('socialMedia.facebook', e.target.value)}
                      placeholder="https://facebook.com/yourstore"
                      className="h-11 border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-400"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="instagram" className="text-sm font-medium text-gray-700 dark:text-gray-300">Instagram URL</Label>
                    <Input
                      id="instagram"
                      value={formData.socialMedia.instagram}
                      onChange={(e) => handleInputChange('socialMedia.instagram', e.target.value)}
                      placeholder="https://instagram.com/yourstore"
                      className="h-11 border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-400"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="twitter" className="text-sm font-medium text-gray-700 dark:text-gray-300">Twitter / X URL</Label>
                    <Input
                      id="twitter"
                      value={formData.socialMedia.twitter}
                      onChange={(e) => handleInputChange('socialMedia.twitter', e.target.value)}
                      placeholder="https://twitter.com/yourstore"
                      className="h-11 border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-400"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="yelp" className="text-sm font-medium text-gray-700 dark:text-gray-300">Yelp URL</Label>
                    <Input
                      id="yelp"
                      value={formData.socialMedia.yelp}
                      onChange={(e) => handleInputChange('socialMedia.yelp', e.target.value)}
                      placeholder="https://yelp.com/biz/yourstore"
                      className="h-11 border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-400"
                    />
                  </div>
                  <div></div>
                </div>
              </CardContent>
            </Card>
          </div>
        )

      case "seo":
        return (
          <div className="space-y-8">
            {/* SEO Metadata */}
            <Card className="border-0 shadow-sm bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Settings className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  SEO Metadata
                </CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-300">
                  Optimize your store's search engine visibility
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
                  <p className="text-sm text-amber-700 dark:text-amber-300 font-medium">
                    💡 This information helps search engines understand and rank your microsite page.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="metaTitle" className="text-sm font-medium text-gray-700 dark:text-gray-300">Meta Title</Label>
                  <Input
                    id="metaTitle"
                    value={formData.seo.metaTitle}
                    onChange={(e) => handleInputChange('seo.metaTitle', e.target.value)}
                    placeholder="Your Store Name | City, State"
                    className="h-11 border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-400"
                  />
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Recommended length: 50-60 characters</p>
                    <p className={`text-xs ${formData.seo.metaTitle.length > 60 ? 'text-red-500' : formData.seo.metaTitle.length > 50 ? 'text-amber-500' : 'text-green-500'}`}>
                      {formData.seo.metaTitle.length}/60
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="metaDescription" className="text-sm font-medium text-gray-700 dark:text-gray-300">Meta Description</Label>
                  <Textarea
                    id="metaDescription"
                    value={formData.seo.metaDescription}
                    onChange={(e) => handleInputChange('seo.metaDescription', e.target.value)}
                    placeholder="A brief, compelling description of your store."
                    className="min-h-[100px] resize-none border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-400"
                  />
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Recommended length: 150-160 characters</p>
                    <p className={`text-xs ${formData.seo.metaDescription.length > 160 ? 'text-red-500' : formData.seo.metaDescription.length > 150 ? 'text-amber-500' : 'text-green-500'}`}>
                      {formData.seo.metaDescription.length}/160
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="keywords" className="text-sm font-medium text-gray-700 dark:text-gray-300">Keywords</Label>
                  <Input
                    id="keywords"
                    value={formData.seo.keywords.join(', ')}
                    onChange={(e) => handleArrayChange('seo.keywords', e.target.value)}
                    placeholder="keyword one, keyword two, keyword three"
                    className="h-11 border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-400"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400">Comma-separated keywords relevant to your business and location</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )

      default:
        return null
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (isEditMode && onClose && !newOpen) {
      // In edit mode, call the external onClose handler
      onClose()
    } else {
      // In create mode, use internal state
      setOpen(newOpen)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {!isEditMode && (
        <DialogTrigger asChild>
          <Button className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Store
          </Button>
        </DialogTrigger>
      )}
      <DialogContent 
        className="max-w-none w-[95vw] sm:w-[90vw] md:w-[85vw] lg:w-[80vw] xl:max-w-[1000px] max-h-[95vh] overflow-hidden flex flex-col p-0 gap-0"
      >
        <DialogHeader className="px-6 py-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <DialogTitle className="text-xl font-semibold text-gray-900 dark:text-white">
                {isEditMode ? 'Edit Store' : 'Create New Store'}
              </DialogTitle>
              <DialogDescription className="text-gray-600 dark:text-gray-300">
                {isEditMode 
                  ? 'Update your store information and settings'
                  : 'Set up your store profile with all the essential information'
                }
              </DialogDescription>
            </div>
            {!isEditMode && (
              <Button
                variant="outline"
                size="sm"
                onClick={fillTestData}
                className="flex items-center gap-2 hover:bg-blue-50 dark:hover:bg-blue-950/30 border-blue-200 dark:border-blue-800"
              >
                <TestTube className="h-4 w-4" />
                Fill Test Data
              </Button>
            )}
          </div>
        </DialogHeader>

        {/* Tab Navigation */}
        <div className="px-3 sm:px-6 py-3 border-b bg-gray-50/50 dark:bg-gray-900/50">
          <div className="flex space-x-1 overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setCurrentTab(tab.id)}
                  className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                    currentTab === tab.id
                      ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm border border-blue-200 dark:border-blue-800'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-white/70 dark:hover:bg-gray-800/70'
                  }`}
                >
                  <Icon className={`h-3 w-3 sm:h-4 sm:w-4 ${currentTab === tab.id ? 'text-blue-600 dark:text-blue-400' : ''}`} />
                  <span className="hidden xs:inline">{tab.label}</span>
                  <span className="xs:hidden">{tab.label.split(' ')[0]}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 sm:py-6">
          {renderTabContent()}
        </div>

        {/* Error Display */}
        {(errors.submit || errors.upload) && (
          <div className="px-3 sm:px-6 py-3 border-t bg-red-50/50 dark:bg-red-950/20">
            {errors.submit && (
              <div className="flex items-start gap-3 p-4 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
                <div className="w-5 h-5 bg-red-500 rounded-full flex-shrink-0 mt-0.5"></div>
                <div className="flex-1">
                  <p className="text-sm text-red-700 dark:text-red-300 font-medium mb-1">
                    {isEditMode ? 'Unable to update store' : 'Unable to create store'}
                  </p>
                  <p className="text-sm text-red-600 dark:text-red-400">{errors.submit}</p>
                  {errors.submit.includes('Google My Business') && (
                    <p className="text-xs text-red-500 dark:text-red-500 mt-2">
                      💡 Tip: Make sure your store information meets Google My Business requirements.
                    </p>
                  )}
                </div>
              </div>
            )}
            {errors.upload && (
              <div className="flex items-start gap-3 p-4 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
                <div className="w-5 h-5 bg-red-500 rounded-full flex-shrink-0 mt-0.5"></div>
                <div className="flex-1">
                  <p className="text-sm text-red-700 dark:text-red-300 font-medium mb-1">
                    Upload Error
                  </p>
                  <p className="text-sm text-red-600 dark:text-red-400">{errors.upload}</p>
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="px-3 sm:px-6 py-4 border-t bg-gray-50/50 dark:bg-gray-900/50">
          <div className="flex flex-col sm:flex-row items-center justify-between w-full gap-4">
            <div className="text-sm text-gray-500 dark:text-gray-400 text-center sm:text-left order-2 sm:order-1">
              {isEditMode ? 'Update your store information' : 'Complete all required fields to create your store'}
            </div>
            <div className="flex gap-3 order-1 sm:order-2 w-full sm:w-auto">
              <Button 
                variant="outline" 
                onClick={() => setOpen(false)}
                className="px-4 sm:px-6 flex-1 sm:flex-none"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSubmit} 
                disabled={loading}
                className="px-4 sm:px-6 bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 flex-1 sm:flex-none"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isEditMode ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  <>
                    {isEditMode ? 'Update Store' : 'Create Store'}
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
