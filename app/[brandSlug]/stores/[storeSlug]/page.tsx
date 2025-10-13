import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Brand, Store } from '@/lib/database/models'
import { Review } from '@/lib/database/separate-models'
import connectDB from '@/lib/database/connection'
import StoreMicrosite from '@/components/microsite/StoreMicrosite'

interface PageProps {
  params: Promise<{
    brandSlug: string
    storeSlug: string
  }>
}

async function getBrand(slug: string) {
  await connectDB()
  const brand = await Brand.findOne({ slug, status: 'active' }).lean()
  if (!brand) return null
  return JSON.parse(JSON.stringify(brand))
}

async function getStore(slug: string, brandId: string) {
  await connectDB()
  const store = await Store.findOne({ slug, brandId, status: 'active' }).lean()
  if (!store) return null
  return JSON.parse(JSON.stringify(store))
}

async function getStoreReviews(storeId: string, limit: number = 10) {
  await connectDB()
  
  const reviews = await Review.find({
    storeId,
    status: 'active'
  })
    .sort({ gmbCreateTime: -1 })
    .limit(limit)
    .lean()
  
  const total = await Review.countDocuments({ storeId, status: 'active' })
  
  // Calculate average rating
  const allReviews = await Review.find({ storeId, status: 'active' }).select('starRating').lean()
  const averageRating = allReviews.length > 0
    ? allReviews.reduce((sum, review) => sum + review.starRating, 0) / allReviews.length
    : 0

  return {
    reviews: JSON.parse(JSON.stringify(reviews)),
    total,
    averageRating: Math.round(averageRating * 10) / 10
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  try {
    const { brandSlug, storeSlug } = await params
    const brand = await getBrand(brandSlug)
    
    if (!brand) {
      return {
        title: 'Store Not Found',
        description: 'The requested store could not be found.'
      }
    }
    
    const store = await getStore(storeSlug, brand._id.toString())
    
    if (!store) {
      return {
        title: 'Store Not Found',
        description: 'The requested store could not be found.'
      }
    }
    
    const storeName = store.name
    const address = typeof store.address === 'string' 
      ? store.address 
      : `${store.address.line1}, ${store.address.city}, ${store.address.state} ${store.address.postalCode}`
    
    return {
      title: `${storeName} - ${brand.name} Store`,
      description: `Visit ${storeName} located at ${address}. Get directions, hours, contact info, and read customer reviews.`,
      keywords: `${brand.name}, ${storeName}, ${store.address.city}, ${store.address.state}, store hours, directions`,
      openGraph: {
        title: `${storeName} - ${brand.name}`,
        description: `Located at ${address}`,
        images: brand.logo?.url ? [brand.logo.url] : undefined,
        type: 'website'
      }
    }
  } catch {
    return {
      title: 'Store Not Found',
      description: 'The requested store could not be found.'
    }
  }
}

export default async function StorePage({ params }: PageProps) {
  try {
    const { brandSlug, storeSlug } = await params
    
    // Fetch brand and store data
    const brand = await getBrand(brandSlug)
    
    if (!brand) {
      notFound()
    }
    
    const store = await getStore(storeSlug, brand._id.toString())
    
    if (!store) {
      notFound()
    }
    
    // Fetch reviews
    const reviewsData = await getStoreReviews(store._id.toString())

    return (
      <StoreMicrosite 
        brand={brand}
        store={store}
        reviews={reviewsData.reviews}
        totalReviews={reviewsData.total}
        averageRating={reviewsData.averageRating}
      />
    )
  } catch (error) {
    console.error('Error loading store page:', error)
    notFound()
  }
}

