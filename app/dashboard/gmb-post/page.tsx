"use client"

import { useState, useEffect } from "react"
import { useGmbStore } from "@/lib/stores/gmb-store"
import { useGmbAuth } from "@/lib/hooks/use-gmb-auth"
import { useGmbData } from "@/lib/hooks/use-gmb-data"
import { useAuth } from "@/lib/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
  FileText, 
  Search, 
  Filter, 
  MoreHorizontal,
  Plus,
  Eye,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Image as ImageIcon,
  BarChart3,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  RefreshCw,
  X,
  Save,
  Upload,
  Link,
  MapPin
} from "lucide-react"



export default function GMBPostPage() {
  const { user, hasPermission } = useAuth()
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(5)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")
  const [isLoadingPosts, setIsLoadingPosts] = useState(false)
  const [realPosts, setRealPosts] = useState<any[]>([])
  const [accountContext, setAccountContext] = useState<any>(null)
  
  // Modal states
  const [viewPostModal, setViewPostModal] = useState<{ open: boolean; post: any | null }>({ open: false, post: null })
  const [editPostModal, setEditPostModal] = useState<{ open: boolean; post: any | null }>({ open: false, post: null })
  const [createPostModal, setCreatePostModal] = useState(false)
  const [deletePostModal, setDeletePostModal] = useState<{ open: boolean; post: any | null }>({ open: false, post: null })
  
  // Loading states
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  
  // Create post form states
  const [createPostForm, setCreatePostForm] = useState({
    title: '',
    content: '',
    type: '',
    location: '',
    cta: '',
    ctaUrl: '',
    // Event-specific fields
    eventTitle: '',
    eventStartDate: '',
    eventEndDate: '',
    eventStartTime: '',
    eventEndTime: ''
  })
  
  // Edit post form states
  const [editPostForm, setEditPostForm] = useState({
    title: '',
    content: '',
    type: '',
    location: '',
    cta: '',
    ctaUrl: '',
    // Event-specific fields
    eventTitle: '',
    eventStartDate: '',
    eventEndDate: '',
    eventStartTime: '',
    eventEndTime: ''
  })
  
  // Get GMB data from database (primary source)
  const {
    isConnected: dbConnected,
    isLoading: dbLoading,
    locations: dbLocations,
    posts: dbPosts,
    refreshAll
  } = useGmbData()
  
  // Get GMB data from store (fallback)
  const { posts, locations, isConnected } = useGmbStore()
  const { getStoredTokens } = useGmbAuth()
  
  // Use database data if available, otherwise fall back to localStorage
  const finalLocations = dbLocations.length > 0 ? dbLocations : locations
  const finalPosts = dbPosts.length > 0 ? dbPosts : posts
  const finalIsConnected = dbConnected || isConnected
  
  // Fetch real GMB posts
  const fetchGmbPosts = async (isInitial = false) => {
    if (!isConnected) {
      setIsInitialLoading(false)
      return
    }
    
    setIsLoadingPosts(true)
    if (isInitial) setIsInitialLoading(true)
    
    try {
      const response = await fetch('/api/gmb/data/posts')
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setRealPosts(data.data || [])
          setAccountContext(data.accountContext)
        }
      } else {
        console.error('Failed to fetch posts:', response.status, response.statusText)
        setRealPosts([])
      }
    } catch (error) {
      console.error('Error fetching GMB posts:', error)
      setRealPosts([])
    } finally {
      setIsLoadingPosts(false)
      if (isInitial) setIsInitialLoading(false)
    }
  }

  // Sync posts from GMB and refresh from database
  const syncAndRefreshPosts = async () => {
    if (!isConnected) {
      return
    }
    
    setIsLoadingPosts(true)
    
    try {
      console.log('🔄 Starting posts sync from GMB...')
      
      // Step 1: Sync posts from GMB API to database
      const syncResponse = await fetch('/api/gmb/sync-posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      if (!syncResponse.ok) {
        const errorData = await syncResponse.json()
        throw new Error(errorData.error || 'Failed to sync posts from GMB')
      }
      
      const syncData = await syncResponse.json()
      console.log('✅ Posts sync completed:', syncData)
      
      // Step 2: Fetch updated posts from database
      console.log('📥 Fetching updated posts from database...')
      await fetchGmbPosts()
      
      // Show success message
      if (syncData.data?.totalPostsSaved > 0) {
        alert(`Successfully synced ${syncData.data.totalPostsSaved} posts from GMB!`)
      } else {
        alert('Posts sync completed. No new posts found.')
      }
      
    } catch (error) {
      console.error('❌ Error syncing posts:', error)
      alert(`Failed to sync posts: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsLoadingPosts(false)
    }
  }
  
  // Load posts on component mount if connected
  useEffect(() => {
    if (isConnected) {
      fetchGmbPosts(true)
    } else {
      setIsInitialLoading(false)
    }
  }, [isConnected])

  // Transform real GMB posts to match expected format
  const transformedGmbPosts = realPosts.map((post, index) => {
    // Use enhanced location info from database if available, otherwise fall back to API location data
    const locationInfo = post.locationInfo || finalLocations.find((loc: any) => loc.id === post.locationId)
    const locationName = locationInfo?.name || 'Unknown Location'
    const createDate = new Date(post.createTime)
    const updateDate = new Date(post.updateTime)
    
    // Map GMB status to UI status
    const mapStatus = (state: string) => {
      switch (state?.toUpperCase()) {
        case 'LIVE': return 'Published'
        case 'DRAFT': return 'Draft'
        case 'EXPIRED': return 'Expired'
        case 'SCHEDULED': return 'Scheduled'
        default: return 'Published'
      }
    }
    
    // Map GMB topic type to UI type
    const mapTopicType = (topicType: string) => {
      switch (topicType?.toUpperCase()) {
        case 'EVENT': return 'Event'
        case 'OFFER': return 'Offer'
        case 'PRODUCT': return 'Product'
        case 'STANDARD': return 'Update'
        default: return 'Update'
      }
    }
    
    // Calculate expiry date
    let expiryDate = 'No expiry'
    if (post.event?.schedule?.endDate) {
      const endDate = new Date(
        post.event.schedule.endDate.year,
        post.event.schedule.endDate.month - 1,
        post.event.schedule.endDate.day,
        post.event.schedule.endTime?.hours || 23,
        post.event.schedule.endTime?.minutes || 59
      )
      expiryDate = endDate.toISOString()
    }
    
    return {
      id: index + 1,
      gmbPostId: post.id, // Store the actual GMB post ID
      title: post.event?.title || post.summary || 'Untitled Post',
      content: post.summary || 'No content',
      store: locationName,
      type: mapTopicType(post.topicType),
      status: mapStatus(post.state),
      publishDate: createDate.toISOString(),
      expiryDate: expiryDate,
      views: Math.floor(Math.random() * 1000) + 100, // Simulated since GMB API doesn't provide this
      clicks: Math.floor(Math.random() * 50) + 5, // Simulated since GMB API doesn't provide this
      hasImage: post.media && post.media.length > 0,
      cta: post.callToAction?.actionType || post.offer?.redeemOnlineUrl ? 'Learn More' : null,
      // Additional GMB-specific fields
      searchUrl: post.searchUrl,
      languageCode: post.languageCode,
      event: post.event,
      offer: post.offer,
      callToAction: post.callToAction,
      locationId: post.locationId,
      // Enhanced database fields
      accountInfo: post.accountInfo,
      locationInfo: locationInfo,
      // Additional location details from database
      locationAddress: locationInfo?.address,
      locationPhone: locationInfo?.phoneNumber,
      locationWebsite: locationInfo?.websiteUrl,
      locationCategories: locationInfo?.categories || [],
      locationVerified: locationInfo?.verified || false
    }
  })
  
  // Use real GMB posts if available, otherwise fall back to mock data
  const postsToShow = finalIsConnected && realPosts.length > 0 ? transformedGmbPosts : []

  // Filter posts based on search term, status, and type
  const filteredPosts = postsToShow.filter(post => {
    const matchesSearch = post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         post.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         post.store.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || post.status.toLowerCase().includes(statusFilter.toLowerCase())
    const matchesType = typeFilter === "all" || post.type.toLowerCase().includes(typeFilter.toLowerCase())
    
    return matchesSearch && matchesStatus && matchesType
  })

  // Calculate pagination
  const totalPages = Math.ceil(filteredPosts.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedPosts = filteredPosts.slice(startIndex, startIndex + itemsPerPage)

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Published":
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Published</Badge>
      case "Scheduled":
        return <Badge className="bg-blue-100 text-blue-800"><Clock className="w-3 h-3 mr-1" />Scheduled</Badge>
      case "Draft":
        return <Badge variant="secondary"><AlertCircle className="w-3 h-3 mr-1" />Draft</Badge>
      case "Expired":
        return <Badge variant="outline" className="text-gray-600"><XCircle className="w-3 h-3 mr-1" />Expired</Badge>
      default:
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />{status}</Badge>
    }
  }

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "Offer":
        return <Badge className="bg-orange-100 text-orange-800">Offer</Badge>
      case "Event":
        return <Badge className="bg-purple-100 text-purple-800">Event</Badge>
      case "Product":
        return <Badge className="bg-blue-100 text-blue-800">Product</Badge>
      case "Update":
        return <Badge variant="secondary">Update</Badge>
      default:
        return <Badge variant="secondary">{type}</Badge>
    }
  }

  const formatDate = (dateString: string) => {
    if (dateString === 'No expiry' || !dateString) {
      return 'No expiry'
    }
    const date = new Date(dateString)
    if (isNaN(date.getTime())) {
      return 'Invalid date'
    }
    return date.toLocaleDateString() + " " + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
  }

  const isExpiringSoon = (expiryDate: string) => {
    if (expiryDate === 'No expiry' || !expiryDate) {
      return false
    }
    const expiry = new Date(expiryDate)
    if (isNaN(expiry.getTime())) {
      return false
    }
    const now = new Date()
    const daysDiff = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return daysDiff <= 7 && daysDiff > 0
  }

  // Action handlers
  const handleViewPost = (post: any) => {
    setViewPostModal({ open: true, post })
  }

  const handleEditPost = (post: any) => {
    // Populate edit form with post data
    setEditPostForm({
      title: post.event?.title || post.title || '',
      content: post.content || '',
      type: post.type?.toLowerCase() || '',
      location: post.locationId || '',
      cta: post.cta || '',
      ctaUrl: post.callToAction?.url || '',
      eventTitle: post.event?.title || '',
      eventStartDate: post.event?.schedule?.startDate ? 
        `${post.event.schedule.startDate.year}-${String(post.event.schedule.startDate.month).padStart(2, '0')}-${String(post.event.schedule.startDate.day).padStart(2, '0')}` : '',
      eventEndDate: post.event?.schedule?.endDate ? 
        `${post.event.schedule.endDate.year}-${String(post.event.schedule.endDate.month).padStart(2, '0')}-${String(post.event.schedule.endDate.day).padStart(2, '0')}` : '',
      eventStartTime: post.event?.schedule?.startTime ? 
        `${String(post.event.schedule.startTime.hours).padStart(2, '0')}:${String(post.event.schedule.startTime.minutes).padStart(2, '0')}` : '',
      eventEndTime: post.event?.schedule?.endTime ? 
        `${String(post.event.schedule.endTime.hours).padStart(2, '0')}:${String(post.event.schedule.endTime.minutes).padStart(2, '0')}` : ''
    })
    setEditPostModal({ open: true, post })
  }

  const handleDeletePost = (post: any) => {
    setDeletePostModal({ open: true, post })
  }

  const handleCreatePost = () => {
    setCreatePostModal(true)
  }

  const handleCloseCreatePostModal = () => {
    setCreatePostModal(false)
    setCreatePostForm({
      title: '',
      content: '',
      type: '',
      location: '',
      cta: '',
      ctaUrl: '',
      eventTitle: '',
      eventStartDate: '',
      eventEndDate: '',
      eventStartTime: '',
      eventEndTime: ''
    })
  }

  const handleCloseEditPostModal = () => {
    setEditPostModal({ open: false, post: null })
    setEditPostForm({
      title: '',
      content: '',
      type: '',
      location: '',
      cta: '',
      ctaUrl: '',
      eventTitle: '',
      eventStartDate: '',
      eventEndDate: '',
      eventStartTime: '',
      eventEndTime: ''
    })
  }

  const handleCreatePostSubmit = async () => {
    if (!createPostForm.title || !createPostForm.content || !createPostForm.type || !createPostForm.location) {
      alert('Please fill in all required fields')
      return
    }

    // Validate event data if type is EVENT
    if (createPostForm.type === 'event') {
      if (!createPostForm.eventTitle || !createPostForm.eventStartDate) {
        alert('For events, please provide event title and start date')
        return
      }
    }

    // Validate CTA if provided
    if (createPostForm.cta) {
      const validActionTypes = ['book now', 'book', 'order', 'order now', 'shop', 'shop now', 'learn more', 'learn', 'sign up', 'signup', 'call', 'call now']
      if (!validActionTypes.includes(createPostForm.cta.toLowerCase())) {
        alert('Invalid call-to-action. Please use: Book Now, Order, Shop, Learn More, Sign Up, or Call')
        return
      }

      // Validate URL for non-CALL action types
      const callActionTypes = ['call', 'call now']
      if (!callActionTypes.includes(createPostForm.cta.toLowerCase()) && createPostForm.ctaUrl) {
        try {
          new URL(createPostForm.ctaUrl)
        } catch {
          alert('Please enter a valid URL for the call-to-action')
          return
        }
      }
    }

    setIsCreating(true)
    try {
      // Map UI type to GMB API type
      const topicTypeMap: { [key: string]: string } = {
        'event': 'EVENT',
        'offer': 'OFFER', 
        'product': 'PRODUCT',
        'update': 'STANDARD'
      }

      // Map UI CTA values to valid GMB API action types
      const actionTypeMap: { [key: string]: string } = {
        'book now': 'BOOK',
        'book': 'BOOK',
        'order': 'ORDER',
        'order now': 'ORDER',
        'shop': 'SHOP',
        'shop now': 'SHOP',
        'learn more': 'LEARN_MORE',
        'learn': 'LEARN_MORE',
        'sign up': 'SIGN_UP',
        'signup': 'SIGN_UP',
        'call': 'CALL',
        'call now': 'CALL'
      }

      // Build event data if type is EVENT
      let eventData = undefined
      if (createPostForm.type === 'event' && createPostForm.eventTitle && createPostForm.eventStartDate) {
        const startDate = new Date(createPostForm.eventStartDate)
        const endDate = createPostForm.eventEndDate ? new Date(createPostForm.eventEndDate) : startDate
        
        // Parse time if provided
        const startTime = createPostForm.eventStartTime ? createPostForm.eventStartTime.split(':') : ['10', '00']
        const endTime = createPostForm.eventEndTime ? createPostForm.eventEndTime.split(':') : ['12', '00']
        
        eventData = {
          title: createPostForm.eventTitle,
          schedule: {
            startDate: {
              year: startDate.getFullYear(),
              month: startDate.getMonth() + 1,
              day: startDate.getDate()
            },
            startTime: {
              hours: parseInt(startTime[0]),
              minutes: parseInt(startTime[1])
            },
            endDate: {
              year: endDate.getFullYear(),
              month: endDate.getMonth() + 1,
              day: endDate.getDate()
            },
            endTime: {
              hours: parseInt(endTime[0]),
              minutes: parseInt(endTime[1])
            }
          }
        }
      }

      const postData = {
        topicType: topicTypeMap[createPostForm.type] || 'STANDARD',
        languageCode: 'en-US',
        summary: createPostForm.content,
        callToAction: createPostForm.cta ? {
          actionType: actionTypeMap[createPostForm.cta.toLowerCase()] || 'LEARN_MORE',
          url: createPostForm.ctaUrl || 'https://example.com'
        } : undefined,
        event: eventData
      }

      console.log('Sending post creation request:', {
        locationName: createPostForm.location,
        postData
      })

      const response = await fetch('/api/gmb/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          locationName: createPostForm.location,
          postData
        })
      })

      console.log('Response status:', response.status)
      console.log('Response headers:', Object.fromEntries(response.headers.entries()))

      if (!response.ok) {
        const errorData = await response.json()
        console.error('Error response:', errorData)
        throw new Error(errorData.error || 'Failed to create post')
      }

      const result = await response.json()
      console.log('Post created successfully:', result)

      // Close modal and reset form
      handleCloseCreatePostModal()

      await fetchGmbPosts()

      alert('Post created successfully!')
    } catch (error) {
      console.error('Error creating post:', error)
      alert(`Failed to create post: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsCreating(false)
    }
  }

  const handleEditPostSubmit = async () => {
    if (!editPostForm.title || !editPostForm.content || !editPostForm.type || !editPostForm.location) {
      alert('Please fill in all required fields')
      return
    }

    // Validate event data if type is EVENT
    if (editPostForm.type === 'event') {
      if (!editPostForm.eventTitle || !editPostForm.eventStartDate) {
        alert('For events, please provide event title and start date')
        return
      }
    }

    // Validate CTA if provided
    if (editPostForm.cta) {
      const validActionTypes = ['book now', 'book', 'order', 'order now', 'shop', 'shop now', 'learn more', 'learn', 'sign up', 'signup', 'call', 'call now']
      if (!validActionTypes.includes(editPostForm.cta.toLowerCase())) {
        alert('Invalid call-to-action. Please use: Book Now, Order, Shop, Learn More, Sign Up, or Call')
        return
      }

      // Validate URL for non-CALL action types
      const callActionTypes = ['call', 'call now']
      if (!callActionTypes.includes(editPostForm.cta.toLowerCase()) && editPostForm.ctaUrl) {
        try {
          new URL(editPostForm.ctaUrl)
        } catch {
          alert('Please enter a valid URL for the call-to-action')
          return
        }
      }
    }

    setIsUpdating(true)
    try {
      // Map UI type to GMB API type
      const topicTypeMap: { [key: string]: string } = {
        'event': 'EVENT',
        'offer': 'OFFER', 
        'product': 'PRODUCT',
        'update': 'STANDARD'
      }

      // Map UI CTA values to valid GMB API action types
      const actionTypeMap: { [key: string]: string } = {
        'book now': 'BOOK',
        'book': 'BOOK',
        'order': 'ORDER',
        'order now': 'ORDER',
        'shop': 'SHOP',
        'shop now': 'SHOP',
        'learn more': 'LEARN_MORE',
        'learn': 'LEARN_MORE',
        'sign up': 'SIGN_UP',
        'signup': 'SIGN_UP',
        'call': 'CALL',
        'call now': 'CALL'
      }

      // Build event data if type is EVENT
      let eventData = undefined
      if (editPostForm.type === 'event' && editPostForm.eventTitle && editPostForm.eventStartDate) {
        const startDate = new Date(editPostForm.eventStartDate)
        const endDate = editPostForm.eventEndDate ? new Date(editPostForm.eventEndDate) : startDate
        
        // Parse time if provided
        const startTime = editPostForm.eventStartTime ? editPostForm.eventStartTime.split(':') : ['10', '00']
        const endTime = editPostForm.eventEndTime ? editPostForm.eventEndTime.split(':') : ['12', '00']
        
        eventData = {
          title: editPostForm.eventTitle,
          schedule: {
            startDate: {
              year: startDate.getFullYear(),
              month: startDate.getMonth() + 1,
              day: startDate.getDate()
            },
            startTime: {
              hours: parseInt(startTime[0]),
              minutes: parseInt(startTime[1])
            },
            endDate: {
              year: endDate.getFullYear(),
              month: endDate.getMonth() + 1,
              day: endDate.getDate()
            },
            endTime: {
              hours: parseInt(endTime[0]),
              minutes: parseInt(endTime[1])
            }
          }
        }
      }

      const postData = {
        topicType: topicTypeMap[editPostForm.type] || 'STANDARD',
        languageCode: 'en-US',
        summary: editPostForm.content,
        callToAction: editPostForm.cta ? {
          actionType: actionTypeMap[editPostForm.cta.toLowerCase()] || 'LEARN_MORE',
          url: editPostForm.ctaUrl || 'https://example.com'
        } : undefined,
        event: eventData
      }

      console.log('Sending post update request:', {
        postId: editPostModal.post?.gmbPostId,
        postData
      })

      const response = await fetch(`/api/gmb/posts/${editPostModal.post?.gmbPostId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          postData
        })
      })

      console.log('Response status:', response.status)

      if (!response.ok) {
        const errorData = await response.json()
        console.error('Error response:', errorData)
        throw new Error(errorData.error || 'Failed to update post')
      }

      const result = await response.json()
      console.log('Post updated successfully:', result)

      // Close modal and reset form
      handleCloseEditPostModal()

      await fetchGmbPosts()

      alert('Post updated successfully!')
    } catch (error) {
      console.error('Error updating post:', error)
      alert(`Failed to update post: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsUpdating(false)
    }
  }

  const confirmDeletePost = async () => {
    if (!deletePostModal.post) return
    
    setIsDeleting(true)
    try {
      console.log('Deleting post:', deletePostModal.post.gmbPostId)
      
      const response = await fetch(`/api/gmb/posts/${deletePostModal.post.gmbPostId}`, { 
        method: 'DELETE' 
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete post')
      }
      
      const result = await response.json()
      console.log('Post deleted successfully:', result)
      
      // Refresh posts list
      await fetchGmbPosts()
      
      alert('Post deleted successfully!')
    } catch (error) {
      console.error('Error deleting post:', error)
      alert(`Failed to delete post: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsDeleting(false)
      setDeletePostModal({ open: false, post: null })
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">GMB Posts</h1>
          <p className="text-muted-foreground">Manage your Google My Business posts and announcements</p>
          {accountContext && (
            <div className="mt-2 flex items-center space-x-4 text-sm text-muted-foreground">
              <span className="flex items-center">
                <CheckCircle className="w-4 h-4 mr-1 text-green-600" />
                Account: {accountContext.name}
              </span>
              <span>{accountContext.email}</span>
              {accountContext.lastSyncAt && (
                <span>Last sync: {formatDate(accountContext.lastSyncAt)}</span>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isConnected && (
            <Button 
              onClick={() => syncAndRefreshPosts()} 
              disabled={isLoadingPosts}
              variant="outline" 
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isLoadingPosts ? 'animate-spin' : ''}`} />
              {isLoadingPosts ? 'Syncing...' : 'Refresh Posts'}
            </Button>
          )}
          {hasPermission('create_post') && (
            <Button 
              onClick={handleCreatePost}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Create Post
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Posts</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{postsToShow.length}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Published</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {postsToShow.filter(p => p.status === "Published").length}
            </div>
            <p className="text-xs text-muted-foreground">Currently live</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Views</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {postsToShow.reduce((sum, post) => sum + post.views, 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {isConnected && realPosts.length > 0 ? 'Simulated data' : 'Across all posts'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Click-through Rate</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {postsToShow.length > 0 && postsToShow.reduce((sum, post) => sum + post.views, 0) > 0 ? (
                (postsToShow.reduce((sum, post) => sum + post.clicks, 0) /
                postsToShow.reduce((sum, post) => sum + post.views, 0)) * 100
              ).toFixed(1) : '0.0'}%
            </div>
            <p className="text-xs text-muted-foreground">
              {isConnected && realPosts.length > 0 ? 'Simulated CTR' : 'Average CTR'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* GMB Status Alert */}
      {/* {isConnected && realPosts.length === 0 && !isLoadingPosts && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              <div>
                <p className="font-medium text-amber-800">
                  GMB Connected but No Posts Found
                </p>
                <p className="text-sm text-amber-700">
                  Your Google My Business account is connected, but no posts were retrieved. 
                  Try clicking "Refresh Posts" above to fetch your latest posts, or create a new post.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )} */}

      {/* Posts Management */}
      <Card>
        <CardHeader>
          <CardTitle>Posts Management</CardTitle>
          <CardDescription>
            {isConnected && realPosts.length > 0 
              ? "Showing real Google My Business posts" 
              : isConnected 
                ? "Showing sample data - no GMB posts found"
                : "Create, schedule, and manage your GMB posts"
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col space-y-4 md:flex-row md:items-center md:space-y-0 md:space-x-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search posts..." 
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
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="offer">Offer</SelectItem>
                <SelectItem value="event">Event</SelectItem>
                <SelectItem value="product">Product</SelectItem>
                <SelectItem value="update">Update</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              More Filters
            </Button>
          </div>

          {/* Posts Table */}
          <div className="mt-6">
            {isInitialLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center space-y-3">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                  <p className="text-muted-foreground">Loading GMB posts...</p>
                </div>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Post</TableHead>
                    <TableHead>Store</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Publish Date</TableHead>
                    <TableHead>Expiry</TableHead>
                    <TableHead>Performance</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedPosts.map((post) => (
                    <TableRow key={post.id}>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <p className="font-medium">{post.title}</p>
                            {post.hasImage && <ImageIcon className="h-4 w-4 text-muted-foreground" />}
                          </div>
                          <p className="text-sm text-muted-foreground truncate max-w-xs" title={post.content}>
                            {post.content}
                          </p>
                          {post.cta && (
                            <Badge variant="outline" className="text-xs">
                              CTA: {post.cta}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <p className="font-medium">{post.store}</p>
                            {(post as any).locationVerified && (
                              <CheckCircle className="h-3 w-3 text-green-600" />
                            )}
                          </div>
                          {(post as any).locationAddress && (
                            <p className="text-xs text-muted-foreground flex items-center">
                              <MapPin className="h-3 w-3 mr-1" />
                              {(post as any).locationAddress}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getTypeBadge(post.type)}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {getStatusBadge(post.status)}
                          {post.status === "Published" && isExpiringSoon(post.expiryDate) && (
                            <Badge variant="destructive" className="text-xs">
                              Expiring Soon
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDate(post.publishDate)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDate(post.expiryDate)}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="text-sm">
                            <span className="font-medium">{post.views.toLocaleString()}</span> views
                          </div>
                          <div className="text-sm text-muted-foreground">
                            <span className="font-medium">{post.clicks}</span> clicks
                            {post.views > 0 && (
                              <span className="ml-1">
                                ({((post.clicks / post.views) * 100).toFixed(1)}%)
                              </span>
                            )}
                          </div>
                        </div>
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
                            <DropdownMenuItem onClick={() => handleViewPost(post)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Post
                            </DropdownMenuItem>
                            {hasPermission('edit_post') && (
                              <>
                                <DropdownMenuItem onClick={() => handleEditPost(post)}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit Post
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Calendar className="mr-2 h-4 w-4" />
                                  Reschedule
                                </DropdownMenuItem>
                              </>
                            )}
                            {hasPermission('delete_post') && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  className="text-red-600"
                                  onClick={() => handleDeletePost(post)}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete Post
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            {/* Pagination */}
            <div className="flex items-center justify-between space-x-2 py-4">
              <div className="flex items-center space-x-2">
                <p className="text-sm text-muted-foreground">
                  Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredPosts.length)} of {filteredPosts.length} posts
                </p>
              </div>
              
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-2">
                  <p className="text-sm text-muted-foreground">Rows per page:</p>
                  <Select value={itemsPerPage.toString()} onValueChange={(value: string) => {
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
          </div>
        </CardContent>
      </Card>

      {/* View Post Modal */}
      <Dialog open={viewPostModal.open} onOpenChange={(open) => setViewPostModal({ open, post: null })}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>View Post</DialogTitle>
            <DialogDescription>
              Post details and preview
            </DialogDescription>
          </DialogHeader>
          {viewPostModal.post && (
            <div className="flex-1 overflow-y-auto space-y-4 pr-2">
              <div>
                <Label className="text-sm font-medium">Title</Label>
                <p className="text-sm mt-1">{viewPostModal.post.title}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Content</Label>
                <p className="text-sm mt-1">{viewPostModal.post.content}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Store</Label>
                  <p className="text-sm mt-1">{viewPostModal.post.store}</p>
                  {viewPostModal.post.locationVerified && (
                    <Badge variant="outline" className="text-xs mt-1">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Verified
                    </Badge>
                  )}
                </div>
                <div>
                  <Label className="text-sm font-medium">Type</Label>
                  <div className="mt-1">{getTypeBadge(viewPostModal.post.type)}</div>
                </div>
              </div>
              {viewPostModal.post.locationAddress && (
                <div>
                  <Label className="text-sm font-medium">Location Address</Label>
                  <p className="text-sm mt-1 flex items-center">
                    <MapPin className="w-3 h-3 mr-1" />
                    {viewPostModal.post.locationAddress}
                  </p>
                </div>
              )}
              {(viewPostModal.post.locationPhone || viewPostModal.post.locationWebsite) && (
                <div className="grid grid-cols-2 gap-4">
                  {viewPostModal.post.locationPhone && (
                    <div>
                      <Label className="text-sm font-medium">Phone</Label>
                      <p className="text-sm mt-1">{viewPostModal.post.locationPhone}</p>
                    </div>
                  )}
                  {viewPostModal.post.locationWebsite && (
                    <div>
                      <Label className="text-sm font-medium">Website</Label>
                      <a 
                        href={viewPostModal.post.locationWebsite} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline mt-1 block"
                      >
                        {viewPostModal.post.locationWebsite}
                      </a>
                    </div>
                  )}
                </div>
              )}
              {viewPostModal.post.locationCategories && viewPostModal.post.locationCategories.length > 0 && (
                <div>
                  <Label className="text-sm font-medium">Categories</Label>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {viewPostModal.post.locationCategories.map((category: string, idx: number) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {category}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <div className="mt-1">{getStatusBadge(viewPostModal.post.status)}</div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Publish Date</Label>
                  <p className="text-sm mt-1">{formatDate(viewPostModal.post.publishDate)}</p>
                </div>
              </div>
              {viewPostModal.post.expiryDate !== 'No expiry' && (
                <div>
                  <Label className="text-sm font-medium">Expiry Date</Label>
                  <p className="text-sm mt-1">{formatDate(viewPostModal.post.expiryDate)}</p>
                </div>
              )}
              {viewPostModal.post.accountInfo && (
                <div className="border-t pt-4">
                  <Label className="text-sm font-medium">Account Information</Label>
                  <div className="mt-2 space-y-2">
                    <p className="text-sm"><strong>Account Name:</strong> {viewPostModal.post.accountInfo.name}</p>
                    <p className="text-sm"><strong>Email:</strong> {viewPostModal.post.accountInfo.email}</p>
                    <p className="text-sm"><strong>Connected:</strong> {formatDate(viewPostModal.post.accountInfo.connectedAt)}</p>
                    {viewPostModal.post.accountInfo.lastSyncAt && (
                      <p className="text-sm"><strong>Last Sync:</strong> {formatDate(viewPostModal.post.accountInfo.lastSyncAt)}</p>
                    )}
                  </div>
                </div>
              )}
              {viewPostModal.post.searchUrl && (
                <div>
                  <Label className="text-sm font-medium">Search URL</Label>
                  <a 
                    href={viewPostModal.post.searchUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline mt-1 flex items-center"
                  >
                    <Link className="w-3 h-3 mr-1" />
                    View on Google
                  </a>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Post Modal */}
      <Dialog open={createPostModal} onOpenChange={(open) => !open && handleCloseCreatePostModal()}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Create New Post</DialogTitle>
            <DialogDescription>
              Create a new Google My Business post
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            <div>
              <Label htmlFor="post-title">Title</Label>
              <Input 
                id="post-title" 
                placeholder="Enter post title..."
                className="mt-1"
                value={createPostForm.title}
                onChange={(e) => setCreatePostForm(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="post-content">Content</Label>
              <Textarea 
                id="post-content" 
                placeholder="Write your post content..."
                className="mt-1 min-h-[100px] resize-y"
                rows={4}
                value={createPostForm.content}
                onChange={(e) => setCreatePostForm(prev => ({ ...prev, content: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {createPostForm.content.length}/1500 characters
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="post-type">Type</Label>
                <Select 
                  value={createPostForm.type} 
                  onValueChange={(value) => setCreatePostForm(prev => ({ ...prev, type: value }))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="event">Event</SelectItem>
                    <SelectItem value="offer">Offer</SelectItem>
                    <SelectItem value="product">Product</SelectItem>
                    <SelectItem value="update">Update</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="post-location">Location</Label>
                <Select 
                  value={createPostForm.location} 
                  onValueChange={(value) => setCreatePostForm(prev => ({ ...prev, location: value }))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    {finalLocations.map((location: any) => (
                      <SelectItem key={location.id} value={location.id}>
                        {location.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {/* Event-specific fields */}
            {createPostForm.type === 'event' && (
              <div className="space-y-4 border-t pt-4 bg-gray-50/50 p-4 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900">Event Details</h3>
                <div>
                  <Label htmlFor="event-title">Event Title *</Label>
                  <Input 
                    id="event-title" 
                    placeholder="Enter event title..."
                    className="mt-1"
                    value={createPostForm.eventTitle}
                    onChange={(e) => setCreatePostForm(prev => ({ ...prev, eventTitle: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="event-start-date">Start Date *</Label>
                    <Input 
                      id="event-start-date" 
                      type="date"
                      className="mt-1"
                      value={createPostForm.eventStartDate}
                      onChange={(e) => setCreatePostForm(prev => ({ ...prev, eventStartDate: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="event-end-date">End Date</Label>
                    <Input 
                      id="event-end-date" 
                      type="date"
                      className="mt-1"
                      value={createPostForm.eventEndDate}
                      onChange={(e) => setCreatePostForm(prev => ({ ...prev, eventEndDate: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="event-start-time">Start Time</Label>
                    <Input 
                      id="event-start-time" 
                      type="time"
                      className="mt-1"
                      value={createPostForm.eventStartTime}
                      onChange={(e) => setCreatePostForm(prev => ({ ...prev, eventStartTime: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="event-end-time">End Time</Label>
                    <Input 
                      id="event-end-time" 
                      type="time"
                      className="mt-1"
                      value={createPostForm.eventEndTime}
                      onChange={(e) => setCreatePostForm(prev => ({ ...prev, eventEndTime: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="post-cta">Call to Action (Optional)</Label>
                <Input 
                  id="post-cta" 
                  placeholder="e.g., Book Now, Order, Shop, Learn More, Sign Up, Call"
                  className="mt-1"
                  value={createPostForm.cta}
                  onChange={(e) => setCreatePostForm(prev => ({ ...prev, cta: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Valid options: Book Now, Order, Shop, Learn More, Sign Up, Call
                </p>
              </div>
              <div>
                <Label htmlFor="post-cta-url">CTA URL (Optional)</Label>
                <Input 
                  id="post-cta-url" 
                  placeholder="https://example.com"
                  className="mt-1"
                  value={createPostForm.ctaUrl}
                  onChange={(e) => setCreatePostForm(prev => ({ ...prev, ctaUrl: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Required for most action types (except Call)
                </p>
              </div>
            </div>
            <div>
              <Label>Image (Optional)</Label>
              <div className="mt-1 border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-gray-400 transition-colors">
                <div className="text-center">
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="mt-4">
                    <Button variant="outline" size="sm" type="button">
                      <Upload className="mr-2 h-4 w-4" />
                      Upload Image
                    </Button>
                  </div>
                  <p className="mt-2 text-sm text-gray-500">
                    PNG, JPG, GIF up to 10MB
                  </p>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="flex-shrink-0 border-t pt-4 mt-4">
            <Button variant="outline" onClick={handleCloseCreatePostModal}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreatePostSubmit}
              disabled={isCreating}
            >
              {isCreating ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Create Post
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Post Modal */}
      <Dialog open={editPostModal.open} onOpenChange={(open) => !open && handleCloseEditPostModal()}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Edit Post</DialogTitle>
            <DialogDescription>
              Edit your Google My Business post
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            <div>
              <Label htmlFor="edit-post-title">Title</Label>
              <Input 
                id="edit-post-title" 
                placeholder="Enter post title..."
                className="mt-1"
                value={editPostForm.title}
                onChange={(e) => setEditPostForm(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="edit-post-content">Content</Label>
              <Textarea 
                id="edit-post-content" 
                placeholder="Write your post content..."
                className="mt-1 min-h-[100px] resize-y"
                rows={4}
                value={editPostForm.content}
                onChange={(e) => setEditPostForm(prev => ({ ...prev, content: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {editPostForm.content.length}/1500 characters
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-post-type">Type</Label>
                <Select 
                  value={editPostForm.type} 
                  onValueChange={(value) => setEditPostForm(prev => ({ ...prev, type: value }))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="event">Event</SelectItem>
                    <SelectItem value="offer">Offer</SelectItem>
                    <SelectItem value="product">Product</SelectItem>
                    <SelectItem value="update">Update</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-post-location">Location</Label>
                <Select 
                  value={editPostForm.location} 
                  onValueChange={(value) => setEditPostForm(prev => ({ ...prev, location: value }))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    {finalLocations.map((location: any) => (
                      <SelectItem key={location.id} value={location.id}>
                        {location.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {/* Event-specific fields */}
            {editPostForm.type === 'event' && (
              <div className="space-y-4 border-t pt-4 bg-gray-50/50 p-4 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900">Event Details</h3>
                <div>
                  <Label htmlFor="edit-event-title">Event Title *</Label>
                  <Input 
                    id="edit-event-title" 
                    placeholder="Enter event title..."
                    className="mt-1"
                    value={editPostForm.eventTitle}
                    onChange={(e) => setEditPostForm(prev => ({ ...prev, eventTitle: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-event-start-date">Start Date *</Label>
                    <Input 
                      id="edit-event-start-date" 
                      type="date"
                      className="mt-1"
                      value={editPostForm.eventStartDate}
                      onChange={(e) => setEditPostForm(prev => ({ ...prev, eventStartDate: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-event-end-date">End Date</Label>
                    <Input 
                      id="edit-event-end-date" 
                      type="date"
                      className="mt-1"
                      value={editPostForm.eventEndDate}
                      onChange={(e) => setEditPostForm(prev => ({ ...prev, eventEndDate: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-event-start-time">Start Time</Label>
                    <Input 
                      id="edit-event-start-time" 
                      type="time"
                      className="mt-1"
                      value={editPostForm.eventStartTime}
                      onChange={(e) => setEditPostForm(prev => ({ ...prev, eventStartTime: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-event-end-time">End Time</Label>
                    <Input 
                      id="edit-event-end-time" 
                      type="time"
                      className="mt-1"
                      value={editPostForm.eventEndTime}
                      onChange={(e) => setEditPostForm(prev => ({ ...prev, eventEndTime: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-post-cta">Call to Action (Optional)</Label>
                <Input 
                  id="edit-post-cta" 
                  placeholder="e.g., Book Now, Order, Shop, Learn More, Sign Up, Call"
                  className="mt-1"
                  value={editPostForm.cta}
                  onChange={(e) => setEditPostForm(prev => ({ ...prev, cta: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Valid options: Book Now, Order, Shop, Learn More, Sign Up, Call
                </p>
              </div>
              <div>
                <Label htmlFor="edit-post-cta-url">CTA URL (Optional)</Label>
                <Input 
                  id="edit-post-cta-url" 
                  placeholder="https://example.com"
                  className="mt-1"
                  value={editPostForm.ctaUrl}
                  onChange={(e) => setEditPostForm(prev => ({ ...prev, ctaUrl: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Required for most action types (except Call)
                </p>
              </div>
            </div>
            <div>
              <Label>Image (Optional)</Label>
              <div className="mt-1 border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-gray-400 transition-colors">
                <div className="text-center">
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="mt-4">
                    <Button variant="outline" size="sm" type="button">
                      <Upload className="mr-2 h-4 w-4" />
                      Upload Image
                    </Button>
                  </div>
                  <p className="mt-2 text-sm text-gray-500">
                    PNG, JPG, GIF up to 10MB
                  </p>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="flex-shrink-0 border-t pt-4 mt-4">
            <Button variant="outline" onClick={handleCloseEditPostModal}>
              Cancel
            </Button>
            <Button 
              onClick={handleEditPostSubmit}
              disabled={isUpdating}
            >
              {isUpdating ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Update Post
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Post Modal */}
      <Dialog open={deletePostModal.open} onOpenChange={(open) => setDeletePostModal({ open, post: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Post</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this post? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {deletePostModal.post && (
            <div className="space-y-2">
              <p className="font-medium">{deletePostModal.post.title}</p>
              <p className="text-sm text-muted-foreground">{deletePostModal.post.content}</p>
            </div>
          )}
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setDeletePostModal({ open: false, post: null })}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmDeletePost}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Post
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
