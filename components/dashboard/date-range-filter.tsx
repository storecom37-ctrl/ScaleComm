"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar, ChevronDown } from "lucide-react"

interface DateRangeFilterProps {
  selectedDays: number
  onDaysChange: (days: number) => void
  onClear: () => void
  className?: string
}

export function DateRangeFilter({
  selectedDays,
  onDaysChange,
  onClear,
  className = ""
}: DateRangeFilterProps) {
  const [isOpen, setIsOpen] = useState(false)

  const handleDaysSelect = (days: number) => {
    onDaysChange(days)
    setIsOpen(false)
  }

  const getDisplayText = () => {
    switch (selectedDays) {
      case 1: return "Past 1 days"
      case 7: return "Past 7 days"
      case 30: return "All Time"
      case 60: return "Past 60 days"
      case 90: return "Past 90 days"
      default: return "All Time"
    }
  }

  return (
    <div className={className}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-between border-blue-200 hover:border-blue-300"
          >
            <Calendar className="h-4 w-4" />
            {getDisplayText()}
            <ChevronDown className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="start">
          <div className="p-4">
            <h3 className="font-semibold text-sm mb-4">Duration</h3>
            
            <div className="space-y-3">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="radio"
                  name="duration"
                  value="all"
                  checked={selectedDays === 30}
                  onChange={() => handleDaysSelect(30)}
                  className="w-4 h-4 text-purple-600 border-gray-300 focus:ring-purple-500"
                />
                <span className="text-sm">All Time</span>
              </label>

              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="radio"
                  name="duration"
                  value="7"
                  checked={selectedDays === 1}
                  onChange={() => handleDaysSelect(1)}
                  className="w-4 h-4 text-purple-600 border-gray-300 focus:ring-purple-500"
                />
                <span className="text-sm">Past 1 day</span>
              </label>
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="radio"
                  name="duration"
                  value="7"
                  checked={selectedDays === 7}
                  onChange={() => handleDaysSelect(7)}
                  className="w-4 h-4 text-purple-600 border-gray-300 focus:ring-purple-500"
                />
                <span className="text-sm">Past 7 days</span>
              </label>
              
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="radio"
                  name="duration"
                  value="60"
                  checked={selectedDays === 60}
                  onChange={() => handleDaysSelect(60)}
                  className="w-4 h-4 text-purple-600 border-gray-300 focus:ring-purple-500"
                />
                <span className="text-sm">Past 60 days</span>
              </label>
              
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="radio"
                  name="duration"
                  value="90"
                  checked={selectedDays === 90}
                  onChange={() => handleDaysSelect(90)}
                  className="w-4 h-4 text-purple-600 border-gray-300 focus:ring-purple-500"
                />
                <span className="text-sm">Past 90 days</span>
              </label>
            </div>
            
            <Button 
              className="w-full mt-4 bg-purple-600 hover:bg-purple-700 text-white"
              onClick={() => setIsOpen(false)}
            >
              Apply Filter
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
