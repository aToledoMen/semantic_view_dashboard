import { useState } from 'react'
import { SlidersHorizontal, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { SidebarSection } from './SidebarSection'
import type { CatalogMetric } from '@/types/catalog'
import type { MetricFilter, MetricOperator } from '@/types/explore'

const OPERATORS: { value: MetricOperator; label: string }[] = [
  { value: '>', label: '>' },
  { value: '>=', label: '>=' },
  { value: '=', label: '=' },
  { value: '<=', label: '<=' },
  { value: '<', label: '<' },
]

interface MetricFilterSectionProps {
  selectedMetricsCatalog: CatalogMetric[]
  metricFilters: Map<string, MetricFilter>
  onSetMetricFilter: (metricName: string, filter: MetricFilter | null) => void
  onClearAllMetricFilters: () => void
}

export function MetricFilterSection({
  selectedMetricsCatalog,
  metricFilters,
  onSetMetricFilter,
  onClearAllMetricFilters,
}: MetricFilterSectionProps) {
  const activeCount = metricFilters.size

  if (selectedMetricsCatalog.length === 0) return null

  return (
    <SidebarSection
      title="Metric Filters"
      icon={<SlidersHorizontal className="h-4 w-4" />}
      count={selectedMetricsCatalog.length}
      selectedCount={activeCount}
      defaultOpen={true}
      searchable={false}
      searchValue=""
      onSearchChange={() => {}}
    >
      {activeCount > 0 && (
        <div className="px-2 pb-1.5">
          <button
            onClick={onClearAllMetricFilters}
            className="text-[11px] text-sidebar-accent hover:underline"
          >
            Clear all ({activeCount})
          </button>
        </div>
      )}

      {selectedMetricsCatalog.map((metric) => (
        <MetricFilterRow
          key={metric.name}
          metric={metric}
          filter={metricFilters.get(metric.name) ?? null}
          onSet={(filter) => onSetMetricFilter(metric.name, filter)}
        />
      ))}
    </SidebarSection>
  )
}

function MetricFilterRow({
  metric,
  filter,
  onSet,
}: {
  metric: CatalogMetric
  filter: MetricFilter | null
  onSet: (filter: MetricFilter | null) => void
}) {
  const [isExpanded, setIsExpanded] = useState(filter !== null)
  const [op, setOp] = useState<MetricOperator>(filter?.op ?? '>')
  const [val, setVal] = useState(filter?.val ?? '')

  function handleApply() {
    const trimmed = val.trim()
    if (!trimmed) return
    onSet({ op, val: trimmed })
  }

  function handleClear() {
    onSet(null)
    setVal('')
    setOp('>')
  }

  return (
    <div className="px-1 py-1">
      <div className="flex items-center justify-between px-1 mb-0.5">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1.5 text-xs font-medium text-sidebar-foreground/70 hover:text-sidebar-foreground transition-colors"
        >
          <ChevronRight
            className={cn(
              'h-3 w-3 transition-transform duration-200',
              isExpanded && 'rotate-90'
            )}
          />
          <span title={metric.display_name || undefined}>{metric.name}</span>
          {filter && (
            <span className="text-[10px] bg-sidebar-accent text-white px-1.5 py-0 rounded-full leading-4">
              {filter.op} {filter.val}
            </span>
          )}
        </button>
        {filter && (
          <button
            onClick={handleClear}
            className="text-[10px] text-sidebar-foreground/40 hover:text-sidebar-accent transition-colors"
          >
            clear
          </button>
        )}
      </div>

      {isExpanded && (
        <div className="pl-4 pr-1 pt-1 space-y-1.5">
          <div className="flex items-center gap-1.5">
            {/* Operator selector */}
            <select
              value={op}
              onChange={(e) => setOp(e.target.value as MetricOperator)}
              className="h-6 px-1.5 text-[11px] bg-sidebar-muted border border-sidebar-border text-sidebar-foreground rounded focus:outline-none focus:ring-1 focus:ring-sidebar-accent"
            >
              {OPERATORS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>

            {/* Value input */}
            <Input
              type="number"
              value={val}
              onChange={(e) => setVal(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleApply()
                }
              }}
              placeholder="Value..."
              className="h-6 flex-1 text-[11px] bg-sidebar-muted border-sidebar-border text-sidebar-foreground placeholder:text-sidebar-foreground/40 focus-visible:ring-sidebar-accent"
            />

            {/* Apply button */}
            <button
              onClick={handleApply}
              disabled={!val.trim()}
              className={cn(
                'h-6 px-2 text-[11px] font-medium rounded transition-colors',
                val.trim()
                  ? 'bg-sidebar-accent text-white hover:opacity-90'
                  : 'bg-sidebar-muted text-sidebar-foreground/30 cursor-not-allowed'
              )}
            >
              Set
            </button>
          </div>
          {filter && (
            <button
              onClick={handleClear}
              className="text-[10px] text-sidebar-accent hover:underline"
            >
              Remove filter ({filter.op} {filter.val})
            </button>
          )}
        </div>
      )}
    </div>
  )
}
