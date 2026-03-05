export interface DashboardWidget {
  id: string
  title: string
  type: 'kpi' | 'bar' | 'line' | 'multiline' | 'donut' | 'area' | 'composed' | 'treemap' | 'table'
  sql: string
  colSpan: 1 | 2 | 3 | 4
}

export interface QueryResult {
  columns: string[]
  rows: Record<string, unknown>[]
}

export type WidgetStatus = 'idle' | 'loading' | 'success' | 'error'

export interface WidgetState {
  status: WidgetStatus
  data: QueryResult | null
  error: string | null
}

export interface BatchQuery {
  id: string
  sql: string
}

export interface BatchResultItem {
  columns?: string[]
  rows?: Record<string, unknown>[]
  error?: string
}

export type BatchResults = Record<string, BatchResultItem>

export type TimeGrain = 'YEAR' | 'MONTH' | 'DAY'

export interface DrillState {
  grain: TimeGrain
  year?: number
  month?: number
}

export interface DimDrillState {
  parentValue: string // e.g., 'EUROPE'
}
