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
    <Card className={cn("", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      </CardHeader>
      <CardContent>
        {renderValue()}
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
        {trend && !isLoading && !isEmpty && (
          <div className="flex items-center pt-1">
            <Badge
              variant={trend.isPositive ? "default" : "destructive"}
              className="text-xs"
            >
              {trend.isPositive ? "+" : "-"}{Math.abs(trend.value)}%
            </Badge>
            <span className="text-xs text-muted-foreground ml-2">
              from last month
            </span>
          </div>
        )}
        {children}
      </CardContent>
    </Card>
  )
}
