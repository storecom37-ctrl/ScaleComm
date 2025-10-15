"use client"

import { useEffect, useMemo, useState } from "react"
import { CheckCircle2, RefreshCw, X, Minus } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

interface CurrentProgress {
  step: string
  message: string
  progress: number
  total: number
}

export default function GmbProgressWidget() {
  const [current, setCurrent] = useState<CurrentProgress | null>(null)
  const [hidden, setHidden] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  // Expose a setter on window so other parts of the app can update progress
  useEffect(() => {
    ;(window as any).setGmbCurrentProgress = (progress: CurrentProgress | null) => {
      setCurrent(progress)
      setHidden(false) // reshow if a new update comes in after being closed
    }
    return () => {
      if ((window as any).setGmbCurrentProgress) delete (window as any).setGmbCurrentProgress
    }
  }, [])

  const percent = useMemo(() => {
    if (!current || current.total <= 0) return 0
    return Math.round((current.progress / current.total) * 100)
  }, [current])

  const bounded = Math.max(0, Math.min(100, percent))
  const isComplete = bounded >= 100

  if (!current || hidden) return null

  return (
    <AnimatePresence>
      <motion.div
        key="gmb-widget"
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.98 }}
        transition={{ duration: 0.2 }}
        aria-live="polite"
        role="status"
        className="fixed bottom-4 right-4 z-50 w-[360px] max-w-[92vw]"
      >
        {/* Gradient border frame */}
        <div className="relative rounded-2xl p-[1.5px] bg-gradient-to-br from-emerald-400/70 via-emerald-500/40 to-teal-500/70 shadow-[0_10px_40px_-15px_rgba(16,185,129,0.5)]">
          {/* Card body */}
          <div className="rounded-2xl bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 p-4">
            {/* Header */}
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center ring-1 ring-primary/20">
                  {isComplete ? (
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                  ) : (
                    <RefreshCw className="h-4 w-4 text-primary animate-spin" />
                  )}
                </div>
                <div>
                  <div className="text-sm font-semibold leading-tight">GMB Sync</div>
                  <div className="text-[11px] text-muted-foreground leading-tight">
                    {isComplete ? "All done" : "Working…"}
                  </div>
                </div>
              </div>

              {/* Window controls */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setCollapsed((v) => !v)}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md border bg-background hover:bg-accent/50 text-muted-foreground hover:text-foreground transition"
                  aria-label={collapsed ? "Expand" : "Collapse"}
                >
                  <Minus className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setHidden(true)}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md border bg-background hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Body */}
            <AnimatePresence initial={false}>
              {!collapsed && (
                <motion.div
                  key="content"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="mb-2 flex items-center gap-2 min-h-6">
                    {/* <span className="inline-flex items-center rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide">
                      {getStepTitle(current.step)}
                    </span> */}
                    {current.message && (
                      <span
                        className="text-xs text-muted-foreground truncate"
                        title={current.message}
                      >
                        {current.message}
                      </span>
                    )}
                    <span className="ml-auto text-xs tabular-nums text-muted-foreground">{bounded}%</span>
                  </div>

                  {/* Progress track */}
                  <div className="relative">
                    {/* Track */}
                    <div className="h-2 w-full overflow-hidden rounded-full bg-secondary" />

                    {/* Fill */}
                    <motion.div
                      className="absolute inset-y-0 left-0 rounded-full shadow-sm"
                      style={{
                        background:
                          isComplete
                            ? "linear-gradient(90deg, rgb(34,197,94) 0%, rgb(16,185,129) 50%, rgb(5,150,105) 100%)"
                            : "linear-gradient(90deg, rgba(34,197,94,1) 0%, rgba(16,185,129,1) 40%, rgba(14,165,233,1) 100%)",
                      }}
                      initial={{ width: 0 }}
                      animate={{ width: `${bounded}%` }}
                      transition={{ type: "spring", stiffness: 120, damping: 20 }}
                    />

                    {/* Glow */}
                    <motion.div
                      className="pointer-events-none absolute inset-y-0 left-0 rounded-full opacity-30 blur-sm"
                      style={{
                        background: "radial-gradient(closest-side, rgb(16,185,129), transparent)",
                      }}
                      initial={{ width: 0 }}
                      animate={{ width: `${bounded}%` }}
                      transition={{ type: "spring", stiffness: 120, damping: 20, delay: 0.02 }}
                    />
                  </div>

                  {/* Status row */}
                  <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>
                      {isComplete ? "Synced successfully." : "Please keep this tab open while we sync your data."}
                    </span>
                    {isComplete && (
                      <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Completed
                      </span>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Soft highlight ring */}
          <div className="pointer-events-none absolute -inset-2 rounded-3xl bg-emerald-500/0 blur-2xl" />
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

function getStepTitle(step: string): string {
  switch (step) {
    case "account":
      return "Connecting Account"
    case "locations":
      return "Fetching Locations"
    case "reviews":
      return "Retrieving Reviews"
    case "posts":
      return "Getting Posts"
    case "insights":
      return "Fetching Performance Data"
    case "keywords":
      return "Processing Keywords"
    default:
      return "Processing"
  }
}
