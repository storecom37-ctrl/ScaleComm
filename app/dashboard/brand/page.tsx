"use client"

import { useState } from "react"
import BrandCreateModal from "@/components/dashboard/brand-create-modal"
import BrandsTable from "@/components/dashboard/brands-table"
import { useAuth } from "@/lib/hooks/use-auth"

export default function BrandPage() {
  const { user } = useAuth()
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [selectedBrand, setSelectedBrand] = useState<any>(null)
  
  // Only super_admin can create new brands
  const canCreateBrand = user?.role === 'super_admin'

  const handleBrandCreated = (brand: any) => {
    // Refresh the table when a new brand is created
    setRefreshTrigger(prev => prev + 1)
  }

  const handleBrandUpdated = (brand: any) => {
    // Refresh the table when a brand is updated
    setRefreshTrigger(prev => prev + 1)
    setEditModalOpen(false)
    setSelectedBrand(null)
  }

  const handleBrandEdit = (brand: any) => {
    setSelectedBrand(brand)
    setEditModalOpen(true)
  }

  const handleEditModalClose = () => {
    setEditModalOpen(false)
    setSelectedBrand(null)
  }

  const handleBrandDelete = (brandId: string) => {
    // Handle brand deletion - table already handles the removal
    console.log('Brand deleted:', brandId)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Brand Management</h1>
          <p className="text-muted-foreground">
            {canCreateBrand 
              ? 'Create and manage your brand profiles with complete information'
              : 'Manage your brand profile and settings'
            }
          </p>
        </div>
        {canCreateBrand && (
          <div className="flex space-x-2">
            <BrandCreateModal onBrandCreated={handleBrandCreated} />
          </div>
        )}
      </div>

      {/* Brands Table */}
      <BrandsTable 
        onBrandEdit={handleBrandEdit}
        onBrandDelete={handleBrandDelete}
        refreshTrigger={refreshTrigger}
      />

      {/* Edit Modal */}
      {selectedBrand && (
        <BrandCreateModal
          editBrand={selectedBrand}
          isOpen={editModalOpen}
          onClose={handleEditModalClose}
          onBrandUpdated={handleBrandUpdated}
        />
      )}
    </div>
  )
}
