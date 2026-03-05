import { useState, useEffect, useRef } from 'react'
import { Snowflake, BarChart3, Table2, FileText, AlertCircle, Check, Code, ChevronDown, History } from 'lucide-react'
import { VegaChart } from './VegaChart'
import { DataTable } from './DataTable'
import { cn } from '@/lib/utils'
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

function CollapsibleSection({
  icon,
  title,
  defaultOpen = true,
  children,
}: {
  icon: React.ReactNode
  title: React.ReactNode
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <section className="bg-card rounded-lg border border-border">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-2 px-5 py-3 text-left hover:bg-muted/50 transition-colors rounded-lg"
      >
        {icon}
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <ChevronDown className={cn(
          "h-4 w-4 text-muted-foreground ml-auto transition-transform",
          isOpen && "rotate-180"
        )} />
      </button>
      {isOpen && (
        <div className="px-5 pb-4 pt-0">
          {children}
        </div>
      )}
    </section>
  )
}

function QueryDetails({ sql }: { sql?: string }) {
  const [isOpen, setIsOpen] = useState(false)
  if (!sql) return null

  return (
    <section className="bg-card rounded-lg border border-border">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-2 px-5 py-3 text-left hover:bg-muted/50 transition-colors rounded-lg"
      >
        <Code className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-semibold text-muted-foreground">
          Query Details
        </span>
        <ChevronDown className={cn(
          "h-4 w-4 text-muted-foreground ml-auto transition-transform",
          isOpen && "rotate-180"
        )} />
      </button>
      {isOpen && sql && (
        <div className="px-5 pb-4 pt-0">
          <pre className="text-xs text-green-400 bg-[#0d1117] rounded-md p-4 overflow-x-auto whitespace-pre-wrap font-mono leading-relaxed border border-[#1a2332]">
            {sql}
          </pre>
        </div>
      )}
    </section>
  )
}

interface MainContentProps {
  selectedCount: number
  exploreState: ExploreState
  canExplore: boolean
  isViewingHistory?: boolean
}

export function MainContent({ selectedCount, exploreState, canExplore, isViewingHistory }: MainContentProps) {
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
            {/* History banner */}
            {isViewingHistory && (
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-muted/50 border border-border">
                <History className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground font-medium">
                  Viewing saved result
                </span>
              </div>
            )}

            {/* Text Insights */}
            {result.text && (
              <CollapsibleSection
                icon={<FileText className="h-4 w-4 text-primary" />}
                title="Insights"
              >
                <div
                  className="text-sm text-muted-foreground leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: simpleMarkdownToHtml(result.text) }}
                />
              </CollapsibleSection>
            )}

            {/* Chart */}
            {result.chart && (
              <CollapsibleSection
                icon={<BarChart3 className="h-4 w-4 text-primary" />}
                title={(result.chart.title as string) || 'Chart'}
              >
                <VegaChart spec={result.chart} className="w-full" />
              </CollapsibleSection>
            )}

            {/* Data Table */}
            {(result.chart || (result.data && result.data.length > 1)) && (
              <CollapsibleSection
                icon={<Table2 className="h-4 w-4 text-primary" />}
                title={<>
                  Data
                  {result.data && result.data.length > 1 && (
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      {result.data.length - 1} rows
                    </span>
                  )}
                </>}
              >
                <DataTable chart={result.chart} rawData={result.data} />
              </CollapsibleSection>
            )}

            {/* Query Details */}
            {result.sql && (
              <QueryDetails sql={result.sql} />
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
