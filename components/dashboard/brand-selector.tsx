"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, Building, RefreshCw, Store } from "lucide-react"
import { useBrands } from "@/lib/hooks/use-gmb-data"

interface Brand {
  _id: string
  name: string
  slug: string
  settings?: {
    gmbIntegration?: {
      gmbAccountId?: string
      connected?: boolean
    }
  }
}

interface BrandSelectorProps {
  selectedBrandId?: string
  onBrandChange?: (brandId: string) => void
  accountId?: string
  className?: string
  allowAll?: boolean
}

export function BrandSelector({ 
  selectedBrandId, 
  onBrandChange,
  accountId,
  className = "",
  allowAll = true
}: BrandSelectorProps) {
  const { brands, isLoading, error, refresh } = useBrands(accountId)

  const handleBrandChange = (brandId: string) => {
    if (onBrandChange) {
      onBrandChange(brandId)
    }
  }

  const selectedBrand = brands.find((brand: Brand) => brand._id === selectedBrandId)

  if (isLoading) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <RefreshCw className="h-4 w-4 animate-spin" />
        <span className="text-sm text-muted-foreground">Loading brands...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <Badge variant="destructive" className="text-xs">
          Error: {error}
        </Badge>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={refresh}
          className="h-6 px-2"
        >
          <RefreshCw className="h-3 w-3" />
        </Button>
      </div>
    )
  }

  if (brands.length === 0) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <Badge variant="outline" className="text-xs">
          {accountId ? "No brands found for this account" : "No brands found"}
        </Badge>
      </div>
    )
  }

  if (brands.length === 1 && !allowAll) {
    // Show single brand info instead of dropdown
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <CheckCircle className="h-4 w-4 text-green-600" />
        <div className="flex flex-col">
          <span className="text-sm font-medium">{brands[0].name}</span>
          <span className="text-xs text-muted-foreground">Single Brand</span>
        </div>
        <Badge className="text-xs">
          <Building className="h-3 w-3 mr-1" />
          Active
        </Badge>
      </div>
    )
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <Building className="h-4 w-4 text-muted-foreground" />
      <Select value={selectedBrandId} onValueChange={handleBrandChange}>
        <SelectTrigger className="w-[200px] h-8">
          <SelectValue placeholder="Select Brand" />
        </SelectTrigger>
        <SelectContent>
          {allowAll && (
            <SelectItem value="all">
              <div className="flex items-center">
                <Store className="h-3 w-3 mr-2" />
                <span className="font-medium">All Brands</span>
              </div>
            </SelectItem>
          )}
          {brands.map((brand: Brand) => (
            <SelectItem key={brand._id} value={brand._id}>
              <div className="flex flex-col">
                <span className="font-medium">{brand.name}</span>
                <div className="flex items-center space-x-1">
                  <span className="text-xs text-muted-foreground">{brand.slug}</span>
                  {brand.settings?.gmbIntegration?.connected && (
                    <Badge variant="outline" className="text-xs px-1 py-0">
                      GMB
                    </Badge>
                  )}
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      {selectedBrand && (
        <Badge className="text-xs">
          <CheckCircle className="h-3 w-3 mr-1" />
          Selected
        </Badge>
      )}
      
      <Badge variant="outline" className="text-xs">
        {brands.length} brands
      </Badge>
    </div>
  )
}
