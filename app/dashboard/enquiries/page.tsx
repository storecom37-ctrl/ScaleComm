'use client'

import { useState, useEffect } from 'react'
import { 
  MessageSquare, 
  Filter, 
  Search, 
  Calendar,
  Mail,
  Phone,
  Building,
  Tag,
  ChevronDown,
  Eye,
  CheckCircle,
  Clock,
  AlertCircle
} from 'lucide-react'

interface Enquiry {
  _id: string
  name: string
  email: string
  phone?: string
  subject: string
  message: string
  enquiryType: string
  status: 'new' | 'in-progress' | 'resolved' | 'closed'
  storeId: {
    _id: string
    name: string
    slug: string
  }
  brandId: {
    _id: string
    name: string
    slug: string
  }
  storeName: string
  brandName: string
  createdAt: string
  updatedAt: string
}

interface PaginationInfo {
  currentPage: number
  totalPages: number
  totalCount: number
  hasNextPage: boolean
  hasPrevPage: boolean
  limit: number
}

export default function EnquiriesPage() {
  const [enquiries, setEnquiries] = useState<Enquiry[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedEnquiry, setSelectedEnquiry] = useState<Enquiry | null>(null)
  const [pagination, setPagination] = useState<PaginationInfo>({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    hasNextPage: false,
    hasPrevPage: false,
    limit: 10
  })
  const [filters, setFilters] = useState({
    status: '',
    enquiryType: '',
    search: ''
  })

  const fetchEnquiries = async (page = 1) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10'
      })
      
      if (filters.status) params.append('status', filters.status)
      if (filters.enquiryType) params.append('enquiryType', filters.enquiryType)
      if (filters.search) params.append('search', filters.search)

      const response = await fetch(`/api/enquiries?${params}`)
      if (!response.ok) throw new Error('Failed to fetch enquiries')
      
      const data = await response.json()
      setEnquiries(data.data.enquiries)
      setPagination(data.data.pagination)
    } catch (error) {
      console.error('Error fetching enquiries:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateEnquiryStatus = async (enquiryId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/enquiries/${enquiryId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus })
      })

      if (!response.ok) throw new Error('Failed to update enquiry')
      
      // Refresh the enquiries list
      fetchEnquiries(pagination.currentPage)
      
      // Update selected enquiry if it's the one being updated
      if (selectedEnquiry?._id === enquiryId) {
        setSelectedEnquiry(prev => prev ? { ...prev, status: newStatus as any } : null)
      }
    } catch (error) {
      console.error('Error updating enquiry:', error)
    }
  }

  useEffect(() => {
    fetchEnquiries()
  }, [filters])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-800'
      case 'in-progress': return 'bg-yellow-100 text-yellow-800'
      case 'resolved': return 'bg-green-100 text-green-800'
      case 'closed': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'new': return <AlertCircle className="w-4 h-4" />
      case 'in-progress': return <Clock className="w-4 h-4" />
      case 'resolved': return <CheckCircle className="w-4 h-4" />
      case 'closed': return <CheckCircle className="w-4 h-4" />
      default: return <MessageSquare className="w-4 h-4" />
    }
  }

  const getEnquiryTypeColor = (type: string) => {
    switch (type) {
      case 'general': return 'bg-gray-100 text-gray-800'
      case 'product': return 'bg-purple-100 text-purple-800'
      case 'service': return 'bg-blue-100 text-blue-800'
      case 'complaint': return 'bg-red-100 text-red-800'
      case 'feedback': return 'bg-green-100 text-green-800'
      case 'partnership': return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Customer Enquiries</h1>
        <p className="text-gray-600">Manage and respond to customer enquiries from your store microsites</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <div className="grid md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search by name, email, subject..."
                className="pl-10 w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
            >
              <option value="">All Statuses</option>
              <option value="new">New</option>
              <option value="in-progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
            <select
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={filters.enquiryType}
              onChange={(e) => setFilters(prev => ({ ...prev, enquiryType: e.target.value }))}
            >
              <option value="">All Types</option>
              <option value="general">General</option>
              <option value="product">Product</option>
              <option value="service">Service</option>
              <option value="complaint">Complaint</option>
              <option value="feedback">Feedback</option>
              <option value="partnership">Partnership</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => setFilters({ status: '', enquiryType: '', search: '' })}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition-colors"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Enquiries List */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">
                  Enquiries ({pagination.totalCount})
                </h2>
                <div className="text-sm text-gray-500">
                  Page {pagination.currentPage} of {pagination.totalPages}
                </div>
              </div>
            </div>

            <div className="divide-y divide-gray-200">
              {loading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-gray-500 mt-2">Loading enquiries...</p>
                </div>
              ) : enquiries.length === 0 ? (
                <div className="p-8 text-center">
                  <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No enquiries found</p>
                </div>
              ) : (
                enquiries.map((enquiry) => (
                  <div
                    key={enquiry._id}
                    className={`p-6 hover:bg-gray-50 cursor-pointer transition-colors ${
                      selectedEnquiry?._id === enquiry._id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                    }`}
                    onClick={() => setSelectedEnquiry(enquiry)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(enquiry.status)}`}>
                          {getStatusIcon(enquiry.status)}
                          <span className="capitalize">{enquiry.status.replace('-', ' ')}</span>
                        </div>
                        <div className={`px-2 py-1 rounded-full text-xs font-medium ${getEnquiryTypeColor(enquiry.enquiryType)}`}>
                          <span className="capitalize">{enquiry.enquiryType}</span>
                        </div>
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(enquiry.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <h3 className="font-semibold text-gray-900 mb-2">{enquiry.subject}</h3>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                      <div className="flex items-center gap-1">
                        <Mail className="w-4 h-4" />
                        <span>{enquiry.name}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Building className="w-4 h-4" />
                        <span>{enquiry.storeName}</span>
                      </div>
                    </div>

                    <p className="text-gray-600 text-sm line-clamp-2">{enquiry.message}</p>
                  </div>
                ))
              )}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="p-6 border-t border-gray-200 flex items-center justify-between">
                <button
                  onClick={() => fetchEnquiries(pagination.currentPage - 1)}
                  disabled={!pagination.hasPrevPage}
                  className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-600">
                  Page {pagination.currentPage} of {pagination.totalPages}
                </span>
                <button
                  onClick={() => fetchEnquiries(pagination.currentPage + 1)}
                  disabled={!pagination.hasNextPage}
                  className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Enquiry Details */}
        <div>
          <div className="bg-white rounded-lg shadow-sm border">
            {selectedEnquiry ? (
              <div>
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Enquiry Details</h3>
                    <div className="flex items-center gap-2">
                      <select
                        value={selectedEnquiry.status}
                        onChange={(e) => updateEnquiryStatus(selectedEnquiry._id, e.target.value)}
                        className="text-sm border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="new">New</option>
                        <option value="in-progress">In Progress</option>
                        <option value="resolved">Resolved</option>
                        <option value="closed">Closed</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedEnquiry.status)}`}>
                      {getStatusIcon(selectedEnquiry.status)}
                      <span className="capitalize">{selectedEnquiry.status.replace('-', ' ')}</span>
                    </div>
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${getEnquiryTypeColor(selectedEnquiry.enquiryType)}`}>
                      <span className="capitalize">{selectedEnquiry.enquiryType}</span>
                    </div>
                  </div>

                  <h4 className="font-medium text-gray-900">{selectedEnquiry.subject}</h4>
                </div>

                <div className="p-6 space-y-6">
                  {/* Customer Info */}
                  <div>
                    <h5 className="font-medium text-gray-900 mb-3">Customer Information</h5>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Name:</span>
                        <span>{selectedEnquiry.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-gray-400" />
                        <a 
                          href={`mailto:${selectedEnquiry.email}`}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          {selectedEnquiry.email}
                        </a>
                      </div>
                      {selectedEnquiry.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-gray-400" />
                          <a 
                            href={`tel:${selectedEnquiry.phone}`}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            {selectedEnquiry.phone}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Store Info */}
                  <div>
                    <h5 className="font-medium text-gray-900 mb-3">Store Information</h5>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Building className="w-4 h-4 text-gray-400" />
                        <span>{selectedEnquiry.storeName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Tag className="w-4 h-4 text-gray-400" />
                        <span>{selectedEnquiry.brandName}</span>
                      </div>
                    </div>
                  </div>

                  {/* Message */}
                  <div>
                    <h5 className="font-medium text-gray-900 mb-3">Message</h5>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">
                        {selectedEnquiry.message}
                      </p>
                    </div>
                  </div>

                  {/* Timestamps */}
                  <div>
                    <h5 className="font-medium text-gray-900 mb-3">Timeline</h5>
                    <div className="space-y-2 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>Created: {new Date(selectedEnquiry.createdAt).toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>Updated: {new Date(selectedEnquiry.updatedAt).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500">
                <Eye className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p>Select an enquiry to view details</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}