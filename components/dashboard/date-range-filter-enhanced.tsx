"use client"

import { useState, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import { 
  CalendarIcon, 
  Filter, 
  X, 
  Clock, 
  TrendingUp, 
  Calendar as CalendarLucide, 
  Check,
  ChevronDown,
  RotateCcw,
  Sparkles,
  BarChart3,
  Target,
  Zap
} from "lucide-react"
import { format, subDays, subWeeks, subMonths, subQuarters, startOfDay, endOfDay, isToday, isYesterday, isThisWeek, isThisMonth } from "date-fns"
import { cn } from "@/lib/utils"
import { DateRange } from "react-day-picker"

interface DateRangeFilterEnhancedProps {
  selectedDateRange?: number // 7, 30, 90, 180, 365
  startDate?: string
  endDate?: string
  onDateRangeChange: (days: number | undefined) => void
  onStartDateChange: (date: string) => void
  onEndDateChange: (date: string) => void
  onClear: () => void
  className?: string
  showPresets?: boolean
  showCustomRange?: boolean
  compact?: boolean
}

const predefinedRanges = [
  { 
    days: 1, 
    label: "Today", 
    description: "Current day",
    icon: Zap,
    color: "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100",
    activeColor: "bg-emerald-500 border-emerald-500 text-white hover:bg-emerald-600",
    category: "quick"
  },
  { 
    days: 7, 
    label: "7 Days", 
    description: "Past week",
    icon: Clock,
    color: "bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100",
    activeColor: "bg-blue-500 border-blue-500 text-white hover:bg-blue-600",
    category: "quick"
  },
  { 
    days: 30, 
    label: "30 Days", 
    description: "Past month",
    icon: TrendingUp,
    color: "bg-green-50 border-green-200 text-green-700 hover:bg-green-100",
    activeColor: "bg-green-500 border-green-500 text-white hover:bg-green-600",
    category: "standard"
  },
  { 
    days: 90, 
    label: "90 Days", 
    description: "Past quarter",
    icon: BarChart3,
    color: "bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100",
    activeColor: "bg-orange-500 border-orange-500 text-white hover:bg-orange-600",
    category: "standard"
  },
  { 
    days: 180, 
    label: "6 Months", 
    description: "Past 6 months",
    icon: CalendarLucide,
    color: "bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100",
    activeColor: "bg-purple-500 border-purple-500 text-white hover:bg-purple-600",
    category: "extended"
  },
  { 
    days: 365, 
    label: "1 Year", 
    description: "Past year",
    icon: Target,
    color: "bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100",
    activeColor: "bg-indigo-500 border-indigo-500 text-white hover:bg-indigo-600",
    category: "extended"
  }
]

const quickPresets = [
  { label: "Yesterday", getDates: () => ({ start: subDays(new Date(), 1), end: subDays(new Date(), 1) }) },
  { label: "This Week", getDates: () => ({ start: startOfDay(subDays(new Date(), 7)), end: endOfDay(new Date()) }) },
  { label: "Last Week", getDates: () => ({ start: startOfDay(subWeeks(new Date(), 1)), end: endOfDay(subDays(new Date(), 1)) }) },
  { label: "This Month", getDates: () => ({ start: startOfDay(subMonths(new Date(), 1)), end: endOfDay(new Date()) }) },
  { label: "Last Month", getDates: () => ({ start: startOfDay(subMonths(new Date(), 2)), end: endOfDay(subMonths(new Date(), 1)) }) },
  { label: "Last 3 Months", getDates: () => ({ start: startOfDay(subMonths(new Date(), 3)), end: endOfDay(new Date()) }) },
]

export function DateRangeFilterEnhanced({
  selectedDateRange,
  startDate,
  endDate,
  onDateRangeChange,
  onStartDateChange,
  onEndDateChange,
  onClear,
  className = "",
  showPresets = true,
  showCustomRange = true,
  compact = false
}: DateRangeFilterEnhancedProps) {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const [isPresetsOpen, setIsPresetsOpen] = useState(false)
  const [selectedRange, setSelectedRange] = useState<DateRange | undefined>(() => {
    if (startDate && endDate) {
      return {
        from: new Date(startDate),
        to: new Date(endDate)
      }
    }
    return undefined
  })

  // Update selectedRange when props change
  useMemo(() => {
    if (startDate && endDate) {
      setSelectedRange({
        from: new Date(startDate),
        to: new Date(endDate)
      })
    } else {
      setSelectedRange(undefined)
    }
  }, [startDate, endDate])

  const handlePredefinedRangeClick = useCallback((days: number) => {
    onDateRangeChange(days)
    // Clear custom dates when selecting predefined range
    onStartDateChange("")
    onEndDateChange("")
    setSelectedRange(undefined)
  }, [onDateRangeChange, onStartDateChange, onEndDateChange])

  const handlePresetClick = useCallback((preset: typeof quickPresets[0]) => {
    const { start, end } = preset.getDates()
    onStartDateChange(start.toISOString().split('T')[0])
    onEndDateChange(end.toISOString().split('T')[0])
    onDateRangeChange(undefined) // Clear predefined range
    setSelectedRange({ from: start, to: end })
    setIsPresetsOpen(false)
  }, [onStartDateChange, onEndDateChange, onDateRangeChange])

  const handleCustomDateSelect = useCallback((range: DateRange | undefined) => {
    setSelectedRange(range)
    if (range?.from) {
      onStartDateChange(range.from.toISOString().split('T')[0])
    } else {
      onStartDateChange("")
    }
    if (range?.to) {
      onEndDateChange(range.to.toISOString().split('T')[0])
    } else {
      onEndDateChange("")
    }
    if (range?.from && range?.to) {
      onDateRangeChange(undefined) // Clear predefined range
      setIsCalendarOpen(false)
    }
  }, [onStartDateChange, onEndDateChange, onDateRangeChange])

  const getActiveRangeLabel = useCallback(() => {
    if (selectedDateRange) {
      const range = predefinedRanges.find(r => r.days === selectedDateRange)
      return range?.label || `${selectedDateRange} days`
    }
    if (startDate && endDate) {
      const start = new Date(startDate)
      const end = new Date(endDate)
      if (isToday(start) && isToday(end)) return "Today"
      if (isYesterday(start) && isYesterday(end)) return "Yesterday"
      return `${format(start, 'MMM dd')} - ${format(end, 'MMM dd')}`
    }
    if (startDate) {
      return `${format(new Date(startDate), 'MMM dd')} - Select end date`
    }
    return "Select date range"
  }, [selectedDateRange, startDate, endDate])

  const hasActiveFilter = selectedDateRange || (startDate && endDate)

  const groupedRanges = useMemo(() => {
    const groups = {
      quick: predefinedRanges.filter(r => r.category === 'quick'),
      standard: predefinedRanges.filter(r => r.category === 'standard'),
      extended: predefinedRanges.filter(r => r.category === 'extended')
    }
    return groups
  }, [])

  if (compact) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-9 px-3 text-sm font-medium transition-all duration-200",
                hasActiveFilter 
                  ? "border-blue-300 bg-blue-50 text-blue-900 hover:border-blue-400" 
                  : "border-gray-200 hover:border-blue-300"
              )}
            >
              <CalendarIcon className="h-4 w-4 mr-2" />
              {getActiveRangeLabel()}
              <ChevronDown className="h-3 w-3 ml-2" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <div className="p-4 space-y-4">
              {showPresets && (
                <div className="space-y-2">
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Quick Presets</div>
                  <div className="grid grid-cols-2 gap-1">
                    {quickPresets.map((preset) => (
                      <Button
                        key={preset.label}
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs justify-start"
                        onClick={() => handlePresetClick(preset)}
                      >
                        {preset.label}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
              {showCustomRange && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Custom Range</div>
                    <Calendar
                      mode="range"
                      selected={selectedRange}
                      onSelect={handleCustomDateSelect}
                      numberOfMonths={1}
                      className="rounded-md"
                    />
                  </div>
                </>
              )}
            </div>
          </PopoverContent>
        </Popover>
        
        {hasActiveFilter && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="h-9 w-9 p-0 hover:bg-red-100 hover:text-red-600"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    )
  }

  return (
    <Card className={cn("w-full border border-gray-200 shadow-sm bg-white hover:shadow-md transition-all duration-200", className)}>
      <CardHeader className="pb-4">
        <CardTitle className="text-base font-semibold flex items-center gap-3 text-gray-900">
          <div className="p-2 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
            <Filter className="h-4 w-4 text-blue-600" />
          </div>
          <div>
            <div>Date Range Filter</div>
            <CardDescription className="text-xs text-gray-500 mt-1">
              Filter performance data by time period
            </CardDescription>
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Quick Presets */}
        {showPresets && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-gray-500" />
                Quick Presets
              </label>
              <Popover open={isPresetsOpen} onOpenChange={setIsPresetsOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 text-xs">
                    More presets
                    <ChevronDown className="h-3 w-3 ml-1" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-3" align="end">
                  <div className="space-y-2">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Smart Presets</div>
                    {quickPresets.map((preset) => (
                      <Button
                        key={preset.label}
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start h-8 text-xs"
                        onClick={() => handlePresetClick(preset)}
                      >
                        {preset.label}
                      </Button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        )}

        {/* Predefined Ranges */}
        <div className="space-y-4">
          {Object.entries(groupedRanges).map(([category, ranges]) => (
            ranges.length > 0 && (
              <div key={category} className="space-y-3">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-500" />
                  {category === 'quick' ? 'Quick Filters' : 
                   category === 'standard' ? 'Standard Ranges' : 'Extended Ranges'}
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {ranges.map((range) => {
                    const Icon = range.icon
                    const isActive = selectedDateRange === range.days
                    return (
                      <Button
                        key={range.days}
                        variant="outline"
                        size="sm"
                        className={cn(
                          "h-auto py-3 px-4 text-sm font-medium transition-all duration-200 border-2 group relative overflow-hidden",
                          isActive ? range.activeColor : range.color,
                          "hover:scale-[1.02] hover:shadow-md active:scale-[0.98]"
                        )}
                        onClick={() => handlePredefinedRangeClick(range.days)}
                      >
                        <div className="flex items-center gap-3 w-full relative z-10">
                          <div className={cn(
                            "p-1.5 rounded-md transition-colors",
                            isActive ? "bg-white/20" : "bg-white/50"
                          )}>
                            <Icon className="h-4 w-4 flex-shrink-0" />
                          </div>
                          <div className="text-left flex-1">
                            <div className="font-semibold">{range.label}</div>
                            <div className="text-xs opacity-80">{range.description}</div>
                          </div>
                          {isActive && (
                            <div className="flex items-center gap-1">
                              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                              <Check className="h-3 w-3" />
                            </div>
                          )}
                        </div>
                        {isActive && (
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse"></div>
                        )}
                      </Button>
                    )
                  })}
                </div>
              </div>
            )
          ))}
        </div>

        {/* Custom Date Range */}
        {showCustomRange && (
          <>
            <Separator />
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-gray-500" />
                Custom Range
              </label>
              <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal h-12 border-2 transition-all duration-200 group",
                      hasActiveFilter 
                        ? "border-blue-300 bg-blue-50 text-blue-900 hover:border-blue-400 hover:bg-blue-100" 
                        : "border-gray-200 hover:border-blue-300 hover:bg-gray-50",
                      !startDate && !endDate && "text-gray-500"
                    )}
                  >
                    <div className="flex items-center gap-3 w-full">
                      <div className={cn(
                        "p-1.5 rounded-md transition-colors",
                        hasActiveFilter ? "bg-blue-100" : "bg-gray-100 group-hover:bg-blue-100"
                      )}>
                        <CalendarIcon className="h-4 w-4 text-gray-600" />
                      </div>
                      <span className="text-sm font-medium">{getActiveRangeLabel()}</span>
                      {hasActiveFilter && (
                        <div className="ml-auto">
                          <Check className="h-4 w-4 text-blue-600" />
                        </div>
                      )}
                    </div>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 shadow-xl border border-gray-200" align="start">
                  <div className="p-4">
                    <Calendar
                      mode="range"
                      selected={selectedRange}
                      onSelect={handleCustomDateSelect}
                      initialFocus
                      className="rounded-lg"
                      numberOfMonths={2}
                    />
                  </div>
                </PopoverContent>
              </Popover>
              
              {/* Selected Dates Display */}
              {(startDate || endDate) && (
                <div className="flex flex-wrap items-center gap-2 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                  {startDate && (
                    <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800 border-blue-200 font-medium">
                      <CalendarIcon className="h-3 w-3 mr-1" />
                      From: {format(new Date(startDate), 'MMM dd, yyyy')}
                    </Badge>
                  )}
                  {endDate && (
                    <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800 border-blue-200 font-medium">
                      <CalendarIcon className="h-3 w-3 mr-1" />
                      To: {format(new Date(endDate), 'MMM dd, yyyy')}
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {/* Active Filter Display */}
        {hasActiveFilter && (
          <div className="flex items-center justify-between pt-4 border-t border-gray-200 bg-gradient-to-r from-green-50 via-blue-50 to-indigo-50 -mx-6 px-6 py-4 rounded-b-lg">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <Badge variant="default" className="text-xs bg-green-100 text-green-800 border-green-200 font-medium">
                {selectedDateRange ? `${selectedDateRange} days active` : "Custom range active"}
              </Badge>
              <span className="text-xs text-gray-600 font-medium">
                Data filtering applied
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  onClear()
                  setSelectedRange(undefined)
                }}
                className="h-8 w-8 p-0 hover:bg-red-100 hover:text-red-600 transition-colors rounded-full"
                title="Clear filter"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClear}
                className="h-8 w-8 p-0 hover:bg-red-100 hover:text-red-600 transition-colors rounded-full"
                title="Remove filter"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}