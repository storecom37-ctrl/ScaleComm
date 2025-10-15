"use client"

import { Search, Bell, Settings, User, ChevronRight, Home, LogOut, HelpCircle, Zap, RefreshCw } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { GmbConnectButton } from "@/components/dashboard/gmb-connect-button"
import { useGmbData, useCurrentUser } from "@/lib/hooks/use-gmb-data"
import { useGmbStore } from "@/lib/stores/gmb-store"
import { useGmbSync } from "@/lib/hooks/use-gmb-sync"
import { useGmbAuth } from "@/lib/hooks/use-gmb-auth"
import { useAuth } from "@/lib/hooks/use-auth"

// Helper function to get page title from pathname
function getPageTitle(pathname: string): string {
  const segments = pathname.split('/').filter(Boolean)
  if (segments.length < 2) return 'Dashboard'
  
  const page = segments[segments.length - 1]
  return page.charAt(0).toUpperCase() + page.slice(1).replace(/-/g, ' ')
}

// Helper function to generate breadcrumbs
function generateBreadcrumbs(pathname: string) {
  const segments = pathname.split('/').filter(Boolean)
  const breadcrumbs = []
  
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i]
    const path = '/' + segments.slice(0, i + 1).join('/')
    const title = segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ')
    
    breadcrumbs.push({
      title,
      path,
      isLast: i === segments.length - 1
    })
  }
  
  return breadcrumbs
}

export function Header() {
  const pathname = usePathname()
  const pageTitle = getPageTitle(pathname)
  const breadcrumbs = generateBreadcrumbs(pathname)
  
  // GMB connection state
  const { isConnected: dbConnected } = useGmbData()
  const { isSyncing } = useGmbStore()
  const { syncGmbData } = useGmbSync()
  const { getStoredTokens } = useGmbAuth()
  
  // Get current user data from new auth system
  const { user: authUser, loading: authLoading, logout } = useAuth()
  
  // Get GMB user data (for GMB integration)
  const { user: gmbUser, isLoading: gmbUserLoading } = useCurrentUser()
  
  // Use auth user data if available, otherwise fall back to GMB user
  const currentUser = authUser || gmbUser
  const userLoading = authLoading || gmbUserLoading
  
  // Handle sync
  const handleSync = async () => {
    const tokens = await getStoredTokens()
    if (tokens) {
      await syncGmbData(tokens)
    }
  }
  
  // Helper function to get user initials
  const getUserInitials = (user: any) => {
    if (!user) return 'U'
    if (user.given_name && user.family_name) {
      return `${user.given_name[0]}${user.family_name[0]}`.toUpperCase()
    }
    if (user.name) {
      const names = user.name.split(' ')
      if (names.length >= 2) {
        return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase()
      }
      return names[0][0].toUpperCase()
    }
    if (user.email) {
      return user.email[0].toUpperCase()
    }
    return 'U'
  }
  
  // Get display name
  const getDisplayName = (user: any) => {
    if (!user) return 'User'
    return user.name || user.given_name || user.email?.split('@')[0] || 'User'
  }
  
  // Get display email
  const getDisplayEmail = (user: any) => {
    return user?.email || 'No email'
  }
  
  // Get role badge
  const getRoleBadge = (role: string | undefined) => {
    if (!role) return 'User'
    return role.replace('_', ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
  }
  
  // Handle logout
  const handleLogout = async () => {
    await logout()
  }
  
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center justify-between px-6">
        {/* Left side - Breadcrumbs and Page Title */}
        <div className="flex items-center space-x-4">
          <div className="flex flex-col">
            {/* Breadcrumbs */}
            <nav className="flex items-center space-x-1 text-sm text-muted-foreground mb-1">
              <Link href="/" className="hover:text-foreground transition-colors">
                <Home className="h-3 w-3" />
              </Link>
              {breadcrumbs.map((crumb, index) => (
                <div key={crumb.path} className="flex items-center space-x-1">
                  <ChevronRight className="h-3 w-3" />
                  {crumb.isLast ? (
                    <span className="text-foreground font-medium">{crumb.title}</span>
                  ) : (
                    <Link 
                      href={crumb.path} 
                      className="hover:text-foreground transition-colors"
                    >
                      {crumb.title}
                    </Link>
                  )}
                </div>
              ))}
            </nav>
            
            {/* Page Title */}
            {/* <h1 className="text-md font-semibold text-foreground">Dashboard / {pageTitle}</h1> */}
          </div>
        </div>

        {/* Center - Search */}
        <div className="flex-1 max-w-md mx-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search stores, reviews, analytics..."
              className="pl-10 pr-4 h-10 bg-muted/50 border-0 focus-visible:bg-background focus-visible:ring-2 focus-visible:ring-ring transition-all duration-200"
            />
          </div>
        </div>

        {/* Right side - Actions and User */}
        <div className="flex items-center space-x-3">
          {/* Quick Actions */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-9 w-9 hover:bg-muted transition-colors"
            title="Help & Support"
          >
            <HelpCircle className="h-4 w-4" />
          </Button>

          {/* Notifications */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-9 w-9 relative hover:bg-muted transition-colors"
            title="Notifications"
          >
            <Bell className="h-4 w-4" />
            <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-red-500 hover:bg-red-600 border-2 border-background">
              3
            </Badge>
          </Button>

          {/* Settings */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-9 w-9 hover:bg-muted transition-colors"
            title="Settings"
          >
            <Settings className="h-4 w-4" />
          </Button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                className="relative h-9 w-9 rounded-full hover:bg-muted transition-colors"
              >
                <Avatar className="h-8 w-8 ring-2 ring-background">
                  <AvatarImage 
                    src={currentUser?.picture || "/avatars/01.png"} 
                    alt={getDisplayName(currentUser)} 
                  />
                  <AvatarFallback className="bg-primary text-primary-foreground font-medium">
                    {getUserInitials(currentUser)}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              className="w-64 p-2" 
              align="end" 
              forceMount
              sideOffset={8}
            >
              <DropdownMenuLabel className="font-normal p-3">
                <div className="flex items-center space-x-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage 
                      src={currentUser?.picture || "/avatars/01.png"} 
                      alt={getDisplayName(currentUser)} 
                    />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {getUserInitials(currentUser)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-semibold leading-none">
                      {userLoading ? 'Loading...' : getDisplayName(currentUser)}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {userLoading ? 'Loading...' : getDisplayEmail(currentUser)}
                    </p>
                    <Badge variant="secondary" className="w-fit text-xs mt-1">
                      <Zap className="mr-1 h-3 w-3" />
                      {authUser ? getRoleBadge(authUser.role) : (currentUser?.verified_email ? 'Verified' : 'Pro Plan')}
                    </Badge>
                  </div>
                </div>
              </DropdownMenuLabel>
              
              <DropdownMenuSeparator className="my-2" />
              
              <DropdownMenuItem className="p-3 cursor-pointer">
                <User className="mr-3 h-4 w-4" />
                <div className="flex flex-col">
                  <span className="text-sm">Profile</span>
                  <span className="text-xs text-muted-foreground">Manage your account</span>
                </div>
              </DropdownMenuItem>
              
              <DropdownMenuItem className="p-3 cursor-pointer">
                <Settings className="mr-3 h-4 w-4" />
                <div className="flex flex-col">
                  <span className="text-sm">Settings</span>
                  <span className="text-xs text-muted-foreground">Configure preferences</span>
                </div>
              </DropdownMenuItem>
              
              <DropdownMenuItem className="p-3 cursor-pointer">
                <HelpCircle className="mr-3 h-4 w-4" />
                <div className="flex flex-col">
                  <span className="text-sm">Help & Support</span>
                  <span className="text-xs text-muted-foreground">Get assistance</span>
                </div>
              </DropdownMenuItem>
              
              <DropdownMenuSeparator className="my-2" />
              
              <DropdownMenuItem 
                className="p-3 cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
                onClick={handleLogout}
              >
                <LogOut className="mr-3 h-4 w-4" />
                <span className="text-sm">Sign out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
