import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { MapPin, Home } from 'lucide-react'

export default function StoreNotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <MapPin className="h-6 w-6 text-red-600" />
          </div>
          <CardTitle className="text-2xl">Store Not Found</CardTitle>
          <CardDescription>
            We couldn't find the store you're looking for. It may have been moved or removed.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Button asChild className="w-full">
            <Link href="/">
              <Home className="mr-2 h-4 w-4" />
              Back to Home
            </Link>
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link href="/stores">
              <MapPin className="mr-2 h-4 w-4" />
              View All Stores
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

