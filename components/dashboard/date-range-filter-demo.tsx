"use client"

import { useState } from "react"
import { DateRangeFilterEnhanced } from "./date-range-filter-enhanced"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, BarChart3 } from "lucide-react"

export function DateRangeFilterDemo() {
  const [selectedDateRange, setSelectedDateRange] = useState<number | undefined>()
  const [startDate, setStartDate] = useState<string>("")
  const [endDate, setEndDate] = useState<string>("")

  const handleClear = () => {
    setSelectedDateRange(undefined)
    setStartDate("")
    setEndDate("")
  }

  return (
    <div className="space-y-6 p-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-gray-900">Enhanced Date Range Filter</h1>
        <p className="text-gray-600">A powerful and beautiful date range filter built with shadcn UI</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Full Featured Version */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Full Featured Version
            </CardTitle>
            <CardDescription>
              Complete date range filter with all features enabled
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DateRangeFilterEnhanced
              selectedDateRange={selectedDateRange}
              startDate={startDate}
              endDate={endDate}
              onDateRangeChange={setSelectedDateRange}
              onStartDateChange={setStartDate}
              onEndDateChange={setEndDate}
              onClear={handleClear}
              showPresets={true}
              showCustomRange={true}
            />
          </CardContent>
        </Card>

        {/* Compact Version */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Compact Version
            </CardTitle>
            <CardDescription>
              Space-efficient version for toolbars and headers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DateRangeFilterEnhanced
              selectedDateRange={selectedDateRange}
              startDate={startDate}
              endDate={endDate}
              onDateRangeChange={setSelectedDateRange}
              onStartDateChange={setStartDate}
              onEndDateChange={setEndDate}
              onClear={handleClear}
              compact={true}
              showPresets={true}
              showCustomRange={true}
            />
          </CardContent>
        </Card>
      </div>

      {/* Current State Display */}
      <Card>
        <CardHeader>
          <CardTitle>Current Filter State</CardTitle>
          <CardDescription>
            Real-time display of the current filter values
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Selected Date Range:</span>
              <Badge variant={selectedDateRange ? "default" : "secondary"}>
                {selectedDateRange ? `${selectedDateRange} days` : "None"}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Start Date:</span>
              <Badge variant={startDate ? "default" : "secondary"}>
                {startDate || "Not set"}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">End Date:</span>
              <Badge variant={endDate ? "default" : "secondary"}>
                {endDate || "Not set"}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Has Active Filter:</span>
              <Badge variant={selectedDateRange || (startDate && endDate) ? "default" : "secondary"}>
                {selectedDateRange || (startDate && endDate) ? "Yes" : "No"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Features List */}
      <Card>
        <CardHeader>
          <CardTitle>Features</CardTitle>
          <CardDescription>
            What makes this date range filter special
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">UI/UX Features</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Beautiful gradient designs</li>
                <li>• Smooth animations and transitions</li>
                <li>• Responsive design</li>
                <li>• Hover effects and micro-interactions</li>
                <li>• Visual feedback for active states</li>
                <li>• Compact mode for space-constrained layouts</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Functionality</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Quick preset ranges (1d, 7d, 30d, 90d, 180d, 365d)</li>
                <li>• Smart presets (Yesterday, This Week, etc.)</li>
                <li>• Custom date range picker with 2-month view</li>
                <li>• Real-time state management</li>
                <li>• Clear and reset functionality</li>
                <li>• Keyboard navigation support</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

