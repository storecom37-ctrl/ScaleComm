"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { 
  Search, 
  MoreHorizontal, 
  Eye, 
  Edit, 
  Trash2, 
  ChevronLeft, 
  ChevronRight,
  ExternalLink,
  MapPin,
  Mail,
  Phone,
  Calendar,
  Filter,
  Loader2
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/lib/hooks/use-auth"

interface Brand {
  _id: string
  name: string
  slug: string
  description: string
  logo?: {
    url: string
    key: string
  }
  website: string
  email: string
  phone: string
  industry: string
  primaryCategory: string
  address: {
    line1: string
    line2?: string
    locality: string
    city: string
    state: string
    postalCode: string
    country: string
  }
  status: 'active' | 'inactive' | 'pending'
  createdAt: string
  updatedAt: string
}

interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

interface BrandsTableProps {
  onBrandEdit?: (brand: Brand) => void
  onBrandDelete?: (brandId: string) => void
  refreshTrigger?: number
}

export default function BrandsTable({ onBrandEdit, onBrandDelete, refreshTrigger }: BrandsTableProps) {
  const { user, hasPermission } = useAuth()
  const [brands, setBrands] = useState<Brand[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false
  })

  const fetchBrands = async (page = 1, search = searchTerm, status = statusFilter) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString(),
        ...(search && { search }),
        ...(status && { status })
      })

      const response = await fetch(`/api/brands?${params}`)
      const result = await response.json()

      if (result.success) {
        setBrands(result.data)
        setPagination(result.pagination)
      } else {
        console.error('Failed to fetch brands:', result.error)
      }
    } catch (error) {
      console.error('Error fetching brands:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBrands()
  }, [refreshTrigger])

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      fetchBrands(1, searchTerm, statusFilter)
    }, 500)

    return () => clearTimeout(debounceTimer)
  }, [searchTerm, statusFilter])

  const handleDelete = async (brandId: string) => {
    if (!confirm('Are you sure you want to delete this brand? This action cannot be undone.')) {
      return
    }

    setDeleting(brandId)
    try {
      const response = await fetch(`/api/brands/${brandId}`, {
        method: 'DELETE'
      })

      const result = await response.json()

      if (result.success) {
        setBrands(prev => prev.filter(brand => brand._id !== brandId))
        onBrandDelete?.(brandId)
      } else {
        console.error('Failed to delete brand:', result.error)
        alert('Failed to delete brand. Please try again.')
      }
    } catch (error) {
      console.error('Error deleting brand:', error)
      alert('Failed to delete brand. Please try again.')
    } finally {
      setDeleting(null)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-green-100 text-green-800">Active</Badge>
      case 'inactive':
        return <Badge variant="secondary">Inactive</Badge>
      case 'pending':
        return <Badge variant="outline" className="border-yellow-300 text-yellow-800">Pending</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .substring(0, 2)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
          <div>
            <CardTitle>Brands</CardTitle>
            <CardDescription>
              Manage your brand profiles and settings
            </CardDescription>
          </div>
          
          <div className="flex flex-col space-y-2 md:flex-row md:space-y-0 md:space-x-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search brands..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 w-full md:w-[200px]"
              />
            </div>
            
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="flex h-10 w-full md:w-[120px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="pending">Pending</option>
            </select>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Loading brands...</span>
          </div>
        ) : brands.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-muted-foreground">
              {searchTerm || statusFilter ? (
                <>
                  <p>No brands found matching your criteria.</p>
                  <p className="text-sm mt-2">Try adjusting your search or filters.</p>
                </>
              ) : (
                <>
                  <p>No brands created yet.</p>
                  <p className="text-sm mt-2">Create your first brand to get started.</p>
                </>
              )}
            </div>
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Brand</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Industry</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[70px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {brands.map((brand) => (
                  <TableRow key={brand._id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={brand.logo?.url} />
                          <AvatarFallback>{getInitials(brand.name)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{brand.name}</div>
                          <div className="text-sm text-muted-foreground">{brand.slug}</div>
                          {brand.description && (
                            <div className="text-xs text-muted-foreground max-w-[200px] truncate">
                              {brand.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center text-sm">
                          <Mail className="h-3 w-3 mr-1 text-muted-foreground" />
                          <span className="truncate max-w-[150px]">{brand.email}</span>
                        </div>
                        {brand.phone && (
                          <div className="flex items-center text-sm text-muted-foreground">
                            <Phone className="h-3 w-3 mr-1" />
                            <span>{brand.phone}</span>
                          </div>
                        )}
                        {brand.website && (
                          <div className="flex items-center text-sm text-muted-foreground">
                            <ExternalLink className="h-3 w-3 mr-1" />
                            <a 
                              href={brand.website} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="hover:underline truncate max-w-[120px]"
                            >
                              {brand.website.replace(/^https?:\/\//, '')}
                            </a>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-start space-x-1 text-sm">
                        <MapPin className="h-3 w-3 mt-0.5 text-muted-foreground flex-shrink-0" />
                        <div className="text-muted-foreground">
                          <div>{brand.address.line1}, {brand.address.state}</div>
                          <div className="text-xs">{brand.address.country}</div>
                        </div>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="text-sm">
                        {brand.industry && (
                          <div className="capitalize">{brand.industry.replace('-', ' ')}</div>
                        )}
                        {brand.primaryCategory && (
                          <div className="text-xs text-muted-foreground capitalize">
                            {brand.primaryCategory.replace('-', ' ')}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      {getStatusBadge(brand.status)}
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Calendar className="h-3 w-3 mr-1" />
                        {formatDate(brand.createdAt)}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => window.open(`/brand/${brand.slug}`, '_blank')}>
                            <Eye className="mr-2 h-4 w-4" />
                            View
                          </DropdownMenuItem>
                          {hasPermission('edit_brand') && (
                            <DropdownMenuItem onClick={() => onBrandEdit?.(brand)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                          )}
                          {hasPermission('delete_brand') && (
                            <DropdownMenuItem
                              onClick={() => handleDelete(brand._id)}
                              className="text-destructive"
                              disabled={deleting === brand._id}
                            >
                              {deleting === brand._id ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="mr-2 h-4 w-4" />
                              )}
                              Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Pagination */}
            <div className="flex items-center justify-between space-x-2 py-4">
              <div className="text-sm text-muted-foreground">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                {pagination.total} brands
              </div>
              
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchBrands(pagination.page - 1)}
                  disabled={!pagination.hasPrevPage || loading}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                
                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                    let pageNumber : number
                    if (pagination.totalPages <= 5) {
                      pageNumber = i + 1
                    } else if (pagination.page <= 3) {
                      pageNumber = i + 1
                    } else if (pagination.page >= pagination.totalPages - 2) {
                      pageNumber = pagination.totalPages - 4 + i
                    } else {
                      pageNumber = pagination.page - 2 + i
                    }

                    return (
                      <Button
                        key={pageNumber}
                        variant={pagination.page === pageNumber ? "default" : "outline"}
                        size="sm"
                        className="w-8 h-8 p-0"
                        onClick={() => fetchBrands(pageNumber)}
                        disabled={loading}
                      >
                        {pageNumber}
                      </Button>
                    )
                  })}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchBrands(pagination.page + 1)}
                  disabled={!pagination.hasNextPage || loading}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}


