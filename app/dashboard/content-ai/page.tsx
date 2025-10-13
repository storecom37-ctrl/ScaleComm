import { ComingSoon } from "@/components/dashboard/coming-soon"
import { Bot } from "lucide-react"

export default function ContentAIPage() {
  return (
    <ComingSoon
      title="Content AI"
      description="AI-powered content generation for your business"
      icon={Bot}
      features={[
        "Automated social media post generation",
        "SEO-optimized blog content creation",
        "Product description writing",
        "Email marketing campaign content",
        "Review response templates",
        "Multi-language content support",
        "Brand voice consistency",
        "Content performance analytics"
      ]}
      estimatedRelease="Q2 2024"
    />
  )
}
