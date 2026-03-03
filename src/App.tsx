import { useState, useEffect } from 'react'
import { HeaderBar } from '@/components/HeaderBar'
import { Sidebar } from '@/components/Sidebar'
import { MainContent } from '@/components/MainContent'
import { fetchCatalog, exploreData } from '@/lib/api'
import type { CatalogResponse } from '@/types/catalog'
import type { ExploreState } from '@/types/explore'

function App() {
  const [catalog, setCatalog] = useState<CatalogResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [selectedMetrics, setSelectedMetrics] = useState<Set<string>>(new Set())
  const [selectedDimensions, setSelectedDimensions] = useState<Set<string>>(new Set())
  const [selectedTimeGrain, setSelectedTimeGrain] = useState<string | null>(null)
  const [dimensionFilters, setDimensionFilters] = useState<Map<string, Set<string>>>(new Map())
  const [knownDimensionValues, setKnownDimensionValues] = useState<Map<string, string[]>>(new Map())

  const [exploreState, setExploreState] = useState<ExploreState>({
    status: 'idle',
    result: null,
    error: null,
  })

  const canExplore = selectedMetrics.size >= 1 && selectedDimensions.size >= 1

  useEffect(() => {
    loadCatalog()
  }, [])

  async function loadCatalog() {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchCatalog()
      setCatalog(data)
    } catch (err: any) {
      setError(err?.message || 'Failed to load catalog')
      console.error('Error loading catalog:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleExplore() {
    if (!canExplore) return

    setExploreState({ status: 'loading', result: null, error: null })

    const filters: Record<string, string[]> = {}
    dimensionFilters.forEach((values, dimName) => {
      if (values.size > 0) filters[dimName] = Array.from(values)
    })

    try {
      const result = await exploreData(
        Array.from(selectedMetrics),
        Array.from(selectedDimensions),
        selectedTimeGrain,
        Object.keys(filters).length > 0 ? filters : undefined
      )
      setExploreState({ status: 'success', result, error: null })
      extractDimensionValues(result)
    } catch (err: any) {
      setExploreState({
        status: 'error',
        result: null,
        error: err?.message || 'Failed to explore data',
      })
      console.error('Error exploring:', err)
    }
  }

  function toggleInSet(
    setter: React.Dispatch<React.SetStateAction<Set<string>>>,
    value: string
  ) {
    setter((prev) => {
      const next = new Set(prev)
      if (next.has(value)) {
        next.delete(value)
      } else {
        next.add(value)
      }
      return next
    })
  }

  function handleToggleDimension(name: string) {
    // If deselecting, clear its filters
    if (selectedDimensions.has(name)) {
      setDimensionFilters((prev) => {
        const next = new Map(prev)
        next.delete(name)
        return next
      })
    }
    toggleInSet(setSelectedDimensions, name)
  }

  function toggleDimensionFilter(dimensionName: string, value: string) {
    setDimensionFilters((prev) => {
      const next = new Map(prev)
      const current = next.get(dimensionName) ?? new Set<string>()
      const updated = new Set(current)
      if (updated.has(value)) {
        updated.delete(value)
      } else {
        updated.add(value)
      }
      if (updated.size === 0) {
        next.delete(dimensionName)
      } else {
        next.set(dimensionName, updated)
      }
      return next
    })
  }

  function clearDimensionFilter(dimensionName: string) {
    setDimensionFilters((prev) => {
      const next = new Map(prev)
      next.delete(dimensionName)
      return next
    })
  }

  function clearAllFilters() {
    setDimensionFilters(new Map())
  }

  function extractDimensionValues(result: ExploreState['result']) {
    if (!result?.chart || !catalog) return
    const dataValues = (result.chart.data as any)?.values as Record<string, unknown>[] | undefined
    if (!dataValues || dataValues.length === 0) return

    const columns = Object.keys(dataValues[0])
    const dims = [...catalog.dimensions, ...catalog.time_dimensions]

    setKnownDimensionValues((prev) => {
      const next = new Map(prev)
      for (const dim of dims) {
        // Match dimension to chart column by name or display_name
        const col = columns.find(
          (c) =>
            c === dim.name ||
            c === dim.display_name ||
            c.toLowerCase() === dim.name.toLowerCase().replace(/_/g, ' ') ||
            c.toLowerCase() === dim.display_name.toLowerCase()
        )
        if (!col) continue
        const existing = new Set(prev.get(dim.name) ?? [])
        for (const row of dataValues) {
          const val = row[col]
          if (val != null && val !== '') existing.add(String(val))
        }
        next.set(dim.name, Array.from(existing).sort())
      }
      return next
    })
  }

  const totalSelected =
    selectedMetrics.size +
    selectedDimensions.size +
    (selectedTimeGrain ? 1 : 0)

  if (error) {
    return (
      <div className="h-screen flex flex-col">
        <HeaderBar semanticView={null} loading={false} />
        <div className="flex-1 flex items-center justify-center bg-background">
          <div className="text-center max-w-sm px-6">
            <div className="mx-auto mb-4 w-14 h-14 rounded-xl bg-destructive/10 flex items-center justify-center">
              <span className="text-2xl">!</span>
            </div>
            <h2 className="text-lg font-semibold text-foreground mb-2">
              Connection Error
            </h2>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <button
              onClick={loadCatalog}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <HeaderBar
        semanticView={catalog?.semantic_view ?? null}
        loading={loading}
      />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          catalog={catalog}
          loading={loading}
          selectedMetrics={selectedMetrics}
          selectedDimensions={selectedDimensions}
          selectedTimeGrain={selectedTimeGrain}
          onToggleMetric={(name) => toggleInSet(setSelectedMetrics, name)}
          onToggleDimension={handleToggleDimension}
          onSelectTimeGrain={setSelectedTimeGrain}
          dimensionFilters={dimensionFilters}
          knownDimensionValues={knownDimensionValues}
          onToggleDimensionFilter={toggleDimensionFilter}
          onClearDimensionFilter={clearDimensionFilter}
          onClearAllFilters={clearAllFilters}
          canExplore={canExplore}
          exploring={exploreState.status === 'loading'}
          onExplore={handleExplore}
        />
        <MainContent
          selectedCount={totalSelected}
          exploreState={exploreState}
          canExplore={canExplore}
        />
      </div>
    </div>
  )
}

export default App
