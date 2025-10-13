"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select } from "@/components/ui/select"
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
  Palette,
  FileText,
  Package,
  Image as ImageIcon,
  Users,
  Settings,
  TestTube
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface BrandFormData {
  // Basic Info
  name: string
  slug: string
  description: string
  logo: { url: string; key: string } | null
  website: string
  email: string
  phone: string
  industry: string
  primaryCategory: string
  additionalCategories: string[]

  // Address
  address: {
    line1: string
    line2: string
    locality: string
    city: string
    state: string
    postalCode: string
    country: string
    latitude: number | null
    longitude: number | null
  }

  // Branding
  branding: {
    primaryColor: string
    accentColor: string
    backgroundColor: string
    fontFamily: string
    template: string
  }

  // Content
  content: {
    aboutSection: string
    missionStatement: string
    valueProposition: string
  }

  // Products
  products: Array<{
    name: string
    category: string
    price: number | null
    description: string
    image: { url: string; key: string } | null
  }>

  // Gallery
  gallery: Array<{
    url: string
    key: string
    caption: string
  }>

  // Users
  users: {
    owner: {
      email: string
      password?: string
    }
    manager: {
      email: string
      password?: string
    }
  }

  // Settings
  settings: {
    gmbIntegration: {
      connected: boolean
      autoSync: boolean
    }
    notifications: {
      reviews: boolean
      posts: boolean
    }
    seo: {
      title: string
      description: string
      keywords: string[]
    }
    socialMedia: {
      facebook: string
      twitter: string
      instagram: string
      linkedin: string
      youtube: string
    }
  }
}

const initialFormData: BrandFormData = {
  name: "",
  slug: "",
  description: "",
  logo: null,
  website: "",
  email: "",
  phone: "",
  industry: "",
  primaryCategory: "",
  additionalCategories: [],
  address: {
    line1: "",
    line2: "",
    locality: "",
    city: "",
    state: "",
    postalCode: "",
    country: "United States",
    latitude: null,
    longitude: null
  },
  branding: {
    primaryColor: "#2962FF",
    accentColor: "#FF9100",
    backgroundColor: "#E6EEFF",
    fontFamily: "Inter",
    template: "classic"
  },
  content: {
    aboutSection: "",
    missionStatement: "",
    valueProposition: ""
  },
  products: [],
  gallery: [],
  users: {
    owner: {
      email: "",
      password: ""
    },
    manager: {
      email: "",
      password: ""
    }
  },
  settings: {
    gmbIntegration: {
      connected: false,
      autoSync: false
    },
    notifications: {
      reviews: true,
      posts: true
    },
    seo: {
      title: "",
      description: "",
      keywords: []
    },
    socialMedia: {
      facebook: "",
      twitter: "",
      instagram: "",
      linkedin: "",
      youtube: ""
    }
  }
}

interface BrandCreateModalProps {
  onBrandCreated?: (brand: any) => void
  onBrandUpdated?: (brand: any) => void
  editBrand?: any
  isOpen?: boolean
  onClose?: () => void
}

export default function BrandCreateModal({ 
  onBrandCreated, 
  onBrandUpdated, 
  editBrand, 
  isOpen, 
  onClose 
}: BrandCreateModalProps) {
  const [open, setOpen] = useState(false)
  const [currentTab, setCurrentTab] = useState("basic")
  const [formData, setFormData] = useState<BrandFormData>(initialFormData)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [tabErrors, setTabErrors] = useState<Record<string, string>>({})
  const fileInputRef = useRef<HTMLInputElement>(null)
  const isEditMode = !!editBrand

  // Handle external modal state control
  useEffect(() => {
    if (isOpen !== undefined) {
      setOpen(isOpen)
    }
  }, [isOpen])

  // Populate form data when editing
  useEffect(() => {
    if (editBrand) {
      setFormData({
        name: editBrand.name || '',
        slug: editBrand.slug || '',
        description: editBrand.description || '',
        logo: editBrand.logo || null,
        website: editBrand.website || '',
        email: editBrand.email || '',
        phone: editBrand.phone || '',
        industry: editBrand.industry || '',
        primaryCategory: editBrand.primaryCategory || '',
        additionalCategories: editBrand.additionalCategories || [],
        address: {
          line1: editBrand.address?.line1 || '',
          line2: editBrand.address?.line2 || '',
          locality: editBrand.address?.locality || '',
          city: editBrand.address?.city || '',
          state: editBrand.address?.state || '',
          postalCode: editBrand.address?.postalCode || '',
          country: editBrand.address?.country || '',
          latitude: editBrand.address?.latitude || undefined,
          longitude: editBrand.address?.longitude || undefined
        },
        branding: {
          primaryColor: editBrand.branding?.primaryColor || '#2962FF',
          accentColor: editBrand.branding?.accentColor || '#FF9100',
          backgroundColor: editBrand.branding?.backgroundColor || '#E6EEFF',
          fontFamily: editBrand.branding?.fontFamily || 'Inter',
          template: editBrand.branding?.template || 'classic'
        },
        content: {
          aboutSection: editBrand.content?.aboutSection || '',
          missionStatement: editBrand.content?.missionStatement || '',
          valueProposition: editBrand.content?.valueProposition || ''
        },
        products: editBrand.products || [],
        gallery: editBrand.gallery || [],
        users: {
          owner: {
            email: editBrand.users?.owner?.email || '',
            password: '' // Don't populate password for security
          },
          manager: {
            email: editBrand.users?.manager?.email || '',
            password: '' // Don't populate password for security
          }
        },
        settings: {
          gmbIntegration: {
            connected: editBrand.settings?.gmbIntegration?.connected || false,
            autoSync: editBrand.settings?.gmbIntegration?.autoSync || false
          },
          notifications: {
            reviews: editBrand.settings?.notifications?.reviews ?? true,
            posts: editBrand.settings?.notifications?.posts ?? true
          },
          seo: {
            title: editBrand.settings?.seo?.title || '',
            description: editBrand.settings?.seo?.description || '',
            keywords: editBrand.settings?.seo?.keywords || []
          },
          socialMedia: {
            facebook: editBrand.settings?.socialMedia?.facebook || '',
            twitter: editBrand.settings?.socialMedia?.twitter || '',
            instagram: editBrand.settings?.socialMedia?.instagram || '',
            linkedin: editBrand.settings?.socialMedia?.linkedin || '',
            youtube: editBrand.settings?.socialMedia?.youtube || ''
          }
        }
      })
    } else {
      setFormData(initialFormData)
    }
  }, [editBrand])

  const tabs = [
    { id: "basic", label: "Basic Info", icon: Building2 },
    { id: "address", label: "Address", icon: MapPin },
    { id: "branding", label: "Branding", icon: Palette },
    { id: "content", label: "Content", icon: FileText },
    { id: "products", label: "Products", icon: Package },
    { id: "gallery", label: "Gallery", icon: ImageIcon },
    { id: "users", label: "Users", icon: Users },
    { id: "settings", label: "Settings", icon: Settings }
  ]

  // Validation functions for each tab
  const validateTab = (tabId: string): string | null => {
    switch (tabId) {
      case "basic":
        if (!formData.name.trim()) return "Brand name is required"
        if (!formData.email.trim()) return "Email is required"
        if (!formData.industry.trim()) return "Industry is required"
        if (!formData.primaryCategory.trim()) return "Primary category is required"
        return null
      
      case "address":
        if (!formData.address.line1.trim()) return "Address line 1 is required"
        if (!formData.address.city.trim()) return "City is required"
        if (!formData.address.state.trim()) return "State is required"
        if (!formData.address.postalCode.trim()) return "Postal code is required"
        return null
      
      case "branding":
        if (!formData.logo && !isEditMode) return "Brand logo is required"
        return null
      
      case "content":
        if (!formData.description.trim()) return "Brand description is required"
        return null
      
      case "products":
        if (formData.products.length === 0) return "At least one product is required"
        return null
      
      case "gallery":
        if (formData.gallery.length === 0) return "At least one gallery image is required"
        return null
      
      case "users":
        if (!formData.users.owner.email.trim()) return "Owner email is required"
        if (!formData.users.manager.email.trim()) return "Manager email is required"
        return null
      
      case "settings":
        if (!formData.settings.seo.title.trim()) return "SEO title is required"
        if (!formData.settings.seo.description.trim()) return "SEO description is required"
        return null
      
      default:
        return null
    }
  }

  // Navigation functions
  const goToNextTab = () => {
    const currentIndex = tabs.findIndex(tab => tab.id === currentTab)
    if (currentIndex < tabs.length - 1) {
      const nextTab = tabs[currentIndex + 1]
      const error = validateTab(currentTab)
      if (error) {
        setTabErrors(prev => ({ ...prev, [currentTab]: error }))
        return
      }
      setTabErrors(prev => ({ ...prev, [currentTab]: "" }))
      setCurrentTab(nextTab.id)
    }
  }

  const goToPreviousTab = () => {
    const currentIndex = tabs.findIndex(tab => tab.id === currentTab)
    if (currentIndex > 0) {
      const prevTab = tabs[currentIndex - 1]
      setCurrentTab(prevTab.id)
    }
  }

  const isLastTab = () => {
    return currentTab === tabs[tabs.length - 1].id
  }

  const isFirstTab = () => {
    return currentTab === tabs[0].id
  }

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9 -]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
  }

  const fillTestData = () => {
    const testData: BrandFormData = {
      name: "Green Valley Restaurant",
      slug: "green-valley-restaurant",
      description: "A family-owned restaurant specializing in farm-to-table dining with locally sourced ingredients and seasonal menus.",
      logo: null,
      website: "https://greenvalleyrestaurant.com",
      email: "info@greenvalleyrestaurant.com",
      phone: "+1 (555) 123-4567",
      industry: "restaurant",
      primaryCategory: "restaurant",
      additionalCategories: ["farm-to-table", "local-ingredients", "fine-dining"],
      address: {
        line1: "123 Main Street",
        line2: "Suite 200",
        locality: "Downtown",
        city: "San Francisco",
        state: "CA",
        postalCode: "94102",
        country: "United States",
        latitude: 37.7749,
        longitude: -122.4194
      },
      branding: {
        primaryColor: "#2E7D32",
        accentColor: "#FF8F00",
        backgroundColor: "#F1F8E9",
        fontFamily: "Roboto",
        template: "modern"
      },
      content: {
        aboutSection: "Green Valley Restaurant has been serving the San Francisco community for over 15 years. We pride ourselves on creating exceptional dining experiences using the freshest local ingredients sourced directly from California farms. Our commitment to sustainability and quality has made us a beloved establishment in the heart of downtown.",
        missionStatement: "To provide exceptional farm-to-table dining experiences that celebrate local ingredients while fostering community connections and environmental sustainability.",
        valueProposition: "Fresh, locally-sourced ingredients • Seasonal menus • Sustainable practices • Warm, welcoming atmosphere • Award-winning chef team"
      },
      products: [
        {
          name: "Signature Farm Salad",
          category: "Appetizers",
          price: 16.99,
          description: "Mixed greens, cherry tomatoes, cucumber, avocado, and house-made vinaigrette with locally sourced organic vegetables.",
          image: null
        },
        {
          name: "Grilled Salmon",
          category: "Main Courses",
          price: 28.99,
          description: "Fresh Pacific salmon grilled to perfection, served with seasonal vegetables and wild rice pilaf.",
          image: null
        },
        {
          name: "Artisan Chocolate Cake",
          category: "Desserts",
          price: 12.99,
          description: "Rich chocolate cake made with local artisan chocolate, served with fresh berries and whipped cream.",
          image: null
        }
      ],
      gallery: [],
      users: {
        owner: {
          email: "owner@greenvalleyrestaurant.com",
          password: "GreenValley2024!"
        },
        manager: {
          email: "manager@greenvalleyrestaurant.com",
          password: "Manager123!"
        }
      },
      settings: {
        gmbIntegration: {
          connected: false,
          autoSync: false
        },
        notifications: {
          reviews: true,
          posts: true
        },
        seo: {
          title: "Green Valley Restaurant - Farm-to-Table Dining in San Francisco",
          description: "Experience exceptional farm-to-table dining at Green Valley Restaurant. Fresh local ingredients, seasonal menus, and sustainable practices in downtown San Francisco.",
          keywords: ["farm to table", "restaurant san francisco", "local ingredients", "sustainable dining", "downtown restaurant"]
        },
        socialMedia: {
          facebook: "https://facebook.com/greenvalleyrestaurant",
          twitter: "https://twitter.com/greenvalley_sf",
          instagram: "https://instagram.com/greenvalleyrestaurant",
          linkedin: "https://linkedin.com/company/green-valley-restaurant",
          youtube: "https://youtube.com/greenvalleyrestaurant"
        }
      }
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

  const handleImageUpload = async (file: File, type: 'logo' | 'product' | 'gallery', index?: number) => {
    if (!file) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('folder', type === 'logo' ? 'brands/logos' : type === 'product' ? 'brands/products' : 'brands/gallery')

      const response = await fetch('/api/brands/upload', {
        method: 'POST',
        body: formData
      })

      const result = await response.json()

      if (result.success) {
        if (type === 'logo') {
          setFormData(prev => ({
            ...prev,
            logo: result.data
          }))
        } else if (type === 'product' && typeof index === 'number') {
          setFormData(prev => ({
            ...prev,
            products: prev.products.map((product, i) => 
              i === index ? { ...product, image: result.data } : product
            )
          }))
        } else if (type === 'gallery') {
          setFormData(prev => ({
            ...prev,
            gallery: [...prev.gallery, { ...result.data, caption: '' }]
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

  const addProduct = () => {
    setFormData(prev => ({
      ...prev,
      products: [...prev.products, {
        name: "",
        category: "",
        price: null,
        description: "",
        image: null
      }]
    }))
  }

  const removeProduct = (index: number) => {
    setFormData(prev => ({
      ...prev,
      products: prev.products.filter((_, i) => i !== index)
    }))
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    // Basic Info validation
    if (!formData.name.trim()) newErrors.name = "Brand name is required"
    if (!formData.slug.trim()) newErrors.slug = "Brand slug is required"
    if (!formData.email.trim()) newErrors.email = "Email is required"
    if (!formData.address.line1.trim()) newErrors.addressLine1 = "Address line 1 is required"
    if (!formData.address.city.trim()) newErrors.city = "City is required"
    if (!formData.address.state.trim()) newErrors.state = "State is required"
    if (!formData.address.postalCode.trim()) newErrors.postalCode = "Postal code is required"
    if (!formData.users.owner.email.trim()) newErrors.ownerEmail = "Owner email is required"
    if (!isEditMode && (!formData.users.owner.password || !formData.users.owner.password.trim())) {
      newErrors.ownerPassword = "Owner password is required"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!validateForm()) return

    setLoading(true)
    try {
      const url = isEditMode ? `/api/brands/${editBrand._id}` : '/api/brands'
      const method = isEditMode ? 'PUT' : 'POST'
      
      // For edit mode, only include password fields if they have values
      const submitData = JSON.parse(JSON.stringify(formData)) // Deep clone
      if (isEditMode) {
        // Only include password if it has a value
        if (!submitData.users.owner.password || submitData.users.owner.password.trim() === '') {
          delete submitData.users.owner.password
        }
        if (!submitData.users.manager?.password || submitData.users.manager.password.trim() === '') {
          if (submitData.users.manager) {
            delete submitData.users.manager.password
          }
        }
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData)
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
          setCurrentTab("basic")
          setErrors({})
          setTabErrors({})
        }

        closeModal()
        
        if (isEditMode) {
          onBrandUpdated?.(result.data)
        } else {
          onBrandCreated?.(result.data)
        }
      } else {
        setErrors(prev => ({ ...prev, submit: result.error }))
      }
    } catch (error) {
      const errorMessage = isEditMode ? 'Failed to update brand' : 'Failed to create brand'
      setErrors(prev => ({ ...prev, submit: errorMessage }))
    } finally {
      setLoading(false)
    }
  }

  const renderTabContent = () => {
    const currentTabError = tabErrors[currentTab]
    
    return (
      <div className="space-y-6">
        {currentTabError && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <X className="h-5 w-5 text-red-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  Please fix the following error:
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{currentTabError}</p>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {(() => {
          switch (currentTab) {
            case "basic":
              return (
                <div className="space-y-6">
            {/* Brand Identity Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground border-b pb-2">Brand Identity</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Brand Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="Enter brand name"
                    className="h-11"
                  />
                  {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slug">Brand Slug *</Label>
                  <Input
                    id="slug"
                    value={formData.slug}
                    onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                    placeholder="brand-slug"
                    className="h-11"
                  />
                  {errors.slug && <p className="text-sm text-red-500">{errors.slug}</p>}
                  <p className="text-xs text-muted-foreground">Example: my-brand-name, brand123, company-name</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of your brand"
                  className="min-h-[100px] resize-none"
                />
              </div>

              <div className="space-y-2">
                <Label>Logo</Label>
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center bg-muted/20 hover:bg-muted/30 transition-colors">
                  {formData.logo ? (
                    <div className="flex flex-col items-center space-y-4">
                      <img src={formData.logo.url} alt="Logo" className="h-20 w-20 object-contain rounded-lg border" />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setFormData(prev => ({ ...prev, logo: null }))}
                      >
                        <X className="mr-2 h-4 w-4" />
                        Remove Logo
                      </Button>
                    </div>
                  ) : (
                    <>
                      <Upload className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
                      <div className="space-y-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploading}
                          className="h-10 px-6"
                        >
                          {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                          Upload Logo
                        </Button>
                        <p className="text-sm text-muted-foreground">
                          PNG, JPG up to 5MB
                        </p>
                      </div>
                    </>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleImageUpload(file, 'logo')
                  }}
                />
              </div>
            </div>

            {/* Contact Information Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground border-b pb-2">Contact Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="contact@brand.com"
                    className="h-11"
                  />
                  {errors.email && <p className="text-sm text-red-500">{errors.email}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="+1 (555) 123-4567"
                    className="h-11"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="website">Website URL</Label>
                <Input
                  id="website"
                  type="url"
                  value={formData.website}
                  onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                  placeholder="https://example.com"
                  className="h-11"
                />
              </div>
            </div>

            {/* Business Categories Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground border-b pb-2">Business Categories</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="industry">Industry</Label>
                  <select
                    id="industry"
                    value={formData.industry}
                    onChange={(e) => setFormData(prev => ({ ...prev, industry: e.target.value }))}
                    className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">Select industry</option>
                    <option value="retail">Retail</option>
                    <option value="restaurant">Restaurant</option>
                    <option value="healthcare">Healthcare</option>
                    <option value="professional-services">Professional Services</option>
                    <option value="beauty">Beauty & Wellness</option>
                    <option value="automotive">Automotive</option>
                    <option value="real-estate">Real Estate</option>
                    <option value="education">Education</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="primaryCategory">Primary Category</Label>
                  <select
                    id="primaryCategory"
                    value={formData.primaryCategory}
                    onChange={(e) => setFormData(prev => ({ ...prev, primaryCategory: e.target.value }))}
                    className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">Select category</option>
                    <option value="restaurant">Restaurant</option>
                    <option value="retail-store">Retail Store</option>
                    <option value="medical-office">Medical Office</option>
                    <option value="law-firm">Law Firm</option>
                    <option value="beauty-salon">Beauty Salon</option>
                    <option value="auto-repair">Auto Repair</option>
                    <option value="real-estate-agency">Real Estate Agency</option>
                    <option value="fitness-center">Fitness Center</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Additional Categories</Label>
                <Input
                  placeholder="Type a category and press Enter to add"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      const value = (e.target as HTMLInputElement).value.trim()
                      if (value && !formData.additionalCategories.includes(value)) {
                        setFormData(prev => ({
                          ...prev,
                          additionalCategories: [...prev.additionalCategories, value]
                        }));
                        (e.target as HTMLInputElement).value = ''
                      }
                    }
                  }}
                  className="h-11"
                />
                {formData.additionalCategories.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {formData.additionalCategories.map((category, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-primary/10 text-primary border border-primary/20"
                      >
                        {category}
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({
                            ...prev,
                            additionalCategories: prev.additionalCategories.filter((_, i) => i !== index)
                          }))}
                          className="ml-2 text-primary/70 hover:text-primary"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )

      case "address":
        return (
          <div className="space-y-6">
            {/* Street Address Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground border-b pb-2">Street Address</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="addressLine1">Address Line 1 *</Label>
                  <Input
                    id="addressLine1"
                    value={formData.address.line1}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      address: { ...prev.address, line1: e.target.value }
                    }))}
                    placeholder="123 Main Street"
                    className="h-11"
                  />
                  {errors.addressLine1 && <p className="text-sm text-red-500">{errors.addressLine1}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="addressLine2">Address Line 2</Label>
                  <Input
                    id="addressLine2"
                    value={formData.address.line2}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      address: { ...prev.address, line2: e.target.value }
                    }))}
                    placeholder="Suite 100, Apartment 4B, etc."
                    className="h-11"
                  />
                </div>
              </div>
            </div>

            {/* Location Details Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground border-b pb-2">Location Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="locality">Locality *</Label>
                  <Input
                    id="locality"
                    value={formData.address.locality}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      address: { ...prev.address, locality: e.target.value }
                    }))}
                    placeholder="Downtown, Midtown, etc."
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    value={formData.address.city}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      address: { ...prev.address, city: e.target.value }
                    }))}
                    placeholder="New York"
                    className="h-11"
                  />
                  {errors.city && <p className="text-sm text-red-500">{errors.city}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="state">State/Province *</Label>
                  <Input
                    id="state"
                    value={formData.address.state}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      address: { ...prev.address, state: e.target.value }
                    }))}
                    placeholder="NY"
                    className="h-11"
                  />
                  {errors.state && <p className="text-sm text-red-500">{errors.state}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="postalCode">Postal Code *</Label>
                  <Input
                    id="postalCode"
                    value={formData.address.postalCode}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      address: { ...prev.address, postalCode: e.target.value }
                    }))}
                    placeholder="10001"
                    className="h-11"
                  />
                  {errors.postalCode && <p className="text-sm text-red-500">{errors.postalCode}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">Country *</Label>
                  <select
                    id="country"
                    value={formData.address.country}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      address: { ...prev.address, country: e.target.value }
                    }))}
                    className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="United States">United States</option>
                    <option value="Canada">Canada</option>
                    <option value="United Kingdom">United Kingdom</option>
                    <option value="Australia">Australia</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Coordinates Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground border-b pb-2">GPS Coordinates</h3>
              <p className="text-sm text-muted-foreground">Optional: Provide exact location coordinates for better mapping</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="latitude">Latitude</Label>
                  <Input
                    id="latitude"
                    type="number"
                    step="any"
                    value={formData.address.latitude || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      address: { ...prev.address, latitude: e.target.value ? parseFloat(e.target.value) : null }
                    }))}
                    placeholder="40.7128"
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="longitude">Longitude</Label>
                  <Input
                    id="longitude"
                    type="number"
                    step="any"
                    value={formData.address.longitude || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      address: { ...prev.address, longitude: e.target.value ? parseFloat(e.target.value) : null }
                    }))}
                    placeholder="-74.0060"
                    className="h-11"
                  />
                </div>
              </div>
            </div>
          </div>
        )

      case "branding":
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Primary Color</Label>
                <div className="flex space-x-2">
                  <div 
                    className="w-12 h-10 rounded border" 
                    style={{ backgroundColor: formData.branding.primaryColor }}
                  ></div>
                  <Input 
                    value={formData.branding.primaryColor} 
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      branding: { ...prev.branding, primaryColor: e.target.value }
                    }))}
                    className="flex-1" 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Accent Color</Label>
                <div className="flex space-x-2">
                  <div 
                    className="w-12 h-10 rounded border" 
                    style={{ backgroundColor: formData.branding.accentColor }}
                  ></div>
                  <Input 
                    value={formData.branding.accentColor} 
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      branding: { ...prev.branding, accentColor: e.target.value }
                    }))}
                    className="flex-1" 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Background Color</Label>
                <div className="flex space-x-2">
                  <div 
                    className="w-12 h-10 rounded border" 
                    style={{ backgroundColor: formData.branding.backgroundColor }}
                  ></div>
                  <Input 
                    value={formData.branding.backgroundColor} 
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      branding: { ...prev.branding, backgroundColor: e.target.value }
                    }))}
                    className="flex-1" 
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Font Family</Label>
                <select
                  value={formData.branding.fontFamily}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    branding: { ...prev.branding, fontFamily: e.target.value }
                  }))}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="Inter">Inter</option>
                  <option value="Roboto">Roboto</option>
                  <option value="Open Sans">Open Sans</option>
                  <option value="Lato">Lato</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label>Template</Label>
                <select
                  value={formData.branding.template}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    branding: { ...prev.branding, template: e.target.value }
                  }))}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="classic">Classic - Professional, clean layout</option>
                  <option value="modern">Modern - Sleek, minimalist design</option>
                  <option value="creative">Creative - Bold, artistic layout</option>
                </select>
              </div>
            </div>
          </div>
        )

      case "content":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>About Section</Label>
              <Textarea
                value={formData.content.aboutSection}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  content: { ...prev.content, aboutSection: e.target.value }
                }))}
                placeholder="Tell your brand story..."
                className="min-h-[100px]"
              />
            </div>

            <div className="space-y-2">
              <Label>Mission Statement</Label>
              <Textarea
                value={formData.content.missionStatement}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  content: { ...prev.content, missionStatement: e.target.value }
                }))}
                placeholder="Your brand's mission..."
                className="min-h-[80px]"
              />
            </div>

            <div className="space-y-2">
              <Label>Value Proposition</Label>
              <Textarea
                value={formData.content.valueProposition}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  content: { ...prev.content, valueProposition: e.target.value }
                }))}
                placeholder="What makes your brand unique..."
                className="min-h-[80px]"
              />
            </div>
          </div>
        )

      case "products":
        return (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Products & Services</h3>
              <Button onClick={addProduct} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Product
              </Button>
            </div>

            {formData.products.map((product, index) => (
              <Card key={index}>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-base">Product {index + 1}</CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeProduct(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Product Name</Label>
                      <Input
                        value={product.name}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          products: prev.products.map((p, i) => 
                            i === index ? { ...p, name: e.target.value } : p
                          )
                        }))}
                        placeholder="Product name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Input
                        value={product.category}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          products: prev.products.map((p, i) => 
                            i === index ? { ...p, category: e.target.value } : p
                          )
                        }))}
                        placeholder="Product category"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Price</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={product.price || ''}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          products: prev.products.map((p, i) => 
                            i === index ? { ...p, price: e.target.value ? parseFloat(e.target.value) : null } : p
                          )
                        }))}
                        placeholder="10.00"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Product Image</Label>
                      {product.image ? (
                        <div className="flex items-center space-x-2">
                          <img src={product.image.url} alt="Product" className="h-12 w-12 object-cover rounded" />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setFormData(prev => ({
                              ...prev,
                              products: prev.products.map((p, i) => 
                                i === index ? { ...p, image: null } : p
                              )
                            }))}
                          >
                            Remove
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const input = document.createElement('input')
                            input.type = 'file'
                            input.accept = 'image/*'
                            input.onchange = (e) => {
                              const file = (e.target as HTMLInputElement).files?.[0]
                              if (file) handleImageUpload(file, 'product', index)
                            }
                            input.click()
                          }}
                          disabled={uploading}
                        >
                          {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                          Select Image
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      value={product.description}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        products: prev.products.map((p, i) => 
                          i === index ? { ...p, description: e.target.value } : p
                        )
                      }))}
                      placeholder="Product description"
                      className="min-h-[60px]"
                    />
                  </div>
                </CardContent>
              </Card>
            ))}

            {formData.products.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No products added yet</p>
                <p className="text-sm">Click "Add Product" to get started</p>
              </div>
            )}
          </div>
        )

      case "gallery":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Upload Images</Label>
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                <ImageIcon className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <div className="mt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const input = document.createElement('input')
                      input.type = 'file'
                      input.accept = 'image/*'
                      input.multiple = true
                      input.onchange = (e) => {
                        const files = Array.from((e.target as HTMLInputElement).files || [])
                        files.forEach(file => handleImageUpload(file, 'gallery'))
                      }
                      input.click()
                    }}
                    disabled={uploading}
                  >
                    {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                    Select Images
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  image/jpeg, image/png, image/webp, image/gif up to 5MB each
                </p>
              </div>
            </div>

            {formData.gallery.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {formData.gallery.map((image, index) => (
                  <div key={index} className="relative group">
                    <img 
                      src={image.url} 
                      alt={`Gallery ${index + 1}`} 
                      className="w-full h-32 object-cover rounded-lg"
                    />
                    <Button
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => setFormData(prev => ({
                        ...prev,
                        gallery: prev.gallery.filter((_, i) => i !== index)
                      }))}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    <div className="mt-2">
                      <Input
                        value={image.caption}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          gallery: prev.gallery.map((img, i) => 
                            i === index ? { ...img, caption: e.target.value } : img
                          )
                        }))}
                        placeholder="Image caption"
                        className="text-xs"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )

      case "users":
        return (
          <div className="space-y-6">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                <strong>Required:</strong> Owner email and password must be filled to create the brand.
                <br />
                <strong>Optional:</strong> Manager account can be added later if needed.
              </p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span>Brand Owner</span>
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Full Access</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Owner Email *</Label>
                    <Input
                      type="email"
                      value={formData.users.owner.email}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        users: { ...prev.users, owner: { ...prev.users.owner, email: e.target.value } }
                      }))}
                      placeholder="demoaccount@teststore.com"
                      className={errors.ownerEmail ? "border-red-500" : "border-green-500"}
                    />
                    {errors.ownerEmail && <p className="text-sm text-red-500">{errors.ownerEmail}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Owner Password *</Label>
                    <Input
                      type="password"
                      value={formData.users.owner.password}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        users: { ...prev.users, owner: { ...prev.users.owner, password: e.target.value } }
                      }))}
                      placeholder="••••••••••••••••••"
                      className={errors.ownerPassword ? "border-red-500" : "border-green-500"}
                    />
                    {errors.ownerPassword && <p className="text-sm text-red-500">{errors.ownerPassword}</p>}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Owner Permissions: Can create stores, view all data, manage settings, and invite other users.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span>Brand Manager</span>
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Limited Access</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Manager Email</Label>
                    <Input
                      type="email"
                      value={formData.users.manager.email}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        users: { ...prev.users, manager: { ...prev.users.manager, email: e.target.value } }
                      }))}
                      placeholder="manager@brand.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Manager Password</Label>
                    <Input
                      type="password"
                      value={formData.users.manager.password}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        users: { ...prev.users, manager: { ...prev.users.manager, password: e.target.value } }
                      }))}
                      placeholder="Minimum 8 characters"
                    />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Manager Permissions: Can view brand data and manage stores, but cannot modify brand settings or invite users.
                </p>
                <p className="text-sm text-muted-foreground">
                  Note: Manager account is optional. You can add one later from the brand settings.
                </p>
              </CardContent>
            </Card>
          </div>
        )

      case "settings":
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>SEO Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>SEO Title</Label>
                  <Input
                    value={formData.settings.seo.title}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      settings: { ...prev.settings, seo: { ...prev.settings.seo, title: e.target.value } }
                    }))}
                    placeholder="Brand Name - Primary Category"
                  />
                </div>

                <div className="space-y-2">
                  <Label>SEO Description</Label>
                  <Textarea
                    value={formData.settings.seo.description}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      settings: { ...prev.settings, seo: { ...prev.settings.seo, description: e.target.value } }
                    }))}
                    placeholder="Brief description for search engines"
                    className="min-h-[80px]"
                  />
                </div>

                <div className="space-y-2">
                  <Label>SEO Keywords</Label>
                  <Input
                    placeholder="keyword1, keyword2, keyword3"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        const target = e.target as HTMLInputElement
                        const keywords = target.value.split(',').map((k: string) => k.trim()).filter((k: string) => k)
                        setFormData(prev => ({
                          ...prev,
                          settings: { ...prev.settings, seo: { ...prev.settings.seo, keywords } }
                        }))
                        target.value = ''
                      }
                    }}
                  />
                  <div className="flex flex-wrap gap-1 mt-2">
                    {formData.settings.seo.keywords.map((keyword, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-secondary text-secondary-foreground"
                      >
                        {keyword}
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({
                            ...prev,
                            settings: {
                              ...prev.settings,
                              seo: {
                                ...prev.settings.seo,
                                keywords: prev.settings.seo.keywords.filter((_, i) => i !== index)
                              }
                            }
                          }))}
                          className="ml-1 text-secondary-foreground/70 hover:text-secondary-foreground"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Social Media Links</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Facebook</Label>
                    <Input
                      value={formData.settings.socialMedia.facebook}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        settings: { ...prev.settings, socialMedia: { ...prev.settings.socialMedia, facebook: e.target.value } }
                      }))}
                      placeholder="https://facebook.com/brand"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Twitter</Label>
                    <Input
                      value={formData.settings.socialMedia.twitter}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        settings: { ...prev.settings, socialMedia: { ...prev.settings.socialMedia, twitter: e.target.value } }
                      }))}
                      placeholder="https://twitter.com/brand"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Instagram</Label>
                    <Input
                      value={formData.settings.socialMedia.instagram}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        settings: { ...prev.settings, socialMedia: { ...prev.settings.socialMedia, instagram: e.target.value } }
                      }))}
                      placeholder="https://instagram.com/brand"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>LinkedIn</Label>
                    <Input
                      value={formData.settings.socialMedia.linkedin}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        settings: { ...prev.settings, socialMedia: { ...prev.settings.socialMedia, linkedin: e.target.value } }
                      }))}
                      placeholder="https://linkedin.com/company/brand"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>YouTube</Label>
                  <Input
                    value={formData.settings.socialMedia.youtube}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      settings: { ...prev.settings, socialMedia: { ...prev.settings.socialMedia, youtube: e.target.value } }
                    }))}
                    placeholder="https://youtube.com/brand"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        )

            default:
              return null
          }
        })()}
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!isEditMode && (
        <DialogTrigger asChild>
          <Button className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create Brand
          </Button>
        </DialogTrigger>
      )}
      <DialogContent 
        className="max-w-none w-[90vw] sm:max-w-none md:max-w-none lg:max-w-none xl:max-w-[1200px] max-h-[90vh] overflow-hidden flex flex-col"
        style={{ maxWidth: '800px', width: '80vw' }}
      >
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>{isEditMode ? 'Edit Brand' : 'Create New Brand'}</DialogTitle>
              <DialogDescription>
                Set up your brand profile with all the essential information
              </DialogDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fillTestData}
              className="flex items-center gap-2 text-xs"
            >
              <TestTube className="h-3 w-3" />
              Fill Test Data
            </Button>
          </div>
        </DialogHeader>

        {/* Horizontal Tab Navigation */}
        <div className="border-b">
          <nav className="flex space-x-8 overflow-x-auto scrollbar-hide" aria-label="Tabs">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setCurrentTab(tab.id)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                    currentTab === tab.id
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </nav>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto py-6">
          {renderTabContent()}
        </div>

        <DialogFooter className="border-t pt-4">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center space-x-2">
              {errors.submit && (
                <p className="text-sm text-red-500">{errors.submit}</p>
              )}
              {errors.upload && (
                <p className="text-sm text-red-500">{errors.upload}</p>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              
              {!isFirstTab() && (
                <Button variant="outline" onClick={goToPreviousTab}>
                  Previous
                </Button>
              )}
              
              {!isLastTab() ? (
                <Button onClick={goToNextTab}>
                  Next
                </Button>
              ) : (
                <Button onClick={handleSubmit} disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {isEditMode ? 'Updating Brand...' : 'Creating Brand...'}
                    </>
                  ) : (
                    isEditMode ? 'Update Brand' : 'Create Brand'
                  )}
                </Button>
              )}
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
