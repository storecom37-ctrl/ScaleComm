"use client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { 
  LayoutDashboard, 
  Store, 
  Palette, 
  MessageSquare, 
  Mail, 
  FileText, 
  Phone, 
  Bot, 
  TrendingUp, 
  FileSearch,
  Search,
  Bell,
  Settings,
  User,
  Crown,
  BarChart3
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

const navigationItems = [
  {
    title: "Overview",
    href: "/dashboard/overview",
    icon: LayoutDashboard,
    active: true
  },
  {
    title: "Brand",
    href: "/dashboard/brand",
    icon: Palette
  },
  {
    title: "Stores",
    href: "/dashboard/stores",
    icon: Store
  },
  {
    title: "Reviews",
    href: "/dashboard/reviews",
    icon: MessageSquare
  },
  {
    title: "Enquiries",
    href: "/dashboard/enquiries",
    icon: Mail
  },
  {
    title: "GMB Post",
    href: "/dashboard/gmb-post",
    icon: FileText
  },
  {
    title: "IVR Calls",
    href: "/dashboard/ivr-calls",
    icon: Phone
  },
  {
    title: "Content AI",
    href: "/dashboard/content-ai",
    icon: Bot,
    badge: "Coming Soon"
  },
  {
    title: "Rank Tracker",
    href: "/dashboard/rank-tracker",
    icon: TrendingUp,
    badge: "Coming Soon"
  },
  // {
  //   title: "Performance",
  //   href: "/dashboard/performance",
  //   icon: BarChart3
  // },
  {
    title: "Audits",
    href: "/dashboard/audits",
    icon: FileSearch,
    badge: "Coming Soon"
  }
]

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname()

  return (
    <div className={cn("pb-12", className)}>
      <div className="space-y-4 py-4">
        {/* Logo */}
        <div className="px-3 py-2">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Store className="h-5 w-5 text-white" />
            </div>
            <h2 className="text-lg font-semibold tracking-tight">
              Storecom
            </h2>
          </div>
        </div>

        {/* Navigation */}
        <div className="px-3">
          <div className="space-y-1">
            {navigationItems.map((item) => {
              const isActive = pathname === item.href || (pathname === "/dashboard" && item.href === "/dashboard/overview")
              return (
                <Button
                  key={item.href}
                  variant={isActive ? "secondary" : "ghost"}
                  className={cn(
                    "w-full justify-start",
                    isActive && "bg-muted font-medium"
                  )}
                  asChild
                >
                  <Link href={item.href}>
                    <item.icon className="mr-2 h-4 w-4" />
                    {item.title}
                    {item.badge && (
                      <Badge variant="secondary" className="ml-auto text-xs">
                        {item.badge}
                      </Badge>
                    )}
                  </Link>
                </Button>
              )
            })}
          </div>
        </div>

        <Separator />

        {/* Upgrade Section */}
        <div className="px-3">
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg p-4 text-white">
            <div className="flex items-center space-x-2 mb-2">
              <Crown className="h-4 w-4" />
              <span className="text-sm font-medium">Upgrade to Pro</span>
            </div>
            <p className="text-xs text-orange-100 mb-3">
              Unlock AI features and advanced analytics.
            </p>
            <Button size="sm" className="w-full bg-white text-orange-600 hover:bg-orange-50">
              Upgrade
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
