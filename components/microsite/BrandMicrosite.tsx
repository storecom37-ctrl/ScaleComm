'use client'

import { useState } from 'react'
import Link from 'next/link'
import { MapPin, Phone, Mail, Globe, Clock, Star } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

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
  }
  contact?: {
    phone?: string
    email?: string
    website?: string
  }
}

interface Store {
  _id: string
  name: string
  slug: string
  address: any
  phone?: string
  email?: string
  hours?: any
  status: string
}

interface BrandMicrositeProps {
  brand: Brand
  initialStoresData: {
    stores: Store[]
    pagination: {
      page: number
      limit: number
      total: number
      pages: number
    }
  }
  searchParams: {
    page?: string
    search?: string
    city?: string
    state?: string
  }
}

export default function BrandMicrosite({ 
  brand, 
  initialStoresData, 
  searchParams 
}: BrandMicrositeProps) {
  const [searchQuery, setSearchQuery] = useState(searchParams.search || '')
  const { stores, pagination } = initialStoresData

  const formatAddress = (address: any) => {
    if (typeof address === 'string') return address
    return `${address.line1}, ${address.city}, ${address.state} ${address.postalCode}`
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-3">
              {brand.logo?.url && (
                <img 
                  src={brand.logo.url} 
                  alt={brand.name}
                  className="h-10 w-auto"
                />
              )}
              <h1 className="text-2xl font-bold" style={{ color: brand.branding?.primaryColor || '#000' }}>
                {brand.name}
              </h1>
            </Link>
            <nav className="hidden md:flex items-center space-x-6">
              <Link href={`/${brand.slug}`} className="hover:text-blue-600">Stores</Link>
              <Link href={`/${brand.slug}#about`} className="hover:text-blue-600">About</Link>
              <Link href={`/${brand.slug}#contact`} className="hover:text-blue-600">Contact</Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Find {brand.name} Near You
            </h2>
            {brand.description && (
              <p className="text-xl text-blue-100 mb-8">
                {brand.description}
              </p>
            )}
            <div className="flex items-center gap-2 max-w-xl mx-auto">
              <Input
                type="text"
                placeholder="Search by location, city, or store name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1"
              />
              <Button 
                size="lg"
                onClick={() => {
                  window.location.href = `/${brand.slug}?search=${searchQuery}`
                }}
              >
                Search
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stores List */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="mb-8">
            <h3 className="text-2xl font-bold mb-2">
              {pagination.total} {pagination.total === 1 ? 'Store' : 'Stores'} Found
            </h3>
            <p className="text-gray-600">
              Showing {stores.length} of {pagination.total} stores
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {stores.map((store) => (
              <Card key={store._id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-2">{store.name}</CardTitle>
                      <Badge variant={store.status === 'active' ? 'default' : 'secondary'}>
                        {store.status}
                      </Badge>
                    </div>
                    <MapPin className="h-5 w-5 text-blue-600" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-start space-x-2 text-sm text-gray-600">
                    <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span>{formatAddress(store.address)}</span>
                  </div>
                  
                  {store.phone && (
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Phone className="h-4 w-4" />
                      <a href={`tel:${store.phone}`} className="hover:text-blue-600">
                        {store.phone}
                      </a>
                    </div>
                  )}
                  
                  {store.email && (
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Mail className="h-4 w-4" />
                      <a href={`mailto:${store.email}`} className="hover:text-blue-600">
                        {store.email}
                      </a>
                    </div>
                  )}
                  
                  <div className="pt-3 flex gap-2">
                    <Button asChild variant="default" size="sm" className="flex-1">
                      <Link href={`/${brand.slug}/stores/${store.slug}`}>
                        View Details
                      </Link>
                    </Button>
                    <Button asChild variant="outline" size="sm">
                      <a 
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(formatAddress(store.address))}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <MapPin className="h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="mt-12 flex justify-center gap-2">
              {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((page) => (
                <Button
                  key={page}
                  variant={page === pagination.page ? 'default' : 'outline'}
                  size="sm"
                  asChild
                >
                  <Link href={`/${brand.slug}?page=${page}${searchQuery ? `&search=${searchQuery}` : ''}`}>
                    {page}
                  </Link>
                </Button>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <h4 className="font-bold text-lg mb-4">{brand.name}</h4>
              {brand.description && (
                <p className="text-gray-400 text-sm">{brand.description}</p>
              )}
            </div>
            
            {brand.contact && (
              <div>
                <h4 className="font-bold text-lg mb-4">Contact Us</h4>
                <div className="space-y-2 text-sm text-gray-400">
                  {brand.contact.phone && (
                    <div className="flex items-center space-x-2">
                      <Phone className="h-4 w-4" />
                      <a href={`tel:${brand.contact.phone}`} className="hover:text-white">
                        {brand.contact.phone}
                      </a>
                    </div>
                  )}
                  {brand.contact.email && (
                    <div className="flex items-center space-x-2">
                      <Mail className="h-4 w-4" />
                      <a href={`mailto:${brand.contact.email}`} className="hover:text-white">
                        {brand.contact.email}
                      </a>
                    </div>
                  )}
                  {brand.contact.website && (
                    <div className="flex items-center space-x-2">
                      <Globe className="h-4 w-4" />
                      <a href={brand.contact.website} target="_blank" rel="noopener noreferrer" className="hover:text-white">
                        Visit Website
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            <div>
              <h4 className="font-bold text-lg mb-4">Quick Links</h4>
              <div className="space-y-2 text-sm text-gray-400">
                <Link href={`/${brand.slug}`} className="block hover:text-white">All Stores</Link>
                <Link href="/" className="block hover:text-white">Home</Link>
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

