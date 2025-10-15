"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, Building2, Users, RefreshCw } from "lucide-react"

interface GmbAccount {
  id: string
  name: string
  email?: string
}

interface AccountSelectorProps {
  selectedAccountId?: string
  onAccountChange?: (accountId: string) => void
  className?: string
}

export function AccountSelector({ 
  selectedAccountId, 
  onAccountChange,
  className = "" 
}: AccountSelectorProps) {
  const [accounts, setAccounts] = useState<GmbAccount[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAccounts = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/gmb/accounts')
      const data = await response.json()
      
      if (data.success) {
        setAccounts(data.data || [])
        
        // Auto-select first account if none selected
        if (!selectedAccountId && data.data.length > 0 && onAccountChange) {
          onAccountChange(data.data[0].id)
        }
      } else {
        setError(data.error || 'Failed to fetch accounts')
      }
    } catch (err) {
      setError('Network error fetching accounts')
      console.error('Error fetching accounts:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchAccounts()
  }, [])

  const handleAccountChange = (accountId: string) => {
    if (onAccountChange) {
      onAccountChange(accountId)
    }
  }

  const selectedAccount = accounts.find(acc => acc.id === selectedAccountId)

  if (isLoading) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <RefreshCw className="h-4 w-4 animate-spin" />
        <span className="text-sm text-muted-foreground">Loading accounts...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <Badge variant="destructive" className="text-xs">
          Error: {error}
        </Badge>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={fetchAccounts}
          className="h-6 px-2"
        >
          <RefreshCw className="h-3 w-3" />
        </Button>
      </div>
    )
  }

  if (accounts.length === 0) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <Badge variant="outline" className="text-xs">
          No GMB accounts found
        </Badge>
      </div>
    )
  }

  if (accounts.length === 1) {
    // Show single account info instead of dropdown
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <CheckCircle className="h-4 w-4 text-green-600" />
        <div className="flex flex-col">
          <span className="text-sm font-medium">{accounts[0].name}</span>
          {accounts[0].email && (
            <span className="text-xs text-muted-foreground">{accounts[0].email}</span>
          )}
        </div>
        <Badge className="text-xs">
          <Building2 className="h-3 w-3 mr-1" />
          Single Account
        </Badge>
      </div>
    )
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <Users className="h-4 w-4 text-muted-foreground" />
      <Select value={selectedAccountId} onValueChange={handleAccountChange}>
        <SelectTrigger className="w-[250px] h-8">
          <SelectValue placeholder="Select GMB Account" />
        </SelectTrigger>
        <SelectContent>
          {accounts.map((account) => (
            <SelectItem key={account.id} value={account.id}>
              <div className="flex flex-col">
                <span className="font-medium">{account.name}</span>
                {account.email && (
                  <span className="text-xs text-muted-foreground">{account.email}</span>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      {selectedAccount && (
        <Badge className="text-xs">
          <CheckCircle className="h-3 w-3 mr-1" />
          Active
        </Badge>
      )}
      
      <Badge variant="outline" className="text-xs">
        {accounts.length} accounts
      </Badge>
    </div>
  )
}
