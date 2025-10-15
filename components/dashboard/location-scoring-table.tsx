"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { 
  Star, 
  MapPin, 
  Phone, 
  Globe, 
  MessageSquare,
  TrendingUp,
  Target
} from "lucide-react"
import { ScoringDetails } from "@/lib/utils/scoring"

interface LocationScoringData {
  locationId: string
  locationName: string
  address: string
  scoringDetails: ScoringDetails
  metrics: {
    averageRating: number
    totalReviews: number
    recentReviews: number
    responseRate: number
    impressions: number
    callClicks: number
    websiteClicks: number
  }
}

interface LocationScoringTableProps {
  locations: LocationScoringData[]
  isLoading?: boolean
}

export function LocationScoringTable({ locations, isLoading }: LocationScoringTableProps) {
  const getGradeColor = (grade: string) => {
    switch (grade.charAt(0)) {
      case 'A': return 'bg-green-100 text-green-800 border-green-200'
      case 'B': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'C': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'D': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'F': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600'
    if (score >= 80) return 'text-blue-600'
    if (score >= 70) return 'text-yellow-600'
    if (score >= 60) return 'text-orange-600'
    return 'text-red-600'
  }

  // Format address into shorter, two-line format
  const formatAddressShort = (address: string) => {
    if (!address) return { line1: '', line2: '' }
    
    // Split by comma
    const parts = address.split(',').map(p => p.trim())
    
    if (parts.length <= 2) {
      return { line1: parts[0] || '', line2: parts[1] || '' }
    }
    
    // Extract key components: street, city, state, postal
    // Typically: street, area, city, state, postal, country
    const street = parts.slice(0, Math.min(2, parts.length - 3)).join(', ')
    const cityStatePostal = parts.slice(-3).join(', ')
    
    return {
      line1: street,
      line2: cityStatePostal
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Location-wise Visibility Scores
          </CardTitle>
          <CardDescription>Individual performance breakdown by location</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center space-x-4">
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/6"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/6"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/6"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/6"></div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (locations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Location-wise Visibility Scores
          </CardTitle>
          <CardDescription>Individual performance breakdown by location</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            No location data available for scoring
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Location-wise Visibility Scores
          </div>
          <Badge variant="secondary">
            Top {Math.min(10, locations.length)} of {locations.length} locations
          </Badge>
        </CardTitle>
        <CardDescription>Individual performance breakdown by location</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Location</TableHead>
                <TableHead>Overall Score</TableHead>
                <TableHead>Reviews</TableHead>
                <TableHead>Performance</TableHead>
                <TableHead>Profile</TableHead>
                <TableHead>Key Metrics</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {locations.slice(0, 10).map((location) => {
                const { scoringDetails, metrics } = location
                const { breakdown, grade } = scoringDetails
                const addressLines = formatAddressShort(location.address)
                
                return (
                  <TableRow key={location.locationId}>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">{location.locationName}</div>
                        <div className="text-xs text-muted-foreground leading-relaxed">
                          {addressLines.line1 && <div>{addressLines.line1}</div>}
                          {addressLines.line2 && <div>{addressLines.line2}</div>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`font-semibold ${getScoreColor(breakdown.totalScore)}`}>
                            {breakdown.totalScore}
                          </span>
                          <Badge className={`text-xs ${getGradeColor(grade)}`}>
                            {grade}
                          </Badge>
                        </div>
                        <Progress value={breakdown.totalScore} className="h-1 w-16" />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-1">
                          <Star className="h-3 w-3 text-yellow-500" />
                          <span className="text-sm">{metrics.averageRating.toFixed(1)}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {metrics.totalReviews} reviews
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="text-sm font-medium">{breakdown.performanceScore}</div>
                        <div className="text-xs text-muted-foreground">
                          {metrics.impressions.toLocaleString()} impressions
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="text-sm font-medium">{breakdown.profileScore}</div>
                        <div className="text-xs text-muted-foreground">
                          {metrics.recentReviews} recent
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3 text-xs">
                        {/* <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                        </div> */}
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          <span>{metrics.callClicks}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Globe className="h-3 w-3" />
                          <span>{metrics.websiteClicks}</span>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
        
        {/* Summary Statistics */}
        <div className="mt-6 pt-4 border-t">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {locations.filter(l => l.scoringDetails.grade.startsWith('A')).length}
              </div>
              <div className="text-xs text-muted-foreground">A-Grade Locations</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {locations.filter(l => l.scoringDetails.grade.startsWith('B')).length}
              </div>
              <div className="text-xs text-muted-foreground">B-Grade Locations</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {locations.filter(l => l.scoringDetails.grade.startsWith('C')).length}
              </div>
              <div className="text-xs text-muted-foreground">C-Grade Locations</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {locations.filter(l => l.scoringDetails.grade === 'D' || l.scoringDetails.grade === 'F').length}
              </div>
              <div className="text-xs text-muted-foreground">Needs Improvement</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
