import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/database/connection'
import { Store } from '@/lib/database/models'

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase()
    
    console.log('🔄 Testing GMB data extraction with updated sync logic...')
    
    // Sample GMB data structure (exactly like what you provided)
    const sampleGmbLocation = {
      name: "locations/11868126653451551664",
      storeCode: "colive 484 atlanta",
      title: "Colive Atlanta",
      phoneNumbers: {
        primaryPhone: "076760 00500"
      },
      categories: {
        primaryCategory: {
          name: "categories/gcid:serviced_accommodation",
          displayName: "Serviced accommodation",
          moreHoursTypes: [
            {
              hoursTypeId: "ACCESS",
              displayName: "Access",
              localizedDisplayName: "Access"
            },
            {
              hoursTypeId: "BREAKFAST",
              displayName: "Breakfast",
              localizedDisplayName: "Breakfast"
            }
          ]
        }
      },
      storefrontAddress: {
        regionCode: "IN",
        languageCode: "en",
        postalCode: "560037",
        administrativeArea: "Karnataka",
        locality: "Bengaluru",
        addressLines: [
          "Bldg No 106",
          "22, 4th Main Road",
          "beside GJR International School",
          "Maruthi Nagar, Lakshminarayana Pura, Chennappa Layout, Marathahalli"
        ]
      },
      websiteUri: "https://pg.colive.com/marathahalli-bengaluru/4846869232615424",
      latlng: {
        latitude: 12.9620655,
        longitude: 77.705744
      }
    }
    
    // Test the data extraction logic (same as in sync services)
    const extractedData = {
      name: sampleGmbLocation.title || sampleGmbLocation.name,
      phone: sampleGmbLocation.phoneNumbers?.primaryPhone,
      primaryCategory: sampleGmbLocation.categories?.primaryCategory?.displayName,
      address: {
        line1: sampleGmbLocation.storefrontAddress?.addressLines?.[0] || '',
        line2: sampleGmbLocation.storefrontAddress?.addressLines?.slice(1).join(', ') || '',
        locality: sampleGmbLocation.storefrontAddress?.locality || '',
        city: sampleGmbLocation.storefrontAddress?.locality || '',
        state: sampleGmbLocation.storefrontAddress?.administrativeArea || '',
        postalCode: sampleGmbLocation.storefrontAddress?.postalCode || '',
        countryCode: sampleGmbLocation.storefrontAddress?.regionCode || 'IN',
        latitude: sampleGmbLocation.latlng?.latitude,
        longitude: sampleGmbLocation.latlng?.longitude
      },
      websiteUri: sampleGmbLocation.websiteUri
    }
    
    console.log('📊 Extracted data:', JSON.stringify(extractedData, null, 2))
    
    // Update one existing store with this test data
    const existingStore = await Store.findOne()
    
    if (existingStore) {
      await Store.findByIdAndUpdate(existingStore._id, {
        $set: {
          name: extractedData.name,
          phone: extractedData.phone,
          primaryCategory: extractedData.primaryCategory,
          address: extractedData.address,
          'microsite.gmbUrl': extractedData.websiteUri
        }
      })
      
      console.log(`✅ Updated store: ${existingStore.name} with test GMB data`)
      
      // Verify the update
      const updatedStore = await Store.findById(existingStore._id)
      
      return NextResponse.json({
        success: true,
        message: 'GMB data extraction test completed successfully',
        extractedData,
        updatedStore: {
          id: updatedStore?._id,
          name: updatedStore?.name,
          phone: updatedStore?.phone,
          primaryCategory: updatedStore?.primaryCategory,
          address: updatedStore?.address,
          websiteUrl: updatedStore?.microsite?.gmbUrl
        }
      })
    } else {
      return NextResponse.json({
        success: false,
        error: 'No stores found to test with'
      })
    }
    
  } catch (error) {
    console.error('❌ GMB data extraction test failed:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}





