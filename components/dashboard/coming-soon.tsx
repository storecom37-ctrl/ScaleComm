import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { LucideIcon } from "lucide-react"

interface ComingSoonProps {
  title: string
  description: string
  icon: LucideIcon
  features: string[]
  estimatedRelease?: string
}

export function ComingSoon({ title, description, icon: Icon, features, estimatedRelease }: ComingSoonProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <div className="flex items-center space-x-2 mb-2">
            <Icon className="h-8 w-8 text-muted-foreground" />
            <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
            <Badge variant="secondary" className="ml-2">Coming Soon</Badge>
          </div>
          <p className="text-muted-foreground">{description}</p>
        </div>
      </div>

      {/* Coming Soon Content */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>What&apos;s Coming</CardTitle>
            <CardDescription>Exciting features we&apos;re working on</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2">
              {features.map((feature, index) => (
                <li key={index} className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                  <span className="text-sm">{feature}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Stay Updated</CardTitle>
            <CardDescription>Be the first to know when this feature launches</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {estimatedRelease && (
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-1">Estimated Release</h4>
                <p className="text-sm text-muted-foreground">{estimatedRelease}</p>
              </div>
            )}
            
            <div className="space-y-2">
              <Button className="w-full">
                Get Notified When Available
              </Button>
              <Button variant="outline" className="w-full">
                Request Early Access
              </Button>
            </div>

            <div className="text-center pt-4">
              <p className="text-sm text-muted-foreground">
                Have suggestions or feedback? We&apos;d love to hear from you!
              </p>
              <Button variant="link" className="mt-2">
                Share Your Ideas
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Preview Card */}
      <Card>
        <CardHeader>
          <CardTitle>Feature Preview</CardTitle>
          <CardDescription>A sneak peek at what&apos;s coming</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
            <div className="text-center space-y-2">
              <Icon className="h-12 w-12 text-muted-foreground mx-auto" />
              <p className="text-muted-foreground">Preview coming soon...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
