'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { 
  MapPin, 
  Phone, 
  Mail, 
  Clock, 
  Star, 
  Navigation, 
  Globe,
  ExternalLink,
  Tag,
  Building,
  Car,
  Truck,
  Facebook,
  Instagram,
  Twitter,
  Youtube,
  CheckCircle
} from 'lucide-react'

interface Brand {
  _id: string
  name: string
  slug: string
  description?: string
  logo?: {
    url?: string
  }
  branding?: {
    primaryColor?: string
    accentColor?: string
    backgroundColor?: string
  }
  website?: string
  industry?: string
  primaryCategory?: string
  additionalCategories?: string[]
  settings?: {
    socialMedia?: {
      facebook?: string
      instagram?: string
      twitter?: string
      linkedin?: string
      youtube?: string
    }
  }
}

interface Store {
  _id: string
  name: string
  slug: string
  storeCode?: string
  address: any
  phone?: string
  email?: string
  website?: string
  description?: string
  status: string
  verified?: boolean
  primaryCategory?: string
  additionalCategories?: string[]
  tags?: string[]
  gmbLocationId?: string
  hoursOfOperation?: any
  amenities?: {
    parkingAvailable?: boolean
    deliveryOption?: boolean
  }
  socialMedia?: {
    website?: string
    facebook?: string
    instagram?: string
    twitter?: string
  }
  microsite?: {
    tagline?: string
    heroImage?: {
      url: string
    }
    existingImages?: Array<{
      url: string
    }>
    gmbUrl?: string
  }
  seo?: {
    keywords?: string[]
  }
}

interface Review {
  _id: string
  reviewer: {
    displayName: string
    profilePhotoUrl?: string
  }
  starRating: number
  comment?: string
  gmbCreateTime: Date
  response?: {
    comment: string
    responseTime: Date
  }
}

interface StoreMicrositeProps {
  brand: Brand
  store: Store
  reviews: Review[]
  totalReviews: number
  averageRating: number
}

export default function StoreMicrosite({
  brand,
  store,
  reviews,
  totalReviews,
  averageRating
}: StoreMicrositeProps) {
  const formatAddress = (address: any) => {
    if (typeof address === 'string') return address
    const parts = [
      address.line1,
      address.line2,
      address.locality,
      address.city,
      address.state,
      address.postalCode
    ].filter(Boolean)
    return parts.join(', ')
  }

  const formatPhoneNumber = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '')
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
    }
    return phone
  }

  const renderStars = (rating: number) => {
    return (
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    )
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatTime = (timeString: string) => {
    if (!timeString) return timeString
    
    // If it's already in a readable format, return as is
    if (timeString.includes('AM') || timeString.includes('PM') || timeString.includes(':')) {
      return timeString
    }
    
    // Try to parse and format time
    try {
      // Handle 24-hour format (e.g., "14:30" -> "2:30 PM")
      if (timeString.includes(':') && timeString.length <= 5) {
        const [hours, minutes] = timeString.split(':')
        const hour24 = parseInt(hours, 10)
        const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24
        const ampm = hour24 >= 12 ? 'PM' : 'AM'
        return `${hour12}:${minutes} ${ampm}`
      }
      
      // Handle simple hour format (e.g., "14" -> "2:00 PM")
      const hour24 = parseInt(timeString, 10)
      if (hour24 >= 0 && hour24 <= 23) {
        const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24
        const ampm = hour24 >= 12 ? 'PM' : 'AM'
        return `${hour12}:00 ${ampm}`
      }
      
      return timeString
    } catch (error) {
      return timeString
    }
  }

  const getDefaultHoursForDay = (day: string) => {
    const dayLower = day.toLowerCase()
    
    switch (dayLower) {
      case 'sunday':
        return 'Closed'
      case 'saturday':
        return '10:00 AM - 4:00 PM'
      default:
        return '9:00 AM - 6:00 PM'
    }
  }

  const ProfilePhoto = ({ profilePhotoUrl, displayName, className = "" }: { 
    profilePhotoUrl?: string, 
    displayName: string, 
    className?: string 
  }) => {
    const [imageError, setImageError] = React.useState(false)
    const [imageLoaded, setImageLoaded] = React.useState(false)

    if (!profilePhotoUrl || imageError) {
      return (
        <div className={`w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold text-lg shadow-md flex-shrink-0 ${className}`}>
          {displayName.charAt(0).toUpperCase()}
        </div>
      )
    }

    return (
      <div className={`relative w-12 h-12 flex-shrink-0 ${className}`}>
        <Image
          src={profilePhotoUrl}
          alt={displayName}
          width={48}
          height={48}
          className="rounded-full object-cover border-2 border-gray-200"
          onError={() => setImageError(true)}
          onLoad={() => setImageLoaded(true)}
          unoptimized={true}
        />
        {!imageLoaded && !imageError && (
          <div className="absolute inset-0 w-12 h-12 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center text-white font-bold text-lg shadow-md animate-pulse">
            {displayName.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
    )
  }

  const handleDirections = () => {
    const address = formatAddress(store.address)
    const encodedAddress = encodeURIComponent(address)
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`, '_blank')
  }

  const handleCall = () => {
    if (store.phone) {
      window.location.href = `tel:${store.phone}`
    }
  }

  // Apply brand theme colors
  useEffect(() => {
    if (brand.branding) {
      document.documentElement.style.setProperty('--brand-primary', brand.branding.primaryColor || '#3b82f6')
      document.documentElement.style.setProperty('--brand-accent', brand.branding.accentColor || '#60a5fa')
      document.documentElement.style.setProperty('--brand-background', brand.branding.backgroundColor || '#1e40af')
    }
  }, [brand.branding])

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 max-w-7xl">
          <div className="flex items-center justify-between">
            <Link href={`/${brand.slug}`} className="flex items-center space-x-3 min-w-0">
              {brand.logo?.url ? (
                <Image 
                  src={brand.logo.url} 
                  alt={brand.name}
                  width={40}
                  height={40}
                  className="object-contain flex-shrink-0"
                />
              ) : (
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                  {brand.name.charAt(0)}
                </div>
              )}
              <span className="text-lg md:text-xl font-bold truncate" style={{ color: brand.branding?.primaryColor || '#000' }}>
                {brand.name}
              </span>
            </Link>
            <nav className="hidden md:flex items-center space-x-6 flex-shrink-0">
              <Link href={`/${brand.slug}`} className="text-gray-600 hover:text-gray-900 whitespace-nowrap">All Stores</Link>
              {brand.website && (
                <a href={brand.website} target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-gray-900 whitespace-nowrap">
                  Brand Website
                </a>
              )}
            </nav>
          </div>
        </div>
      </header>

      <main className="overflow-x-hidden">
        {/* Store Hero Section */}
        <section 
          className="relative py-16 md:py-20 bg-gradient-to-br from-gray-900 to-gray-800 overflow-hidden"
          style={{
            background: brand.branding?.backgroundColor 
              ? `linear-gradient(135deg, ${brand.branding.backgroundColor}dd, ${brand.branding.primaryColor}dd)`
              : undefined
          }}
        >
          {store.microsite?.heroImage && (
            <div className="absolute inset-0">
              <Image
                src={store.microsite.heroImage.url}
                alt={store.name}
                fill
                className="object-cover opacity-30"
                priority
                sizes="100vw"
              />
            </div>
          )}
          
          <div className="relative container mx-auto px-4 max-w-7xl">
            <div className="max-w-4xl mx-auto text-center text-white">
              <div className="flex items-center justify-center gap-2 mb-4">
                <MapPin className="w-5 h-5 md:w-6 md:h-6" />
                <span className="text-base md:text-lg opacity-90">Store Location</span>
              </div>
              
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 md:mb-6 leading-tight">
                {store.name}
              </h1>
              
              {store.microsite?.tagline && (
                <p className="text-lg md:text-xl lg:text-2xl mb-6 md:mb-8 opacity-90 px-4">
                  {store.microsite.tagline}
                </p>
              )}
              
              {totalReviews > 0 && (
                <div className="flex items-center justify-center gap-2 mb-6 md:mb-8 flex-wrap">
                  <div className="flex items-center gap-1">
                    {renderStars(Math.round(averageRating))}
                  </div>
                  <span className="text-base md:text-lg font-medium">
                    {averageRating.toFixed(1)} ({totalReviews} reviews)
                  </span>
                </div>
              )}
              
              <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center items-center px-4">
                <button
                  onClick={handleDirections}
                  className="flex items-center justify-center gap-2 bg-white text-gray-900 py-3 px-6 rounded-lg hover:bg-gray-100 transition-colors font-medium shadow-lg w-full sm:w-auto"
                >
                  <Navigation className="w-5 h-5" />
                  Get Directions
                </button>
                
                {store.phone && (
                  <button
                    onClick={handleCall}
                    className="flex items-center justify-center gap-2 border-2 border-white text-white py-3 px-6 rounded-lg hover:bg-white hover:text-gray-900 transition-colors font-medium w-full sm:w-auto"
                  >
                    <Phone className="w-5 h-5" />
                    Call Store
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Store Information */}
        <section className="py-16 bg-gray-50">
          <div className="container mx-auto px-4 max-w-7xl">
            <div className="max-w-6xl mx-auto">
              <div className="grid lg:grid-cols-3 gap-6 lg:gap-8">
                {/* Store Details */}
                <div className="lg:col-span-2 space-y-8">
                  {/* Basic Information */}
                  <div className="bg-white rounded-lg p-8 shadow-md">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Store Information</h2>
                    
                    {/* Address */}
                    <div className="mb-6">
                      <div className="flex items-start gap-3 mb-2">
                        <MapPin className="w-5 h-5 text-red-600 mt-1 flex-shrink-0" />
                        <div>
                          <h3 className="font-semibold text-gray-900 mb-1">Address</h3>
                          <div className="text-gray-600">
                            <p>{store.address.line1}</p>
                            {store.address.line2 && <p>{store.address.line2}</p>}
                            {store.address.locality && store.address.locality !== 'Unknown' && <p>{store.address.locality}</p>}
                            {store.address.city && store.address.city !== 'Unknown' && (
                              <p>{store.address.city}{store.address.state && store.address.state !== 'Unknown' ? `, ${store.address.state}` : ''} - {store.address.postalCode}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Contact Information */}
                    <div className="grid md:grid-cols-2 gap-6 mb-6">
                      {/* Phone */}
                      {store.phone && (
                        <div className="flex items-center gap-3">
                          <Phone className="w-5 h-5 text-red-600" />
                          <div>
                            <h3 className="font-semibold text-gray-900 mb-1">Phone</h3>
                            <a 
                              href={`tel:${store.phone}`}
                              className="text-blue-600 hover:text-blue-800 transition-colors"
                            >
                              {formatPhoneNumber(store.phone)}
                            </a>
                          </div>
                        </div>
                      )}

                      {/* Email */}
                      {store.email && (
                        <div className="flex items-center gap-3">
                          <Mail className="w-5 h-5 text-red-600" />
                          <div>
                            <h3 className="font-semibold text-gray-900 mb-1">Email</h3>
                            <a 
                              href={`mailto:${store.email}`}
                              className="text-blue-600 hover:text-blue-800 transition-colors"
                            >
                              {store.email}
                            </a>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Store Code & Category */}
                    <div className="grid md:grid-cols-2 gap-6 mb-6">
                      {store.storeCode && (
                        <div className="flex items-center gap-3">
                          <Building className="w-5 h-5 text-red-600" />
                          <div>
                            <h3 className="font-semibold text-gray-900 mb-1">Store Code</h3>
                            <p className="text-gray-600">{store.storeCode}</p>
                          </div>
                        </div>
                      )}

                      {store.primaryCategory && (
                        <div className="flex items-center gap-3">
                          <Tag className="w-5 h-5 text-red-600" />
                          <div>
                            <h3 className="font-semibold text-gray-900 mb-1">Primary Category</h3>
                            <p className="text-gray-600 capitalize">{store.primaryCategory}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Store Status & Verification */}
                    <div className="grid md:grid-cols-2 gap-6 mb-6">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${store.status === 'active' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        <div>
                          <h3 className="font-semibold text-gray-900 mb-1">Status</h3>
                          <p className="text-gray-600 capitalize">{store.status}</p>
                        </div>
                      </div>

                      {store.verified !== undefined && (
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${store.verified ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                          <div>
                            <h3 className="font-semibold text-gray-900 mb-1">Verification</h3>
                            <p className="text-gray-600">{store.verified ? 'Verified' : 'Pending Verification'}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* GMB Integration */}
                    {/* {store.gmbLocationId && (
                      <div className="mb-6">
                        <div className="flex items-center gap-3">
                          <Globe className="w-5 h-5 text-red-600" />
                          <div>
                            <h3 className="font-semibold text-gray-900 mb-1">Google My Business</h3>
                            <p className="text-gray-600 text-sm">Connected: {store.gmbLocationId}</p>
                          </div>
                        </div>
                      </div>
                    )} */}

                    {/* SEO Keywords */}
                    {store.seo?.keywords && store.seo.keywords.length > 0 && (
                      <div className="mb-6">
                        <h3 className="font-semibold text-gray-900 mb-3">SEO Keywords</h3>
                        <div className="flex flex-wrap gap-2">
                          {store.seo.keywords.map((keyword, index) => (
                            <span 
                              key={index}
                              className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm"
                            >
                              {keyword}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Tags */}
                    {store.tags && store.tags.length > 0 && (
                      <div className="mb-6">
                        <h3 className="font-semibold text-gray-900 mb-3">Tags</h3>
                        <div className="flex flex-wrap gap-2">
                          {store.tags.map((tag, index) => (
                            <span 
                              key={index}
                              className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Additional Categories */}
                    {store.additionalCategories && store.additionalCategories.length > 0 && (
                      <div className="mb-6">
                        <h3 className="font-semibold text-gray-900 mb-3">Additional Services</h3>
                        <div className="flex flex-wrap gap-2">
                          {store.additionalCategories.map((category, index) => (
                            <span 
                              key={index}
                              className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm capitalize"
                            >
                              {category}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Amenities */}
                    {(store.amenities?.parkingAvailable || store.amenities?.deliveryOption) && (
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-3">Store Features</h3>
                        <div className="flex flex-wrap gap-2">
                          {store.amenities.parkingAvailable && (
                            <div className="flex items-center gap-2 bg-green-100 text-green-800 px-3 py-2 rounded-lg">
                              <Car className="w-4 h-4" />
                              <span className="text-sm font-medium">Free Parking</span>
                            </div>
                          )}
                          {store.amenities.deliveryOption && (
                            <div className="flex items-center gap-2 bg-blue-100 text-blue-800 px-3 py-2 rounded-lg">
                              <Truck className="w-4 h-4" />
                              <span className="text-sm font-medium">Delivery Available</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Social Media */}
                    {(store.socialMedia?.facebook || store.socialMedia?.instagram || store.socialMedia?.twitter || store.socialMedia?.website) && (
                      <div className="mt-6 pt-6 border-t border-gray-200">
                        <h3 className="font-semibold text-gray-900 mb-3">Connect With Us</h3>
                        <div className="flex flex-wrap gap-3">
                          {store.socialMedia?.website && (
                            <a
                              href={store.socialMedia.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition-colors"
                            >
                              <Globe className="w-4 h-4" />
                              Website
                            </a>
                          )}
                          {store.socialMedia?.facebook && (
                            <a
                              href={store.socialMedia.facebook}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 bg-blue-100 hover:bg-blue-200 text-blue-700 px-4 py-2 rounded-lg transition-colors"
                            >
                              <Facebook className="w-4 h-4" />
                              Facebook
                            </a>
                          )}
                          {store.socialMedia?.instagram && (
                            <a
                              href={store.socialMedia.instagram}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 bg-pink-100 hover:bg-pink-200 text-pink-700 px-4 py-2 rounded-lg transition-colors"
                            >
                              <Instagram className="w-4 h-4" />
                              Instagram
                            </a>
                          )}
                          {store.socialMedia?.twitter && (
                            <a
                              href={store.socialMedia.twitter}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 bg-sky-100 hover:bg-sky-200 text-sky-700 px-4 py-2 rounded-lg transition-colors"
                            >
                              <Twitter className="w-4 h-4" />
                              Twitter
                            </a>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Brand Information */}
                  <div className="bg-white rounded-lg p-8 shadow-md">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">About {brand.name}</h2>
                    
                    {brand.description && (
                      <div className="mb-4">
                        <p className="text-gray-700 leading-relaxed">{brand.description}</p>
                      </div>
                    )}

                    {brand.industry && (
                      <div className="mb-4">
                        <h3 className="font-semibold text-gray-900 mb-2">Industry</h3>
                        <p className="text-gray-600">{brand.industry}</p>
                      </div>
                    )}

                    {brand.primaryCategory && (
                      <div className="mb-4">
                        <h3 className="font-semibold text-gray-900 mb-2">Primary Category</h3>
                        <p className="text-gray-600 capitalize">{brand.primaryCategory}</p>
                      </div>
                    )}

                    {brand.additionalCategories && brand.additionalCategories.length > 0 && (
                      <div className="mb-4">
                        <h3 className="font-semibold text-gray-900 mb-3">Additional Categories</h3>
                        <div className="flex flex-wrap gap-2">
                          {brand.additionalCategories.map((category, index) => (
                            <span 
                              key={index}
                              className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm capitalize"
                            >
                              {category}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {brand.website && (
                      <div className="mb-4">
                        <a
                          href={brand.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 transition-colors font-medium"
                        >
                          <Globe className="w-4 h-4" />
                          Visit Brand Website
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}

                    {/* Brand Social Media */}
                    {brand.settings?.socialMedia && (
                      <div className="mt-6 pt-6 border-t border-gray-200">
                        <h3 className="font-semibold text-gray-900 mb-3">Follow {brand.name}</h3>
                        <div className="flex flex-wrap gap-3">
                          {brand.settings.socialMedia.facebook && (
                            <a
                              href={brand.settings.socialMedia.facebook}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 bg-blue-100 hover:bg-blue-200 text-blue-700 px-4 py-2 rounded-lg transition-colors"
                            >
                              <Facebook className="w-4 h-4" />
                              Facebook
                            </a>
                          )}
                          {brand.settings.socialMedia.instagram && (
                            <a
                              href={brand.settings.socialMedia.instagram}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 bg-pink-100 hover:bg-pink-200 text-pink-700 px-4 py-2 rounded-lg transition-colors"
                            >
                              <Instagram className="w-4 h-4" />
                              Instagram
                            </a>
                          )}
                          {brand.settings.socialMedia.twitter && (
                            <a
                              href={brand.settings.socialMedia.twitter}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 bg-sky-100 hover:bg-sky-200 text-sky-700 px-4 py-2 rounded-lg transition-colors"
                            >
                              <Twitter className="w-4 h-4" />
                              Twitter
                            </a>
                          )}
                          {brand.settings.socialMedia.linkedin && (
                            <a
                              href={brand.settings.socialMedia.linkedin}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 bg-blue-100 hover:bg-blue-200 text-blue-700 px-4 py-2 rounded-lg transition-colors"
                            >
                              <Globe className="w-4 h-4" />
                              LinkedIn
                            </a>
                          )}
                          {brand.settings.socialMedia.youtube && (
                            <a
                              href={brand.settings.socialMedia.youtube}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 bg-red-100 hover:bg-red-200 text-red-700 px-4 py-2 rounded-lg transition-colors"
                            >
                              <Youtube className="w-4 h-4" />
                              YouTube
                            </a>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Store Microsite Details */}
                  {store.microsite && (
                    <div className="bg-white rounded-lg p-8 shadow-md">
                      <h2 className="text-2xl font-bold text-gray-900 mb-6">About This Store</h2>
                      
                      {store.microsite.tagline && (
                        <div className="mb-4">
                          <p className="text-lg text-gray-700 italic">&ldquo;{store.microsite.tagline}&rdquo;</p>
                        </div>
                      )}

                      {store.microsite.gmbUrl && (
                        <div className="mb-4">
                          <a
                            href={store.microsite.gmbUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 transition-colors"
                          >
                            <ExternalLink className="w-4 h-4" />
                            View on Google My Business
                          </a>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Customer Reviews */}
                  {reviews.length > 0 && (
                    <div className="bg-white rounded-lg p-8 shadow-md">
                      <h2 className="text-2xl font-bold text-gray-900 mb-6">Top Customer Reviews</h2>
                      
                      {/* Rating Summary */}
                      <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg p-6 mb-8">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-5xl font-bold text-gray-900 mb-2">
                              {averageRating.toFixed(1)}
                            </div>
                            <div className="flex items-center gap-2 mb-2">
                              {renderStars(Math.round(averageRating))}
                            </div>
                            <p className="text-sm text-gray-600">
                              Based on {totalReviews} {totalReviews === 1 ? 'review' : 'reviews'}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Individual Reviews - Top 5 Best Reviews */}
                      <div className="space-y-6">
                        {reviews
                          .sort((a, b) => b.starRating - a.starRating) // Sort by highest rating first
                          .slice(0, 5) // Take only top 5
                          .map((review) => (
                          <div key={review._id.toString()} className="border-b border-gray-200 last:border-0 pb-6 last:pb-0">
                            <div className="flex items-start space-x-4">
                              <ProfilePhoto 
                                profilePhotoUrl={review.reviewer.profilePhotoUrl}
                                displayName={review.reviewer.displayName}
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                                  <div className="min-w-0">
                                    <p className="font-semibold text-gray-900 truncate">{review.reviewer.displayName}</p>
                                    <p className="text-sm text-gray-500">{formatDate(review.gmbCreateTime)}</p>
                                  </div>
                                  <div className="flex items-center gap-1 flex-shrink-0">
                                    {renderStars(review.starRating)}
                                  </div>
                                </div>
                                {review.comment && (
                                  <p className="text-gray-700 leading-relaxed mb-3 break-words">{review.comment}</p>
                                )}
                                {review.response && (
                                  <div className="bg-blue-50 border-l-4 border-blue-600 p-4 mt-3 rounded-r-lg">
                                    <div className="flex items-start gap-2 mb-2">
                                      <CheckCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                                      <p className="font-semibold text-sm text-blue-900">Response from {brand.name}</p>
                                    </div>
                                    <p className="text-sm text-gray-700 mb-2 leading-relaxed break-words">{review.response.comment}</p>
                                    <p className="text-xs text-gray-500">
                                      Replied on {formatDate(review.response.responseTime)}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {totalReviews > 5 && (
                        <div className="mt-8 pt-6 border-t border-gray-200 text-center">

                          <p className="text-sm text-gray-500 mt-2">
                            These are the highest-rated reviews from our customers
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Business Hours & Quick Actions */}
                <div className="space-y-8">
                  {/* Business Hours */}
                  {store.hoursOfOperation && Object.keys(store.hoursOfOperation).length > 0 && (
                    <div className="bg-white rounded-lg p-8 shadow-md">
                      <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                        <Clock className="w-6 h-6" style={{ color: brand.branding?.primaryColor || '#dc2626' }} />
                        Business Hours
                      </h2>
                      
                      <div className="space-y-3">
                        {Object.entries(store.hoursOfOperation).map(([day, hours]: [string, any]) => {
                          // Handle different possible data structures for hours
                          let displayHours = 'Hours not specified'
                          let isClosed = false
                          
                          if (hours) {
                            // Check if it's closed
                            if (hours.isOpen === false || hours.closed === true) {
                              isClosed = true
                              displayHours = 'Closed'
                            } else if (hours.isOpen === true) {
                              // Store is explicitly marked as open
                              if (hours.openTime && hours.closeTime) {
                                displayHours = `${formatTime(hours.openTime)} - ${formatTime(hours.closeTime)}`
                              } else if (hours.open && hours.close) {
                                displayHours = `${formatTime(hours.open)} - ${formatTime(hours.close)}`
                              } else if (hours.startTime && hours.endTime) {
                                displayHours = `${formatTime(hours.startTime)} - ${formatTime(hours.endTime)}`
                              } else if (hours.time) {
                                displayHours = formatTime(hours.time)
                              } else if (typeof hours === 'string') {
                                displayHours = formatTime(hours)
                              } else {
                                // Store is open but no specific times provided - show default hours
                                displayHours = getDefaultHoursForDay(day)
                              }
                            } else if (hours.closed === false) {
                              // Check for different time formats
                              if (hours.openTime && hours.closeTime) {
                                displayHours = `${formatTime(hours.openTime)} - ${formatTime(hours.closeTime)}`
                              } else if (hours.open && hours.close) {
                                displayHours = `${formatTime(hours.open)} - ${formatTime(hours.close)}`
                              } else if (hours.startTime && hours.endTime) {
                                displayHours = `${formatTime(hours.startTime)} - ${formatTime(hours.endTime)}`
                              } else if (hours.time) {
                                displayHours = formatTime(hours.time)
                              } else if (typeof hours === 'string') {
                                displayHours = formatTime(hours)
                              } else {
                                // If store is marked as open but no specific times provided, show default hours
                                if (hours.isOpen === true) {
                                  // Default business hours based on day
                                  const defaultHours = getDefaultHoursForDay(day)
                                  displayHours = defaultHours
                                } else {
                                  displayHours = 'Hours not specified'
                                }
                              }
                            }
                          }
                          
                          return (
                            <div key={day} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                              <span className="font-medium text-gray-900 capitalize">
                                {day}
                              </span>
                              <span className={`${isClosed ? 'text-red-500 font-medium' : 'text-gray-600'}`}>
                                {displayHours}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                  
                  {/* Fallback Business Hours - Show if no hours data or all hours are "not specified" */}
                  {(!store.hoursOfOperation || Object.keys(store.hoursOfOperation).length === 0 || 
                    Object.values(store.hoursOfOperation).every((hours: any) => 
                      !hours || (!hours.openTime && !hours.closeTime && !hours.open && !hours.close && !hours.time)
                    )) && (
                    <div className="bg-white rounded-lg p-8 shadow-md">
                      <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                        <Clock className="w-6 h-6" style={{ color: brand.branding?.primaryColor || '#dc2626' }} />
                        Business Hours
                      </h2>
                      
                      <div className="space-y-3">
                        {[
                          { day: 'Monday', hours: '9:00 AM - 6:00 PM' },
                          { day: 'Tuesday', hours: '9:00 AM - 6:00 PM' },
                          { day: 'Wednesday', hours: '9:00 AM - 6:00 PM' },
                          { day: 'Thursday', hours: '9:00 AM - 6:00 PM' },
                          { day: 'Friday', hours: '9:00 AM - 6:00 PM' },
                          { day: 'Saturday', hours: '10:00 AM - 4:00 PM' },
                          { day: 'Sunday', hours: 'Closed' }
                        ].map(({ day, hours }) => (
                          <div key={day} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                            <span className="font-medium text-gray-900 capitalize">
                              {day}
                            </span>
                            <span className={`${hours === 'Closed' ? 'text-red-500 font-medium' : 'text-gray-600'}`}>
                              {hours}
                            </span>
                          </div>
                        ))}
                      </div>
                      
                      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm text-blue-800">
                          <strong>Note:</strong> These are general business hours. Please contact the store for specific hours and availability.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Quick Actions */}
                  <div className="bg-white rounded-lg p-8 shadow-md">
                    <h3 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h3>
                    <div className="space-y-3">
                      <button
                        onClick={handleDirections}
                        className="w-full flex items-center justify-center gap-3 text-white py-3 px-4 rounded-lg hover:opacity-90 transition-all font-medium shadow-lg"
                        style={{ backgroundColor: brand.branding?.primaryColor || '#dc2626' }}
                      >
                        <Navigation className="w-5 h-5" />
                        Get Directions
                      </button>
                      
                      {store.phone && (
                        <button
                          onClick={handleCall}
                          className="w-full flex items-center justify-center gap-3 border-2 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                          style={{ borderColor: brand.branding?.primaryColor || '#dc2626' }}
                        >
                          <Phone className="w-5 h-5" />
                          Call Store
                        </button>
                      )}

                      {store.email && (
                        <a
                          href={`mailto:${store.email}`}
                          className="w-full flex items-center justify-center gap-3 border border-gray-300 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                        >
                          <Mail className="w-5 h-5" />
                          Email Store
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Location Map */}
                  <div className="bg-white rounded-lg p-6 shadow-md">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Location Map</h3>
                    <div className="aspect-square bg-gray-200 rounded-lg overflow-hidden">
                      <iframe
                        width="100%"
                        height="100%"
                        frameBorder="0"
                        style={{ border: 0 }}
                        src={`https://www.google.com/maps?q=${encodeURIComponent(formatAddress(store.address))}&output=embed`}
                        allowFullScreen
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Store Gallery */}
        {store.microsite?.existingImages && store.microsite.existingImages.length > 0 && (
          <section className="py-16 bg-white">
            <div className="container mx-auto px-4 max-w-7xl">
              <div className="max-w-6xl mx-auto">
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900 text-center mb-8 md:mb-12">Store Gallery</h2>
                
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
                  {store.microsite.existingImages.map((image, index) => (
                    <div key={index} className="aspect-square relative rounded-lg overflow-hidden shadow-md">
                      <Image
                        src={image.url}
                        alt={`${store.name} - Image ${index + 1}`}
                        fill
                        className="object-cover hover:scale-110 transition-transform duration-300"
                        sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Back to Brand */}
        <section className="py-12 bg-gray-50">
          <div className="container mx-auto px-4 text-center max-w-7xl">
            <Link
              href={`/${brand.slug}`}
              className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 transition-colors font-medium text-base md:text-lg"
            >
              ← Back to {brand.name} Stores
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-6 md:gap-8">
            <div>
              <h4 className="font-bold text-lg mb-4">{brand.name}</h4>
              {brand.description && (
                <p className="text-gray-400 text-sm leading-relaxed">{brand.description}</p>
              )}
            </div>
            
            <div>
              <h4 className="font-bold text-lg mb-4">Contact</h4>
              <div className="space-y-2 text-sm text-gray-400">
                {store.phone && (
                  <div className="flex items-center space-x-2">
                    <Phone className="h-4 w-4" />
                    <a href={`tel:${store.phone}`} className="hover:text-white">
                      {formatPhoneNumber(store.phone)}
                    </a>
                  </div>
                )}
                {store.email && (
                  <div className="flex items-center space-x-2">
                    <Mail className="h-4 w-4" />
                    <a href={`mailto:${store.email}`} className="hover:text-white">
                      {store.email}
                    </a>
                  </div>
                )}
                {brand.website && (
                  <div className="flex items-center space-x-2">
                    <Globe className="h-4 w-4" />
                    <a href={brand.website} target="_blank" rel="noopener noreferrer" className="hover:text-white">
                      Visit Website
                    </a>
                  </div>
                )}
              </div>
            </div>
            
            <div>
              <h4 className="font-bold text-lg mb-4">Quick Links</h4>
              <div className="space-y-2 text-sm text-gray-400">
                <Link href={`/${brand.slug}`} className="block hover:text-white">All Stores</Link>
                <Link href="/dashboard" className="block hover:text-white">Dashboard</Link>
              </div>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-400">
            <p>© {new Date().getFullYear()} {brand.name}. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
