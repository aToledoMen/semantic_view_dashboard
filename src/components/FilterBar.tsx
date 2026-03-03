import { useState } from 'react'
import {
  Filter,
  ChevronDown,
  X,
  Search,
  Plus,
  RotateCw,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { CatalogDimension } from '@/types/catalog'

interface FilterBarProps {
  selectedDimensionsCatalog: CatalogDimension[]
  dimensionFilters: Map<string, Set<string>>
  knownDimensionValues: Map<string, string[]>
  onToggleFilter: (dimensionName: string, value: string) => void
  onClearDimensionFilter: (dimensionName: string) => void
  onClearAllFilters: () => void
  onReExplore: () => void
  exploring: boolean
}

export function FilterBar({
  selectedDimensionsCatalog,
  dimensionFilters,
  knownDimensionValues,
  onToggleFilter,
  onClearDimensionFilter,
  onClearAllFilters,
  onReExplore,
  exploring,
}: FilterBarProps) {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)

  const totalFilterCount = Array.from(dimensionFilters.values()).reduce(
    (sum, set) => sum + set.size,
    0
  )

  if (selectedDimensionsCatalog.length === 0) return null

  const hasActiveFilters = totalFilterCount > 0

  return (
    <section className="bg-card rounded-lg border border-border p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">
            Refine Results
          </h3>
          {hasActiveFilters && (
            <span className="text-xs bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full min-w-[20px] text-center leading-none">
              {totalFilterCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <button
              onClick={onClearAllFilters}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Clear all
            </button>
          )}
          {hasActiveFilters && (
            <button
              onClick={onReExplore}
              disabled={exploring}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                exploring
                  ? 'bg-muted text-muted-foreground cursor-not-allowed'
                  : 'bg-primary text-primary-foreground hover:opacity-90'
              )}
            >
              <RotateCw
                className={cn('h-3 w-3', exploring && 'animate-spin')}
              />
              {exploring ? 'Exploring...' : 'Apply Filters'}
            </button>
          )}
        </div>
      </div>

      {/* Dimension filter dropdowns */}
      <div className="flex flex-wrap gap-2">
        {selectedDimensionsCatalog.map((dim) => {
          const selectedValues = dimensionFilters.get(dim.name) ?? new Set()
          const isOpen = openDropdown === dim.name
          const filterCount = selectedValues.size

          return (
            <div key={dim.name} className="relative">
              <button
                onClick={() => setOpenDropdown(isOpen ? null : dim.name)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-all',
                  filterCount > 0
                    ? 'border-primary/50 bg-primary/10 text-primary'
                    : 'border-border bg-muted/50 text-muted-foreground hover:bg-muted'
                )}
                title={dim.display_name || undefined}
              >
                {dim.name}
                {filterCount > 0 && (
                  <span className="bg-primary text-primary-foreground px-1 py-0 rounded text-[10px] leading-4 min-w-[16px] text-center">
                    {filterCount}
                  </span>
                )}
                <ChevronDown
                  className={cn(
                    'h-3 w-3 transition-transform',
                    isOpen && 'rotate-180'
                  )}
                />
              </button>

              {/* Active filter chips */}
              {filterCount > 0 && !isOpen && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {Array.from(selectedValues).map((val) => (
                    <span
                      key={val}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[11px]"
                    >
                      {val}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onToggleFilter(dim.name, val)
                        }}
                        className="hover:text-destructive transition-colors"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Dropdown panel */}
              {isOpen && (
                <FilterDropdown
                  dimension={dim}
                  selectedValues={selectedValues}
                  knownValues={knownDimensionValues.get(dim.name) ?? []}
                  onToggle={(value) => onToggleFilter(dim.name, value)}
                  onClear={() => {
                    onClearDimensionFilter(dim.name)
                  }}
                  onClose={() => setOpenDropdown(null)}
                />
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}

function FilterDropdown({
  dimension,
  selectedValues,
  knownValues,
  onToggle,
  onClear,
  onClose,
}: {
  dimension: CatalogDimension
  selectedValues: Set<string>
  knownValues: string[]
  onToggle: (value: string) => void
  onClear: () => void
  onClose: () => void
}) {
  const [search, setSearch] = useState('')
  const [customInput, setCustomInput] = useState('')

  const sampleValues = dimension.sample_values ?? []
  const allValuesSet = new Set([...knownValues, ...sampleValues])
  selectedValues.forEach((v) => allValuesSet.add(v))
  const allValues = Array.from(allValuesSet).sort()

  const filteredValues = search
    ? allValues.filter((v) => v.toLowerCase().includes(search.toLowerCase()))
    : allValues

  const showSearch = allValues.length > 5

  function handleAddCustom() {
    const trimmed = customInput.trim()
    if (!trimmed) return
    onToggle(trimmed)
    setCustomInput('')
  }

  return (
    <div className="absolute top-full left-0 mt-1 z-50 w-64 bg-card rounded-lg border border-border shadow-lg p-3 space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span
          className="text-xs font-medium text-foreground"
          title={dimension.display_name || undefined}
        >
          {dimension.name}
        </span>
        <div className="flex items-center gap-2">
          {selectedValues.size > 0 && (
            <button
              onClick={onClear}
              className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
            >
              Clear
            </button>
          )}
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Search */}
      {showSearch && (
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search values..."
            className="h-7 pl-7 text-xs"
          />
        </div>
      )}

      {/* Value checkboxes */}
      {allValues.length > 0 ? (
        <ScrollArea className="max-h-[180px]">
          {filteredValues.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-2">
              No matching values
            </p>
          ) : (
            <div className="space-y-0.5">
              {filteredValues.map((value) => (
                <label
                  key={value}
                  className="flex items-center gap-2 px-1.5 py-1 rounded hover:bg-muted cursor-pointer transition-colors"
                >
                  <Checkbox
                    checked={selectedValues.has(value)}
                    onCheckedChange={() => onToggle(value)}
                    className="h-3.5 w-3.5"
                  />
                  <span className="text-xs text-foreground truncate">
                    {value}
                  </span>
                </label>
              ))}
            </div>
          )}
        </ScrollArea>
      ) : (
        <p className="text-xs text-muted-foreground italic text-center py-2">
          Run Explore to discover values, or add manually
        </p>
      )}

      {/* Custom value input */}
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
          placeholder="Add custom value..."
          className="h-7 pr-7 text-xs"
        />
        {customInput.trim() && (
          <button
            onClick={handleAddCustom}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-primary hover:text-foreground transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}
