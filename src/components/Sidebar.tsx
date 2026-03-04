import { useState, useCallback, useRef } from 'react'
import { Hash, Layers, Calendar, Clock, GripVertical, Play, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { SidebarSection } from './SidebarSection'
import { DimensionFilterSection } from './DimensionFilterSection'
import { MetricFilterSection } from './MetricFilterSection'
import type { CatalogResponse } from '@/types/catalog'
import type { MetricFilter } from '@/types/explore'

interface SidebarProps {
  catalog: CatalogResponse | null
  loading: boolean
  selectedMetrics: Set<string>
  selectedDimensions: Set<string>
  selectedTimeGrain: string | null
  onToggleMetric: (name: string) => void
  onToggleDimension: (name: string) => void
  onSelectTimeGrain: (grain: string | null) => void
  dimensionFilters: Map<string, Set<string>>
  knownDimensionValues: Map<string, string[]>
  onToggleDimensionFilter: (dimensionName: string, value: string) => void
  onClearDimensionFilter: (dimensionName: string) => void
  onClearAllFilters: () => void
  metricFilters: Map<string, MetricFilter>
  onSetMetricFilter: (metricName: string, filter: MetricFilter | null) => void
  onClearAllMetricFilters: () => void
  canExplore: boolean
  exploring: boolean
  onExplore: () => void
}

const dimensionTypeBadgeStyles: Record<string, string> = {
  geographic: 'border-emerald-500/50 text-emerald-400',
  categorical: 'border-sky-500/50 text-sky-400',
  time: 'border-amber-500/50 text-amber-400',
}

function LoadingSkeleton() {
  return (
    <div className="space-y-1 px-3 py-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-2 py-1.5">
          <Skeleton className="h-4 w-4 rounded bg-sidebar-muted" />
          <Skeleton className="h-3.5 flex-1 bg-sidebar-muted rounded" />
        </div>
      ))}
    </div>
  )
}

export function Sidebar({
  catalog,
  loading,
  selectedMetrics,
  selectedDimensions,
  selectedTimeGrain,
  onToggleMetric,
  onToggleDimension,
  onSelectTimeGrain,
  dimensionFilters,
  knownDimensionValues,
  onToggleDimensionFilter,
  onClearDimensionFilter,
  onClearAllFilters,
  metricFilters,
  onSetMetricFilter,
  onClearAllMetricFilters,
  canExplore,
  exploring,
  onExplore,
}: SidebarProps) {
  const [width, setWidth] = useState(400)
  const [metricsSearch, setMetricsSearch] = useState('')
  const [dimensionsSearch, setDimensionsSearch] = useState('')
  const isResizing = useRef(false)

  const startResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    isResizing.current = true
    const startX = e.clientX
    const startWidth = width

    const onMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return
      const newWidth = Math.min(480, Math.max(240, startWidth + (e.clientX - startX)))
      setWidth(newWidth)
    }

    const onMouseUp = () => {
      isResizing.current = false
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }, [width])

  const filteredMetrics = catalog?.metrics.filter((m) =>
    m.name.toLowerCase().includes(metricsSearch.toLowerCase())
  ) ?? []

  const filteredDimensions = catalog?.dimensions.filter((d) =>
    d.name.toLowerCase().includes(dimensionsSearch.toLowerCase())
  ) ?? []

  return (
    <aside className="bg-sidebar flex shrink-0 overflow-hidden" style={{ width }}>
      <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        {/* Metrics Section */}
        <SidebarSection
          title="Metrics"
          icon={<Hash className="h-4 w-4" />}
          count={catalog?.metrics.length ?? 0}
          selectedCount={selectedMetrics.size}
          searchValue={metricsSearch}
          onSearchChange={setMetricsSearch}
        >
          {loading ? (
            <LoadingSkeleton />
          ) : filteredMetrics.length === 0 ? (
            <p className="text-xs text-sidebar-foreground/40 px-3 py-3 text-center">
              No matches
            </p>
          ) : (
            filteredMetrics.map((metric) => (
              <label
                key={metric.name}
                className="flex items-center gap-2 px-3 py-1.5 rounded hover:bg-sidebar-muted cursor-pointer transition-colors"
              >
                <Checkbox
                  checked={selectedMetrics.has(metric.name)}
                  onCheckedChange={() => onToggleMetric(metric.name)}
                  className="border-sidebar-border data-[state=checked]:bg-sidebar-accent data-[state=checked]:border-sidebar-accent"
                />
                <span
                  className="text-sm text-sidebar-foreground truncate"
                  title={metric.display_name || undefined}
                >
                  {metric.name}
                </span>
              </label>
            ))
          )}
        </SidebarSection>

        {/* Dimensions Section */}
        <SidebarSection
          title="Dimensions"
          icon={<Layers className="h-4 w-4" />}
          count={catalog?.dimensions.length ?? 0}
          selectedCount={selectedDimensions.size}
          searchValue={dimensionsSearch}
          onSearchChange={setDimensionsSearch}
        >
          {loading ? (
            <LoadingSkeleton />
          ) : filteredDimensions.length === 0 ? (
            <p className="text-xs text-sidebar-foreground/40 px-3 py-3 text-center">
              No matches
            </p>
          ) : (
            filteredDimensions.map((dim) => (
              <label
                key={dim.name}
                className="flex items-center gap-2 px-3 py-1.5 rounded hover:bg-sidebar-muted cursor-pointer transition-colors"
              >
                <Checkbox
                  checked={selectedDimensions.has(dim.name)}
                  onCheckedChange={() => onToggleDimension(dim.name)}
                  className="border-sidebar-border data-[state=checked]:bg-sidebar-accent data-[state=checked]:border-sidebar-accent"
                />
                <span
                  className="text-sm text-sidebar-foreground truncate flex-1"
                  title={dim.display_name || undefined}
                >
                  {dim.name}
                </span>
                <Badge
                  variant="outline"
                  className={cn(
                    'text-[10px] px-1.5 py-0 h-5 shrink-0 font-normal',
                    dimensionTypeBadgeStyles[dim.type] ?? 'border-sidebar-border text-sidebar-foreground/50'
                  )}
                >
                  {dim.type}
                </Badge>
              </label>
            ))
          )}
        </SidebarSection>

        {/* Time Grains Section */}
        <SidebarSection
          title="Time Grain"
          icon={<Calendar className="h-4 w-4" />}
          count={catalog?.available_time_grains.length ?? 0}
          selectedCount={selectedTimeGrain ? 1 : 0}
          searchable={false}
          searchValue=""
          onSearchChange={() => {}}
        >
          {loading ? (
            <div className="flex flex-wrap gap-1.5 px-3 py-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-7 w-16 rounded-full bg-sidebar-muted" />
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap gap-1.5 px-3 py-2">
              {catalog?.available_time_grains.map((grain) => (
                <button
                  key={grain}
                  onClick={() =>
                    onSelectTimeGrain(selectedTimeGrain === grain ? null : grain)
                  }
                  className={cn(
                    'px-3 py-1 rounded-full text-xs font-medium transition-colors capitalize',
                    selectedTimeGrain === grain
                      ? 'bg-sidebar-accent text-white'
                      : 'bg-sidebar-muted text-sidebar-foreground hover:bg-sidebar-border'
                  )}
                >
                  {grain}
                </button>
              ))}
            </div>
          )}
        </SidebarSection>

        {/* Dimension Filters — only after first explore */}
        {!loading && knownDimensionValues.size > 0 && (
          <DimensionFilterSection
            selectedDimensionsCatalog={
              catalog?.dimensions.filter((d) => selectedDimensions.has(d.name)) ?? []
            }
            dimensionFilters={dimensionFilters}
            knownDimensionValues={knownDimensionValues}
            onToggleFilter={onToggleDimensionFilter}
            onClearDimensionFilter={onClearDimensionFilter}
            onClearAllFilters={onClearAllFilters}
          />
        )}

        {/* Metric Filters — always available when metrics selected */}
        {!loading && selectedMetrics.size > 0 && (
          <MetricFilterSection
            selectedMetricsCatalog={
              catalog?.metrics.filter((m) => selectedMetrics.has(m.name)) ?? []
            }
            metricFilters={metricFilters}
            onSetMetricFilter={onSetMetricFilter}
            onClearAllMetricFilters={onClearAllMetricFilters}
          />
        )}

        {/* Time Dimensions Info */}
        {catalog && catalog.time_dimensions.length > 0 && (
          <div className="px-3 py-3 border-b border-sidebar-border">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-3.5 w-3.5 text-sidebar-accent" />
              <span className="text-xs font-medium text-sidebar-foreground/70">
                Time Column
              </span>
            </div>
            {catalog.time_dimensions.map((td) => (
              <span
                key={td.name}
                className="text-xs text-sidebar-foreground/50 block"
                title={td.display_name || undefined}
              >
                {td.name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Explore Button */}
      <div className="shrink-0 p-3 border-t border-sidebar-border">
        <button
          onClick={onExplore}
          disabled={!canExplore || exploring}
          className={cn(
            'w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all',
            canExplore && !exploring
              ? 'bg-sidebar-accent text-white hover:opacity-90 shadow-sm shadow-sidebar-accent/25'
              : 'bg-sidebar-muted text-sidebar-foreground/40 cursor-not-allowed'
          )}
        >
          {exploring ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Exploring...
            </>
          ) : (
            <>
              <Play className="h-4 w-4" />
              Explore
            </>
          )}
        </button>
      </div>
      </div>

      {/* Resize handle */}
      <div
        onMouseDown={startResize}
        className="w-2 cursor-col-resize flex items-center justify-center hover:bg-sidebar-accent/20 transition-colors group border-r border-sidebar-border"
      >
        <GripVertical className="h-4 w-4 text-sidebar-foreground/30 group-hover:text-sidebar-accent" />
      </div>
    </aside>
  )
}
