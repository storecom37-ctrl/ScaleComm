"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { 
  Phone, 
  Search, 
  Filter, 
  MoreHorizontal,
  Download,
  Play,
  PhoneCall,
  PhoneIncoming,
  PhoneMissed,
  PhoneOff,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  User,
  Calendar,
  Loader2,
  AlertCircle
} from "lucide-react"

interface IVRCallData {
  _id: string
  brandId: string
  storeId?: string
  customerName?: string
  customerNumber?: string
  publisherType?: string
  leadType?: string
  storeIdentifier?: string
  storeName?: string
  location?: string
  callStartTime: string
  callEndTime: string
  callStatus: string
  callType?: string
  virtualNumber?: string
  callRecordingUrl?: string
  duration?: number
  conversationDuration?: number
  ringDuration?: number
  status: string
  createdAt: string
  updatedAt: string
}

interface Brand {
  _id: string
  name: string
  slug: string
  email: string
}


export default function IVRCallsPage() {
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")
  const [ivrCallsData, setIvrCallsData] = useState<IVRCallData[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedBrand, setSelectedBrand] = useState<string>("all")
  const [totalCalls, setTotalCalls] = useState(0)

  // Fetch brands user has access to (based on authentication & role)
  useEffect(() => {
    const fetchBrands = async () => {
      try {
        const response = await fetch('/api/brands?limit=100')
        const data = await response.json()
        if (data.success && data.data.length > 0) {
          setBrands(data.data)
          // Set first accessible brand as default
          setSelectedBrand(data.data[0]._id)
        } else {
          setBrands([])
          setLoading(false)
        }
      } catch (err) {
        console.error('Error fetching brands:', err)
        setError('Failed to fetch accessible brands')
        setLoading(false)
      }
    }
    fetchBrands()
  }, [])

  // Fetch IVR calls data for selected brand
  useEffect(() => {
    const fetchData = async () => {
      if (!selectedBrand || selectedBrand === "all") {
        setIvrCallsData([])
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)
        
        const response = await fetch(`/api/ivr-calls/${selectedBrand}?page=1&limit=1000`)
        const data = await response.json()
        
        if (data.status === 200) {
          setIvrCallsData(data.data || [])
          setTotalCalls(data.pagination?.total || 0)
        } else {
          setError(data.message || 'Failed to fetch IVR calls')
        }
      } catch (err) {
        console.error('Error fetching IVR calls:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch IVR calls')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [selectedBrand])

  // Filter calls based on search term, status, and type
  const filteredCalls = ivrCallsData.filter(call => {
    const matchesSearch = (call.customerName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (call.customerNumber || '').includes(searchTerm) ||
                         (call.storeName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (call.location || '').toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || call.callStatus.toLowerCase().includes(statusFilter.toLowerCase())
    const matchesType = typeFilter === "all" || (call.callType || '').toLowerCase().includes(typeFilter.toLowerCase())
    
    return matchesSearch && matchesStatus && matchesType
  })

  // Calculate pagination
  const totalPages = Math.ceil(filteredCalls.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedCalls = filteredCalls.slice(startIndex, startIndex + itemsPerPage)

  const getStatusBadge = (status: string) => {
    const lowerStatus = status.toLowerCase()
    if (lowerStatus.includes('answered') || lowerStatus.includes('completed')) {
      return <Badge className="bg-green-100 text-green-800"><PhoneCall className="w-3 h-3 mr-1" />{status}</Badge>
    } else if (lowerStatus.includes('missed') || lowerStatus.includes('drop')) {
      return <Badge variant="destructive"><PhoneMissed className="w-3 h-3 mr-1" />{status}</Badge>
    } else if (lowerStatus.includes('busy') || lowerStatus.includes('offline')) {
      return <Badge className="bg-yellow-100 text-yellow-800"><PhoneOff className="w-3 h-3 mr-1" />{status}</Badge>
    } else if (lowerStatus.includes('transferred')) {
      return <Badge className="bg-blue-100 text-blue-800"><PhoneIncoming className="w-3 h-3 mr-1" />{status}</Badge>
    } else {
      return <Badge variant="outline">{status}</Badge>
    }
  }

  const getCallTypeIcon = (type?: string) => {
    return (type || '').toLowerCase().includes('inbound') || (type || '').toLowerCase().includes('incoming') ? 
      <PhoneIncoming className="w-4 h-4 text-green-600" /> : 
      <Phone className="w-4 h-4 text-blue-600" />
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString() + " " + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
  }

  const formatDuration = (seconds?: number) => {
    if (!seconds || seconds === 0) return "N/A"
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const getTotalDuration = () => {
    return ivrCallsData
      .filter(call => call.callStatus.toLowerCase().includes('answered') || call.callStatus.toLowerCase().includes('completed'))
      .reduce((total, call) => total + (call.duration || 0), 0)
  }

  const getCompletedCallsCount = () => {
    return ivrCallsData.filter(call => 
      call.callStatus.toLowerCase().includes('answered') || 
      call.callStatus.toLowerCase().includes('completed')
    ).length
  }

  const getMissedCallsCount = () => {
    return ivrCallsData.filter(call => 
      call.callStatus.toLowerCase().includes('missed') || 
      call.callStatus.toLowerCase().includes('drop') ||
      call.callStatus.toLowerCase().includes('offline')
    ).length
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">IVR Calls</h1>
          <p className="text-muted-foreground">Monitor and analyze your Interactive Voice Response system calls</p>
        </div>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            onClick={() => window.location.reload()}
            disabled={loading}
            className="flex items-center gap-2"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Phone className="h-4 w-4" />
            )}
            Refresh Data
          </Button>
          <Button variant="outline" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export Report
          </Button>
          <Button className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Schedule Report
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Calls</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{ivrCallsData.length}</div>
            <p className="text-xs text-muted-foreground">Today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Calls</CardTitle>
            <PhoneCall className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {getCompletedCallsCount()}
            </div>
            <p className="text-xs text-muted-foreground">
              {ivrCallsData.length > 0 
                ? ((getCompletedCallsCount() / ivrCallsData.length) * 100).toFixed(1) 
                : '0'}% success rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Call Duration</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatDuration(
                getCompletedCallsCount() > 0 
                  ? Math.floor(getTotalDuration() / getCompletedCallsCount())
                  : 0
              )}
            </div>
            <p className="text-xs text-muted-foreground">Average duration</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Missed Calls</CardTitle>
            <PhoneMissed className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {getMissedCallsCount()}
            </div>
            <p className="text-xs text-muted-foreground">
              {ivrCallsData.length > 0 
                ? ((getMissedCallsCount() / ivrCallsData.length) * 100).toFixed(1) 
                : '0'}% missed rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Call Management */}
      <Card>
        <CardHeader>
          <CardTitle>Call Management</CardTitle>
          <CardDescription>Monitor and analyze IVR call data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col space-y-4 md:flex-row md:items-center md:space-y-0 md:space-x-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search calls..." 
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="missed">Missed</SelectItem>
                <SelectItem value="busy">Busy</SelectItem>
                <SelectItem value="transferred">Transferred</SelectItem>
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="incoming">Incoming</SelectItem>
                <SelectItem value="outgoing">Outgoing</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedBrand} onValueChange={setSelectedBrand}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select Brand" />
              </SelectTrigger>
              <SelectContent>
                {brands.map((brand) => (
                  <SelectItem key={brand._id} value={brand._id}>
                    {brand.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button variant="outline" className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              More Filters
            </Button>
          </div>

          {/* Calls Table */}
          <div className="mt-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex flex-col items-center space-y-4">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Loading IVR calls...</p>
                </div>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex flex-col items-center space-y-4">
                  <AlertCircle className="h-8 w-8 text-red-500" />
                  <div className="text-center">
                    <p className="text-sm font-medium text-red-900">Error loading IVR calls</p>
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={() => window.location.reload()}
                    className="flex items-center gap-2"
                  >
                    <Phone className="h-4 w-4" />
                    Retry
                  </Button>
                </div>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Caller</TableHead>
                    <TableHead>Store</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>IVR Path</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedCalls.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-12">
                        <div className="flex flex-col items-center space-y-2">
                          <Phone className="h-8 w-8 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">No IVR calls found</p>
                          <p className="text-xs text-muted-foreground">
                            {selectedBrand === "all" || !selectedBrand
                              ? "Please select a brand to view calls" 
                              : `No calls available for ${brands.find(b => b._id === selectedBrand)?.name || 'this brand'}`
                            }
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedCalls.map((call) => (
                      <TableRow key={call._id}>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">{call.customerName || 'Unknown'}</span>
                            </div>
                            <p className="text-sm text-muted-foreground">{call.customerNumber || 'N/A'}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <span>{call.storeName || call.storeIdentifier || 'N/A'}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {getCallTypeIcon(call.callType || call.leadType)}
                            <span>{call.callType || call.leadType || 'N/A'}</span>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(call.callStatus)}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span>{formatDuration(call.duration)}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatDate(call.callStartTime)}
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <p className="text-sm truncate" title={`${call.publisherType} → ${call.leadType}`}>
                            {call.publisherType} → {call.leadType}
                          </p>
                          {call.location && (
                            <p className="text-xs text-muted-foreground truncate" title={call.location}>
                              📍 {call.location} {call.virtualNumber && `• VN: ${call.virtualNumber}`}
                            </p>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem>
                                <User className="mr-2 h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
                              {call.callRecordingUrl && call.callRecordingUrl !== 'N/A' && (
                                <DropdownMenuItem
                                  onClick={() => window.open(call.callRecordingUrl, '_blank')}
                                >
                                  <Play className="mr-2 h-4 w-4" />
                                  Play Recording
                                </DropdownMenuItem>
                              )}
                              {call.customerNumber && (
                                <DropdownMenuItem
                                  onClick={() => window.location.href = `tel:${call.customerNumber}`}
                                >
                                  <Phone className="mr-2 h-4 w-4" />
                                  Call Back
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem>
                                <Download className="mr-2 h-4 w-4" />
                                Download Report
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}

            {/* Pagination */}
            {!loading && !error && filteredCalls.length > 0 && (
              <div className="flex items-center justify-between space-x-2 py-4">
                <div className="flex items-center space-x-2">
                  <p className="text-sm text-muted-foreground">
                    Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredCalls.length)} of {filteredCalls.length} calls
                  </p>
                </div>
                
                <div className="flex items-center space-x-2">
                  <div className="flex items-center space-x-2">
                    <p className="text-sm text-muted-foreground">Rows per page:</p>
                    <Select value={itemsPerPage.toString()} onValueChange={(value) => {
                      setItemsPerPage(Number(value))
                      setCurrentPage(1)
                    }}>
                      <SelectTrigger className="h-8 w-[70px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent side="top">
                        <SelectItem value="5">5</SelectItem>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="20">20</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    
                    <div className="flex items-center space-x-1">
                      <span className="text-sm text-muted-foreground">
                        Page {currentPage} of {totalPages}
                      </span>
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
