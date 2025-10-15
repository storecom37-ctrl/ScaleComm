"use client"

import { useGmbStore } from "@/lib/stores/gmb-store"
import { useStores } from "@/lib/hooks/use-stores"
import { useGmbData } from "@/lib/hooks/use-gmb-data"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
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
    multiSelectMode, 
    setSelectedStores, 
    setMultiSelectMode 
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
      <CardHeader className="pb-4">
        <CardTitle className="text-base font-semibold flex items-center gap-2 text-gray-900">
          <div className="p-2 bg-green-100 rounded-lg">
            <Store className="h-4 w-4 text-green-600" />
          </div>
          Store Filter
        </CardTitle>
        <p className="text-sm text-gray-600">
          Select specific stores or view all locations
          {storesLoading && <span className="ml-2 text-blue-600 font-medium">Loading stores...</span>}
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <Checkbox
            id="multi-select"
            checked={multiSelectMode}
            onCheckedChange={(checked) => setMultiSelectMode(!!checked)}
            className="border-2 border-gray-300"
          />
          <label
            htmlFor="multi-select"
            className="text-sm font-medium text-gray-700 leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2"
          >
            <Building2 className="h-4 w-4" />
            Multi-select mode
          </label>
        </div>

        {stores.length > 0 ? (
          <Select value={selectedStores[0] || "all"} onValueChange={(value) => {
            if (multiSelectMode) {
              // Handle multi-select logic
              if (value === "all") {
                setSelectedStores(["all"])
              } else {
                const newSelection = selectedStores.includes("all") 
                  ? [value] 
                  : selectedStores.includes(value)
                    ? selectedStores.filter(id => id !== value)
                    : [...selectedStores.filter(id => id !== "all"), value]
                setSelectedStores(newSelection.length === 0 ? ["all"] : newSelection)
              }
            } else {
              setSelectedStores([value])
            }
          }}>
            <SelectTrigger className="w-full h-12 border-2 border-gray-200 hover:border-green-300 transition-colors bg-white">
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
                <SelectItem key={store.id} value={store.id}>
                  <div className="flex items-center justify-between w-full">
                    <div className="flex flex-col items-start">
                      <span className="font-medium">{store.name}</span>
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
          <div className="w-full p-6 border-2 border-dashed border-gray-300 rounded-lg text-center bg-gray-50">
            <MapPin className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-500 font-medium">
              {storesLoading ? 'Loading stores...' : 'No stores available'}
            </p>
          </div>
        )}

        {/* <div className="flex justify-between items-center">
          <div className="text-sm text-muted-foreground">
            {stores.length > 0 ? (
              isConnected ? (
                locations && locations.length > 0 ? (
                  `${locations.length} location${locations.length !== 1 ? 's' : ''} connected to GMB account`
                ) : gmbStores.length > 0 ? (
                  `${gmbStores.length} store${gmbStores.length !== 1 ? 's' : ''} linked to GMB account`
                ) : (
                  "No stores linked to GMB account"
                )
              ) : (
                "Connect GMB to see linked stores"
              )
            ) : (
              storesLoading ? "Loading stores..." : "No stores available - create stores or sync GMB account"
            )}
          </div>
          <Button variant="outline" size="sm">
            {isConnected ? 'Manage Stores' : 'Connect GMB'}
          </Button>
        </div> */}
      </CardContent>
    </Card>
  )
}
