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
