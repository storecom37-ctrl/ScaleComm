import { Sidebar } from "@/components/dashboard/sidebar"
import { Header } from "@/components/dashboard/header"
import GlobalSyncStatus from "@/components/dashboard/global-sync-status"
import { AuthWrapper } from "@/components/auth/auth-wrapper"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthWrapper>
      <div className="flex h-screen overflow-hidden">
        {/* Sidebar */}
        <div className="hidden border-r bg-muted/40 md:block w-[220px] lg:w-[280px]">
          <div className="flex h-full flex-col">
            <Sidebar />
          </div>
        </div>

        {/* Main Content */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-x-hidden overflow-y-auto bg-background">
            <div className="container mx-auto px-6 py-8">
              {children}
            </div>
          </main>
        </div>
        
        {/* Global Sync Status */}
        <GlobalSyncStatus />
      </div>
    </AuthWrapper>
  )
}
