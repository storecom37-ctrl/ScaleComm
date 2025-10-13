import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Brand, Store } from '@/lib/database/models'
import connectDB from '@/lib/database/connection'
import BrandMicrosite from '@/components/microsite/BrandMicrosite'

interface PageProps {
  params: Promise<{
    brandSlug: string
  }>
  searchParams: Promise<{
    page?: string
    search?: string
    city?: string
    state?: string
  }>
}

async function getBrand(slug: string) {
  await connectDB()
  const brand = await Brand.findOne({ slug, status: 'active' }).lean()
  if (!brand) return null
  return JSON.parse(JSON.stringify(brand))
}

async function getBrandStores(brandId: string, options: {
  page?: number
  search?: string
  city?: string
  state?: string
  limit?: number
}) {
  await connectDB()
  
  const page = options.page || 1
  const limit = options.limit || 12
  const skip = (page - 1) * limit

  const query: any = { brandId, status: 'active' }
  
  if (options.search) {
    query.$or = [
      { name: { $regex: options.search, $options: 'i' } },
      { 'address.line1': { $regex: options.search, $options: 'i' } }
    ]
  }
  
  if (options.city) {
    query['address.city'] = { $regex: options.city, $options: 'i' }
  }
  
  if (options.state) {
    query['address.state'] = { $regex: options.state, $options: 'i' }
  }

  const stores = await Store.find(query)
    .sort({ name: 1 })
    .limit(limit)
    .skip(skip)
    .lean()
  
  const total = await Store.countDocuments(query)

  return {
    stores: JSON.parse(JSON.stringify(stores)),
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  try {
    const { brandSlug } = await params
    const brand = await getBrand(brandSlug)
    
    if (!brand) {
      return {
        title: 'Brand Not Found',
        description: 'The requested brand could not be found.'
      }
    }
    
    return {
      title: brand.settings?.seo?.title || `${brand.name} - Find Stores Near You`,
      description: brand.settings?.seo?.description || brand.description || `Find ${brand.name} stores near you. Get directions, hours, and contact information.`,
      keywords: brand.settings?.seo?.keywords?.join(', ') || `${brand.name}, stores, locations`,
      openGraph: {
        title: `${brand.name} - Store Locations`,
        description: brand.description || `Find ${brand.name} stores near you`,
        images: brand.logo?.url ? [brand.logo.url] : undefined,
        type: 'website'
      }
    }
  } catch {
    return {
      title: 'Brand Not Found',
      description: 'The requested brand could not be found.'
    }
  }
}

export default async function BrandPage({ params, searchParams }: PageProps) {
  try {
    const { brandSlug } = await params
    const resolvedSearchParams = await searchParams
    
    // Fetch brand data
    const brand = await getBrand(brandSlug)
    
    if (!brand) {
      notFound()
    }
    
    // Fetch stores with search/filter parameters
    const page = parseInt(resolvedSearchParams.page || '1')
    const storesData = await getBrandStores(brand._id.toString(), {
      page,
      search: resolvedSearchParams.search,
      city: resolvedSearchParams.city,
      state: resolvedSearchParams.state,
      limit: 12
    })

    return (
      <BrandMicrosite 
        brand={brand}
        initialStoresData={storesData}
        searchParams={resolvedSearchParams}
      />
    )
  } catch (error) {
    console.error('Error loading brand page:', error)
    notFound()
  }
}

