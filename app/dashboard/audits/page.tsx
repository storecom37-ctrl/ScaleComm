import { ComingSoon } from "@/components/dashboard/coming-soon"
import { FileSearch } from "lucide-react"

export default function AuditsPage() {
  return (
    <ComingSoon
      title="Audits"
      description="Comprehensive business and SEO auditing tools"
      icon={FileSearch}
      features={[
        "Website SEO audit",
        "Google My Business optimization audit",
        "Local citation audit",
        "Online reputation analysis",
        "Technical SEO checks",
        "Accessibility compliance audit",
        "Performance and speed analysis",
        "Actionable improvement recommendations"
      ]}
      estimatedRelease="Q4 2024"
    />
  )
}
