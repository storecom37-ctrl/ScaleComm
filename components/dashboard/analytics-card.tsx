import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn, formatLargeNumber, getResponsiveTextSize } from "@/lib/utils"
import { LucideIcon, Loader2 } from "lucide-react"

interface AnalyticsCardProps {
  title: string
  value: string | number
  description?: string
  icon?: LucideIcon
  trend?: {
    value: number
    isPositive: boolean
  }
  className?: string
  children?: React.ReactNode
  isLoading?: boolean
  isEmpty?: boolean
  valueClassName?: string
}

export function AnalyticsCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  className,
  children,
  isLoading = false,
  isEmpty = false,
  valueClassName
}: AnalyticsCardProps) {
  const renderValue = () => {
    if (isLoading) {
      return (
        <div className="flex items-center space-x-2">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          <span className="text-muted-foreground">Loading...</span>
        </div>
      )
    }
    
    if (isEmpty || value === "N/A" || value === "—") {
      return (
        <div className="text-2xl font-bold text-muted-foreground">—</div>
      )
    }
    
    // Format the value for better display
    const formattedValue = typeof value === 'number' 
      ? formatLargeNumber(value, { compact: true, maxLength: 10 })
      : (typeof value === 'string' ? value.replace(/e\+?\d+/i, '') : value)
    
    // Get responsive text size based on value length
    const textSizeClass = getResponsiveTextSize(formattedValue)
    
    return (
      <div 
        className={`${textSizeClass} font-bold number-responsive number-compact min-w-0 ${valueClassName || ''}`} 
        title={typeof value === 'number' ? value.toLocaleString() : value}
      >
        {formattedValue}
      </div>
    )
  }

  return (
    <div className={cn("bg-white rounded-lg p-6 shadow-sm border border-gray-200", className)}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 flex items-center">
            {Icon && <Icon className="h-4 w-4 mr-2" />}
            {title}
          </p>
          <div className="mt-2">
            {renderValue()}
          </div>
          {description && (
            <p className="text-xs text-gray-500 mt-1">{description}</p>
          )}
          {trend && !isLoading && !isEmpty && (
            <div className="flex items-center mt-2">
              <Badge
                variant={trend.isPositive ? "default" : "destructive"}
                className={`text-xs ${trend.isPositive ? 'bg-[#4285F4] hover:bg-[#3367D6] text-white' : ''}`}
              >
                {trend.isPositive ? "+" : "-"}{Math.abs(trend.value)}%
              </Badge>
              <span className="text-xs text-gray-500 ml-2">
                from last month
              </span>
            </div>
          )}
          {children}
        </div>
      </div>
    </div>
  )
}
