"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useKeywords } from "@/lib/hooks/use-keywords"
import { 
  Search, 
  X, 
  TrendingUp, 
  Eye, 
  MousePointer, 
  Target,
  BarChart3,
  ArrowUpDown,
  Filter,
  Download,
  Loader2
} from "lucide-react"

interface KeywordPerformanceTableProps {
  locationId?: string
  title?: string
  description?: string
  showSearch?: boolean
  showFilters?: boolean
  showExport?: boolean
  limit?: number
}

export function KeywordPerformanceTable({ 
  locationId, 
  title = "Keyword Performance", 
  description = "Detailed keyword analytics and search performance",
  showSearch = true,
  showFilters = true,
  showExport = true,
  limit = 20
}: KeywordPerformanceTableProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState<'impressions' | 'clicks' | 'position' | 'ctr'>('impressions')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [currentPage, setCurrentPage] = useState(1)
  
  const { 
    keywords, 
    summary, 
    totalCount, 
    isLoading, 
    error, 
    refresh,
    searchKeywords,
    clearSearch
  } = useKeywords({
    locationId,
    limit,
    skip: (currentPage - 1) * limit,
    sortBy,
    sortOrder,
    search: searchQuery
  })

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    searchKeywords(query)
    setCurrentPage(1) // Reset to first page when searching
  }

  const handleClearSearch = () => {
    setSearchQuery("")
    clearSearch()
    setCurrentPage(1)
  }

  const handleSort = (field: 'impressions' | 'clicks' | 'position' | 'ctr') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('desc')
    }
    setCurrentPage(1)
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
    return num.toString()
  }

  const formatPercentage = (num: number) => {
    return (num * 100).toFixed(2) + '%'
  }

  const getPositionColor = (position: number) => {
    if (position <= 3) return "text-green-600"
    if (position <= 10) return "text-yellow-600"
    return "text-red-600"
  }

  const getCtrColor = (ctr: number) => {
    if (ctr >= 0.05) return "text-green-600"
    if (ctr >= 0.02) return "text-yellow-600"
    return "text-red-600"
  }

  const getPositionBadgeVariant = (position: number) => {
    if (position <= 3) return "default"
    if (position <= 10) return "secondary"
    return "destructive"
  }

  const getCtrBadgeVariant = (ctr: number) => {
    if (ctr >= 0.05) return "default"
    if (ctr >= 0.02) return "secondary"
    return "destructive"
  }

  const totalPages = Math.ceil(totalCount / limit)

  const handleExport = () => {
    // TODO: Implement export functionality
    console.log('Export keywords data')
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            {title}
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <X className="h-6 w-6 text-red-600" />
            </div>
            <p className="text-sm text-red-600 mb-4">Error loading keyword data</p>
            <Button variant="outline" onClick={refresh}>
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              {title}
            </CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          {showExport && (
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Search and Filters */}
        {(showSearch || showFilters) && (
          <div className="flex flex-col sm:flex-row gap-4">
            {showSearch && (
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search keywords..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10 pr-10"
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
                    onClick={handleClearSearch}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}
            {showFilters && (
              <div className="flex gap-2">
                <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="impressions">Impressions</SelectItem>
                    <SelectItem value="clicks">Clicks</SelectItem>
                    <SelectItem value="position">Position</SelectItem>
                    <SelectItem value="ctr">CTR</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                >
                  <ArrowUpDown className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Summary Stats */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{summary.totalUniqueKeywords}</div>
              <div className="text-sm text-muted-foreground">Keywords</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{formatNumber(summary.totalImpressions)}</div>
              <div className="text-sm text-muted-foreground">Impressions</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{formatNumber(summary.totalClicks)}</div>
              <div className="text-sm text-muted-foreground">Clicks</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{summary.avgPosition.toFixed(1)}</div>
              <div className="text-sm text-muted-foreground">Avg Position</div>
            </div>
          </div>
        )}

        {/* Keywords Table */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Keywords Performance</h3>
            <div className="text-sm text-muted-foreground">
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  <span className="text-muted-foreground">Loading...</span>
                </div>
              ) : (
                `${keywords.length} of ${totalCount} keywords`
              )}
            </div>
          </div>
          
          {isLoading ? (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-sm text-muted-foreground">Loading keywords...</p>
            </div>
          ) : keywords.length > 0 ? (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort('impressions')}
                    >
                      <div className="flex items-center gap-1">
                        Keyword
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50 text-right"
                      onClick={() => handleSort('impressions')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        <Eye className="h-3 w-3" />
                        Impressions
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50 text-right"
                      onClick={() => handleSort('clicks')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        <MousePointer className="h-3 w-3" />
                        Clicks
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50 text-right"
                      onClick={() => handleSort('ctr')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        <TrendingUp className="h-3 w-3" />
                        CTR
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50 text-right"
                      onClick={() => handleSort('position')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        <Target className="h-3 w-3" />
                        Position
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </TableHead>
                    <TableHead className="text-right">Performance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {keywords.map((keyword, index) => (
                    <TableRow key={keyword.keyword}>
                      <TableCell className="font-medium">
                        {(currentPage - 1) * limit + index + 1}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{keyword.keyword}</div>
                        {keyword.monthlyData && keyword.monthlyData.length > 0 && (
                          <div className="text-xs text-muted-foreground">
                            {keyword.monthlyData.length} months tracked
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="font-medium">{formatNumber(keyword.totalImpressions)}</div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="font-medium">{formatNumber(keyword.totalClicks)}</div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant={getCtrBadgeVariant(keyword.avgCtr)}>
                          {formatPercentage(keyword.avgCtr)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant={getPositionBadgeVariant(keyword.avgPosition)}>
                          {keyword.avgPosition.toFixed(1)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {keyword.avgPosition <= 3 && (
                            <Badge variant="default" className="text-xs">
                              Top 3
                            </Badge>
                          )}
                          {keyword.avgCtr >= 0.05 && (
                            <Badge variant="default" className="text-xs">
                              High CTR
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                {searchQuery ? "No keywords found matching your search" : "No keyword data available"}
              </p>
              {searchQuery && (
                <Button variant="outline" size="sm" className="mt-2" onClick={handleClearSearch}>
                  Clear Search
                </Button>
              )}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}


