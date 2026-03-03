import { useState, useEffect, useRef } from 'react'
import { Snowflake, BarChart3, Table2, FileText, AlertCircle, Check } from 'lucide-react'
import { VegaChart } from './VegaChart'
import { DataTable } from './DataTable'
import { simpleMarkdownToHtml } from '@/lib/markdown'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import type { ExploreState } from '@/types/explore'

const LOADING_STEPS = [
  { label: 'Connecting to Snowflake', delay: 0 },
  { label: 'Loading Semantic View', delay: 1500 },
  { label: 'Running query', delay: 4000 },
  { label: 'Processing results', delay: 7000 },
  { label: 'Generating insights', delay: 11000 },
  { label: 'Building visualization', delay: 15000 },
]

function useElapsedTime(running: boolean) {
  const [elapsed, setElapsed] = useState(0)
  const startRef = useRef(0)

  useEffect(() => {
    if (!running) {
      setElapsed(0)
      return
    }
    startRef.current = Date.now()
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startRef.current) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [running])

  return elapsed
}

function formatElapsed(seconds: number) {
  if (seconds < 60) return `${seconds}s`
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}m ${s.toString().padStart(2, '0')}s`
}

function LoadingView() {
  const elapsed = useElapsedTime(true)
  const [activeStep, setActiveStep] = useState(0)

  useEffect(() => {
    const timers = LOADING_STEPS.map((step, i) => {
      if (i === 0) return undefined
      return setTimeout(() => setActiveStep(i), step.delay)
    })
    return () => timers.forEach((t) => t && clearTimeout(t))
  }, [])

  return (
    <main className="flex-1 bg-background overflow-hidden">
      <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
        {/* Progress header */}
        <div className="bg-card rounded-lg border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <Snowflake className="h-5 w-5 text-primary animate-[spin_3s_linear_infinite]" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Analyzing your data</h3>
                <p className="text-xs text-muted-foreground">
                  {LOADING_STEPS[activeStep].label}...
                </p>
              </div>
            </div>
            <span className="text-xs font-mono text-muted-foreground tabular-nums">
              {formatElapsed(elapsed)}
            </span>
          </div>

          {/* Steps */}
          <div className="space-y-2">
            {LOADING_STEPS.map((step, i) => (
              <div key={step.label} className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all duration-500 ${
                  i < activeStep
                    ? 'bg-primary text-primary-foreground'
                    : i === activeStep
                    ? 'border-2 border-primary bg-primary/10'
                    : 'border-2 border-border bg-background'
                }`}>
                  {i < activeStep ? (
                    <Check className="h-3 w-3" />
                  ) : i === activeStep ? (
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  ) : null}
                </div>
                <span className={`text-sm transition-colors duration-300 ${
                  i <= activeStep ? 'text-foreground' : 'text-muted-foreground/50'
                }`}>
                  {step.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Skeleton: Insights */}
        <div className="bg-card rounded-lg border border-border p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-4 w-20" />
          </div>
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-4/5" />
          <Skeleton className="h-3 w-3/5" />
        </div>

        {/* Skeleton: Chart */}
        <div className="bg-card rounded-lg border border-border p-5">
          <div className="flex items-center gap-2 mb-4">
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>

        {/* Skeleton: Table */}
        <div className="bg-card rounded-lg border border-border p-5">
          <div className="flex items-center gap-2 mb-4">
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-4 w-16" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-8 w-full rounded" />
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-6 w-full rounded" />
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}

interface MainContentProps {
  selectedCount: number
  exploreState: ExploreState
  canExplore: boolean
}

export function MainContent({ selectedCount, exploreState, canExplore }: MainContentProps) {
  const { status, result, error } = exploreState

  // Loading
  if (status === 'loading') {
    return <LoadingView />
  }

  // Error
  if (status === 'error') {
    return (
      <main className="flex-1 flex items-center justify-center bg-background">
        <div className="text-center max-w-sm px-6">
          <div className="mx-auto mb-4 w-14 h-14 rounded-xl bg-destructive/10 flex items-center justify-center">
            <AlertCircle className="h-7 w-7 text-destructive" />
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-2">Exploration Failed</h2>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </main>
    )
  }

  // Results
  if (status === 'success' && result) {
    return (
      <main className="flex-1 bg-background overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
            {/* Text Insights */}
            {result.text && (
              <section className="bg-card rounded-lg border border-border p-5">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">Insights</h3>
                </div>
                <div
                  className="text-sm text-muted-foreground leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: simpleMarkdownToHtml(result.text) }}
                />
              </section>
            )}

            {/* Chart */}
            {result.chart && (
              <section className="bg-card rounded-lg border border-border p-5">
                <div className="flex items-center gap-2 mb-3">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">
                    {(result.chart.title as string) || 'Chart'}
                  </h3>
                </div>
                <VegaChart spec={result.chart} className="w-full" />
              </section>
            )}

            {/* Data Table */}
            {result.chart && (
              <section className="bg-card rounded-lg border border-border p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Table2 className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">
                    Data
                    {result.data && (
                      <span className="ml-2 text-xs font-normal text-muted-foreground">
                        {result.data.length} rows
                      </span>
                    )}
                  </h3>
                </div>
                <DataTable chart={result.chart} />
              </section>
            )}
          </div>
        </ScrollArea>
      </main>
    )
  }

  // Idle / Placeholder
  return (
    <main className="flex-1 flex items-center justify-center bg-background overflow-auto">
      <div className="text-center max-w-md px-6">
        <div className="mx-auto mb-6 w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Snowflake className="h-10 w-10 text-primary/60" />
        </div>
        <h2 className="text-xl font-semibold text-foreground mb-2">
          Select metrics & dimensions
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          Choose items from the sidebar to begin building your analysis. Select at least one metric and one dimension, then click Explore.
        </p>
        {selectedCount > 0 && (
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            {selectedCount} item{selectedCount !== 1 ? 's' : ''} selected
            {canExplore && ' — ready to explore'}
          </div>
        )}
      </div>
    </main>
  )
}
