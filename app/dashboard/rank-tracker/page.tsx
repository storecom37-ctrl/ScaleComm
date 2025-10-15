import { ComingSoon } from "@/components/dashboard/coming-soon"
import { TrendingUp } from "lucide-react"

export default function RankTrackerPage() {
  return (
    <ComingSoon
      title="Rank Tracker"
      description="Monitor your search engine rankings and SEO performance"
      icon={TrendingUp}
      features={[
        "Keyword ranking tracking",
        "Local search position monitoring",
        "Competitor analysis",
        "SERP feature tracking",
        "Ranking history and trends",
        "Automated ranking reports",
        "Google My Business insights",
        "Mobile vs desktop rankings"
      ]}
      estimatedRelease="Q3 2024"
    />
  )
}
