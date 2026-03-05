import { useState } from 'react'
import { Filter, ChevronRight, Search, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { SidebarSection } from './SidebarSection'
import type { CatalogDimension } from '@/types/catalog'

interface DimensionFilterSectionProps {
  selectedDimensionsCatalog: CatalogDimension[]
  dimensionFilters: Map<string, Set<string>>
  knownDimensionValues: Map<string, string[]>
  onToggleFilter: (dimensionName: string, value: string) => void
  onClearDimensionFilter: (dimensionName: string) => void
  onClearAllFilters: () => void
}

export function DimensionFilterSection({
  selectedDimensionsCatalog,
  dimensionFilters,
  knownDimensionValues,
  onToggleFilter,
  onClearDimensionFilter,
  onClearAllFilters,
}: DimensionFilterSectionProps) {
  const totalFilterCount = Array.from(dimensionFilters.values()).reduce(
    (sum, set) => sum + set.size,
    0
  )

  if (selectedDimensionsCatalog.length === 0) return null

  return (
    <SidebarSection
      title="Filters"
      icon={<Filter className="h-4 w-4" />}
      count={selectedDimensionsCatalog.length}
      selectedCount={totalFilterCount}
      defaultOpen={true}
      searchable={false}
      searchValue=""
      onSearchChange={() => {}}
    >
      {totalFilterCount > 0 && (
        <div className="px-2 pb-1.5">
          <button
            onClick={onClearAllFilters}
            className="text-[11px] text-sidebar-accent hover:underline"
          >
            Clear all filters ({totalFilterCount})
          </button>
        </div>
      )}

      {selectedDimensionsCatalog.map((dim) => (
        <DimensionFilterGroup
          key={dim.name}
          dimension={dim}
          selectedValues={dimensionFilters.get(dim.name) ?? new Set()}
          knownValues={knownDimensionValues.get(dim.name) ?? []}
          onToggle={(value) => onToggleFilter(dim.name, value)}
          onClear={() => onClearDimensionFilter(dim.name)}
        />
      ))}
    </SidebarSection>
  )
}

function DimensionFilterGroup({
  dimension,
  selectedValues,
  knownValues,
  onToggle,
  onClear,
}: {
  dimension: CatalogDimension
  selectedValues: Set<string>
  knownValues: string[]
  onToggle: (value: string) => void
  onClear: () => void
}) {
  const [search, setSearch] = useState('')
  const [customInput, setCustomInput] = useState('')
  const [isExpanded, setIsExpanded] = useState(selectedValues.size > 0)

  // Merge known values (from results) + sample values (from catalog) + custom selected values
  const sampleValues = dimension.sample_values ?? []
  const allValuesSet = new Set([...knownValues, ...sampleValues])
  // Also include any selected values that aren't in the known/sample sets (custom entries)
  selectedValues.forEach((v) => allValuesSet.add(v))
  const allValues = Array.from(allValuesSet).sort()

  const filteredValues = search
    ? allValues.filter((v) => v.toLowerCase().includes(search.toLowerCase()))
    : allValues

  const hasFilters = selectedValues.size > 0
  const hasValues = allValues.length > 0
  const showSearch = allValues.length > 5

  function handleAddCustom() {
    const trimmed = customInput.trim()
    if (!trimmed) return
    onToggle(trimmed)
    setCustomInput('')
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
          <span title={dimension.description || undefined}>{dimension.name}</span>
          {hasFilters && (
            <span className="text-[10px] bg-sidebar-accent text-white px-1.5 py-0 rounded-full min-w-[16px] text-center leading-4">
              {selectedValues.size}
            </span>
          )}
        </button>
        {hasFilters && (
          <button
            onClick={onClear}
            className="text-[10px] text-sidebar-foreground/40 hover:text-sidebar-accent transition-colors"
          >
            clear
          </button>
        )}
      </div>

      {isExpanded && (
        <div className="pl-4">
          {/* Search (only when enough values) */}
          {showSearch && (
            <div className="pr-1 pb-1.5">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-sidebar-foreground/40" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search values..."
                  className="h-6 pl-6 text-[11px] bg-sidebar-muted border-sidebar-border text-sidebar-foreground placeholder:text-sidebar-foreground/40 focus-visible:ring-sidebar-accent"
                />
              </div>
            </div>
          )}

          {/* Known values as checkboxes */}
          {hasValues && (
            <div className="max-h-[160px] overflow-y-auto pr-1">
              {filteredValues.length === 0 ? (
                <p className="text-[11px] text-sidebar-foreground/40 px-1 py-1 text-center">
                  No matching values
                </p>
              ) : (
                filteredValues.map((value) => (
                  <label
                    key={value}
                    className="flex items-center gap-2 px-1 py-1 rounded hover:bg-sidebar-muted cursor-pointer transition-colors"
                  >
                    <Checkbox
                      checked={selectedValues.has(value)}
                      onCheckedChange={() => onToggle(value)}
                      className="h-3.5 w-3.5 border-sidebar-border data-[state=checked]:bg-sidebar-accent data-[state=checked]:border-sidebar-accent"
                    />
                    <span className="text-[11px] text-sidebar-foreground truncate">
                      {value}
                    </span>
                  </label>
                ))
              )}
            </div>
          )}

          {/* Hint when no values yet */}
          {!hasValues && (
            <p className="text-[10px] text-sidebar-foreground/30 px-1 py-1 italic">
              Run Explore to discover values, or add manually
            </p>
          )}

          {/* Custom value input */}
          <div className="pr-1 pt-1.5">
            <div className="relative">
              <Input
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleAddCustom()
                  }
                }}
                placeholder="Add value..."
                className="h-6 pl-2 pr-7 text-[11px] bg-sidebar-muted border-sidebar-border text-sidebar-foreground placeholder:text-sidebar-foreground/40 focus-visible:ring-sidebar-accent"
              />
              {customInput.trim() && (
                <button
                  onClick={handleAddCustom}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 text-sidebar-accent hover:text-sidebar-foreground transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
