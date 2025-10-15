"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar, X } from "lucide-react"

interface DateRangeFilterProps {
  startDate: string
  endDate: string
  onStartDateChange: (date: string) => void
  onEndDateChange: (date: string) => void
  onClear: () => void
  className?: string
}

export function DateRangeFilter({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onClear,
  className = ""
}: DateRangeFilterProps) {
  const [isOpen, setIsOpen] = useState(false)

  // Set default 30-day range if no dates are set
  React.useEffect(() => {
    if (!startDate && !endDate) {
      handleQuickSelect(30)
    }
  }, [startDate, endDate])

  const handleQuickSelect = (days: number) => {
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    
    const startDateStr = startDate.toISOString().split('T')[0]
    const endDateStr = endDate.toISOString().split('T')[0]
    
    console.log('🔍 DateRangeFilter - Quick select:', { days, startDateStr, endDateStr })
    
    onStartDateChange(startDateStr)
    onEndDateChange(endDateStr)
  }

  const formatDateForDisplay = (dateString: string) => {
    if (!dateString) return ""
    return new Date(dateString).toLocaleDateString()
  }

  const hasActiveFilter = startDate || endDate

  // Determine which quick select button should be highlighted
  const getActiveDays = () => {
    if (!startDate || !endDate) return null
    
    const start = new Date(startDate)
    const end = new Date(endDate)
    const diffTime = Math.abs(end.getTime() - start.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    // Check if it matches one of our predefined ranges (with 1-day tolerance)
    if (Math.abs(diffDays - 7) <= 1) return 7
    if (Math.abs(diffDays - 30) <= 1) return 30
    if (Math.abs(diffDays - 90) <= 1) return 90
    if (Math.abs(diffDays - 365) <= 1) return 365
    
    return null
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Date Range Filter
          </CardTitle>
          {hasActiveFilter && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClear}
              className="h-6 w-6 p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick Select Buttons */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant={getActiveDays() === 7 ? "default" : "outline"}
            size="sm"
            onClick={() => handleQuickSelect(7)}
            className="text-xs"
          >
            7 Days
          </Button>
          <Button
            variant={getActiveDays() === 30 ? "default" : "outline"}
            size="sm"
            onClick={() => handleQuickSelect(30)}
            className="text-xs"
          >
            30 Days
          </Button>
          <Button
            variant={getActiveDays() === 90 ? "default" : "outline"}
            size="sm"
            onClick={() => handleQuickSelect(90)}
            className="text-xs"
          >
            90 Days
          </Button>
          <Button
            variant={getActiveDays() === 365 ? "default" : "outline"}
            size="sm"
            onClick={() => handleQuickSelect(365)}
            className="text-xs"
          >
            1 Year
          </Button>
        </div>

        {/* Custom Date Inputs */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="start-date" className="text-xs text-muted-foreground">
              From Date
            </Label>
            <Input
              id="start-date"
              type="date"
              value={startDate}
              onChange={(e) => {
                console.log('🔍 DateRangeFilter - Start date changed:', e.target.value)
                onStartDateChange(e.target.value)
              }}
              className="h-8 text-xs"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="end-date" className="text-xs text-muted-foreground">
              To Date
            </Label>
            <Input
              id="end-date"
              type="date"
              value={endDate}
              onChange={(e) => {
                console.log('🔍 DateRangeFilter - End date changed:', e.target.value)
                onEndDateChange(e.target.value)
              }}
              className="h-8 text-xs"
            />
          </div>
        </div>

        {/* Active Filter Display */}
        {hasActiveFilter && (
          <div className="text-xs text-muted-foreground">
            <span className="font-medium">Active:</span>{" "}
            {startDate && formatDateForDisplay(startDate)}
            {startDate && endDate && " - "}
            {endDate && formatDateForDisplay(endDate)}
            {startDate && !endDate && " onwards"}
            {!startDate && endDate && " up to " + formatDateForDisplay(endDate)}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
