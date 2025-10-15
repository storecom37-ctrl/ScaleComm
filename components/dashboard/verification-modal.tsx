"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Phone, 
  Mail, 
  MapPin, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  Loader2,
  RefreshCw,
  Info
} from "lucide-react"

interface VerificationOption {
  phoneOptions?: {
    phoneNumber?: string
    languageCode?: string
  }
  postcardOptions?: {
    languageCode?: string
  }
  emailOptions?: {
    emailAddress?: string
    languageCode?: string
  }
}

interface Verification {
  name: string
  state: 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED'
  createTime: string
  method: string
}

interface VerificationModalProps {
  isOpen: boolean
  onClose: () => void
  store: {
    _id: string
    name: string
    gmbLocationId: string
    gmbAccountId?: string
    verified?: boolean
  }
  onVerificationComplete?: () => void
}

export function VerificationModal({ 
  isOpen, 
  onClose, 
  store, 
  onVerificationComplete 
}: VerificationModalProps) {
  const [verificationOptions, setVerificationOptions] = useState<VerificationOption | null>(null)
  const [verifications, setVerifications] = useState<Verification[]>([])
  const [selectedMethod, setSelectedMethod] = useState<string>('')
  const [verificationCode, setVerificationCode] = useState('')
  const [activeVerification, setActiveVerification] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [loadingOptions, setLoadingOptions] = useState(false)
  const [error, setError] = useState<string>('')
  const [success, setSuccess] = useState<string>('')

  // Fetch verification options when modal opens
  useEffect(() => {
    if (isOpen && store.gmbLocationId) {
      fetchVerificationOptions()
      fetchVerifications()
    }
  }, [isOpen, store.gmbLocationId])

  const fetchVerificationOptions = async () => {
    if (!store.gmbLocationId) return

    setLoadingOptions(true)
    setError('')

    try {
      // gmbLocationId already contains the full path: accounts/{accountId}/locations/{locationId}
      const locationName = store.gmbLocationId
      
      const response = await fetch('/api/gmb/verification-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locationName })
      })

      const result = await response.json()

      if (result.success) {
        setVerificationOptions(result.data)
      } else {
        setError(result.error || 'Failed to fetch verification options')
      }
    } catch (error) {
      setError('Failed to fetch verification options')
      console.error('Error fetching verification options:', error)
    } finally {
      setLoadingOptions(false)
    }
  }

  const fetchVerifications = async () => {
    if (!store.gmbLocationId) return

    try {
      // gmbLocationId already contains the full path: accounts/{accountId}/locations/{locationId}
      const locationName = store.gmbLocationId
      
      const response = await fetch('/api/gmb/list-verifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locationName })
      })

      const result = await response.json()

      if (result.success) {
        setVerifications(result.data.verifications || [])
      }
    } catch (error) {
      console.error('Error fetching verifications:', error)
    }
  }

  const startVerification = async () => {
    if (!selectedMethod || !store.gmbLocationId) return

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      // gmbLocationId already contains the full path: accounts/{accountId}/locations/{locationId}
      const locationName = store.gmbLocationId
      let verificationOptions: any = {}

      // Prepare verification options based on selected method
      if (selectedMethod === 'phone' && verificationOptions?.phoneOptions) {
        verificationOptions = {
          phoneOptions: {
            phoneNumber: verificationOptions.phoneOptions.phoneNumber,
            languageCode: verificationOptions.phoneOptions.languageCode || 'en-US'
          }
        }
      } else if (selectedMethod === 'postcard' && verificationOptions?.postcardOptions) {
        verificationOptions = {
          postcardOptions: {
            languageCode: verificationOptions.postcardOptions.languageCode || 'en-US'
          }
        }
      } else if (selectedMethod === 'email' && verificationOptions?.emailOptions) {
        verificationOptions = {
          emailOptions: {
            emailAddress: verificationOptions.emailOptions.emailAddress,
            languageCode: verificationOptions.emailOptions.languageCode || 'en-US'
          }
        }
      }

      const response = await fetch('/api/gmb/start-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          locationName, 
          verificationOptions,
          storeId: store._id
        })
      })

      const result = await response.json()

      if (result.success) {
        setActiveVerification(result.data.name)
        setSuccess(`Verification started successfully! ${getMethodInstructions(selectedMethod)}`)
        fetchVerifications() // Refresh verifications list
      } else {
        setError(result.error || 'Failed to start verification')
      }
    } catch (error) {
      setError('Failed to start verification')
      console.error('Error starting verification:', error)
    } finally {
      setLoading(false)
    }
  }

  const completeVerification = async () => {
    if (!activeVerification || !verificationCode) return

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const completionDetails = {
        pin: verificationCode
      }

      const response = await fetch('/api/gmb/complete-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          verificationName: activeVerification,
          completionDetails,
          storeId: store._id
        })
      })

      const result = await response.json()

      if (result.success) {
        setSuccess('Verification completed successfully! Your store is now verified.')
        setActiveVerification('')
        setVerificationCode('')
        fetchVerifications() // Refresh verifications list
        onVerificationComplete?.()
      } else {
        setError(result.error || 'Failed to complete verification')
      }
    } catch (error) {
      setError('Failed to complete verification')
      console.error('Error completing verification:', error)
    } finally {
      setLoading(false)
    }
  }

  const getMethodInstructions = (method: string): string => {
    switch (method) {
      case 'phone':
        return 'You will receive a call with a verification code.'
      case 'postcard':
        return 'A postcard with a verification code will be mailed to your business address.'
      case 'email':
        return 'Check your email for a verification code.'
      default:
        return 'Follow the instructions provided.'
    }
  }

  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'phone':
        return <Phone className="h-4 w-4" />
      case 'postcard':
        return <MapPin className="h-4 w-4" />
      case 'email':
        return <Mail className="h-4 w-4" />
      default:
        return <Info className="h-4 w-4" />
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'PENDING':
        return <Clock className="h-4 w-4 text-yellow-500" />
      case 'FAILED':
      case 'CANCELLED':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
        return <Info className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800'
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800'
      case 'FAILED':
      case 'CANCELLED':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Verify Store: {store.name}
          </DialogTitle>
          <DialogDescription>
            Complete the verification process for your Google My Business listing
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Verification Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <RefreshCw className="h-4 w-4" />
                Current Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Badge className={store.verified ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                  {store.verified ? 'Verified' : 'Not Verified'}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {store.verified ? 'Your store is verified in Google My Business' : 'Your store needs verification'}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Verification Options */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Available Verification Methods</CardTitle>
              <CardDescription>
                Choose a verification method to verify your business
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loadingOptions ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="ml-2">Loading verification options...</span>
                </div>
              ) : verificationOptions ? (
                <div className="grid gap-3">
                  {verificationOptions.phoneOptions && (
                    <div 
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedMethod === 'phone' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedMethod('phone')}
                    >
                      <div className="flex items-center gap-3">
                        <Phone className="h-5 w-5 text-blue-600" />
                        <div className="flex-1">
                          <h4 className="font-medium">Phone Verification</h4>
                          <p className="text-sm text-muted-foreground">
                            Receive a verification code via phone call
                          </p>
                          {verificationOptions.phoneOptions.phoneNumber && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Phone: {verificationOptions.phoneOptions.phoneNumber}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {verificationOptions.postcardOptions && (
                    <div 
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedMethod === 'postcard' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedMethod('postcard')}
                    >
                      <div className="flex items-center gap-3">
                        <MapPin className="h-5 w-5 text-green-600" />
                        <div className="flex-1">
                          <h4 className="font-medium">Postcard Verification</h4>
                          <p className="text-sm text-muted-foreground">
                            Receive a verification code via postcard
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Sent to your business address
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {verificationOptions.emailOptions && (
                    <div 
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedMethod === 'email' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedMethod('email')}
                    >
                      <div className="flex items-center gap-3">
                        <Mail className="h-5 w-5 text-purple-600" />
                        <div className="flex-1">
                          <h4 className="font-medium">Email Verification</h4>
                          <p className="text-sm text-muted-foreground">
                            Receive a verification code via email
                          </p>
                          {verificationOptions.emailOptions.emailAddress && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Email: {verificationOptions.emailOptions.emailAddress}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No verification options available for this location.
                  </AlertDescription>
                </Alert>
              )}

              {selectedMethod && (
                <Button 
                  onClick={startVerification}
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Starting Verification...
                    </>
                  ) : (
                    `Start ${selectedMethod.charAt(0).toUpperCase() + selectedMethod.slice(1)} Verification`
                  )}
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Active Verification */}
          {activeVerification && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Complete Verification</CardTitle>
                <CardDescription>
                  {getMethodInstructions(selectedMethod)}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="verificationCode">Verification Code</Label>
                  <Input
                    id="verificationCode"
                    type="text"
                    placeholder="Enter verification code"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                  />
                </div>
                <Button 
                  onClick={completeVerification}
                  disabled={loading || !verificationCode}
                  className="w-full"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Completing Verification...
                    </>
                  ) : (
                    'Complete Verification'
                  )}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Verification History */}
          {verifications.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Verification History</CardTitle>
                <CardDescription>
                  Previous verification attempts for this location
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {verifications.map((verification, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {getMethodIcon(verification.method)}
                        <div>
                          <p className="font-medium">{verification.method}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(verification.createTime).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(verification.state)}
                        <Badge className={getStatusColor(verification.state)}>
                          {verification.state}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Error/Success Messages */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
