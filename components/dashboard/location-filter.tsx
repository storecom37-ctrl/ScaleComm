"use client"

import { useGmbStore } from "@/lib/stores/gmb-store"
import { useStores } from "@/lib/hooks/use-stores"
import { useGmbData } from "@/lib/hooks/use-gmb-data"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Filter, Store, MapPin, Building2 } from "lucide-react"

export function LocationFilter() {
  // Get filter state from global store
  const { 
    selectedStores, 
    setSelectedStores
  } = useGmbStore()
  
  // Get GMB account data
  const { account, isConnected } = useGmbData()
  
  // Get stores from API (same as overview and stores pages)
  const { stores: apiStores, isLoading: storesLoading } = useStores({
    status: 'active',
    limit: 10000 // Fetch all stores linked to the account
  })
  
  // Create stores array for dropdown - use stores from API
  const stores = apiStores.length > 0 
    ? [
        { id: "all", name: "All Stores", count: apiStores.length, selected: true, storeCode: '', city: '' },
        ...apiStores.map((store: any) => ({
          id: store._id,
          name: store.name,
          storeCode: store.storeCode || store._id?.toString().substring(0, 8) || '—',
          city: store.address?.city || 'Unknown',
          count: 1,
          selected: false,
          gmbLocationId: store.gmbLocationId
        }))
      ]
    : [] // Don't show stores when none available

  return (
    <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-gray-50/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2 text-gray-900">
          <div className="p-1.5 bg-green-100 rounded-lg">
            <Store className="h-4 w-4 text-green-600" />
          </div>
          Store Filter
        </CardTitle>
        <p className="text-sm text-gray-600">
          Select specific stores or view all locations
          {storesLoading && <span className="ml-2 text-blue-600 font-medium">Loading stores...</span>}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {stores.length > 0 ? (
          <Select 
            value={selectedStores.includes("all") ? "all" : selectedStores[0] || "all"} 
            onValueChange={(value) => {
              setSelectedStores([value])
            }}
          >
            <SelectTrigger className="w-full h-10 border-2 border-gray-200 hover:border-green-300 transition-colors bg-white">
              <SelectValue>
                {selectedStores.includes("all") || selectedStores.length === 0
                  ? `All Stores (${stores.find(s => s.id === "all")?.count || 0})`
                  : selectedStores.length === 1
                    ? stores.find(s => s.id === selectedStores[0])?.name
                    : `${selectedStores.length} stores selected`
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {stores.map((store) => (
                <SelectItem key={store.id} value={store.id} className="py-2">
                  <div className="flex items-center justify-between w-full">
                    <div className="flex flex-col items-start">
                      <span className="font-medium text-sm">{store.name}</span>
                      {store.storeCode && store.id !== "all" && (
                        <span className="text-xs text-muted-foreground">
                          {store.storeCode} {store.city && `• ${store.city}`}
                        </span>
                      )}
                    </div>
                    {store.id === "all" && (
                      <Badge variant="secondary" className="text-xs ml-2">
                        {store.count} stores
                      </Badge>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <div className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg text-center bg-gray-50">
            <MapPin className="h-6 w-6 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-500 font-medium text-sm">
              {storesLoading ? 'Loading stores...' : 'No stores available'}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
