export type VegaLiteSpec = Record<string, unknown>

export type MetricOperator = '>' | '>=' | '=' | '<=' | '<'

export interface MetricFilter {
  op: MetricOperator
  val: string
}

export interface ExploreResult {
  text: string
  chart: VegaLiteSpec
  data: string[][]
  prompt: string
  messageId: string | null
}

export type ExploreStatus = 'idle' | 'loading' | 'success' | 'error'

export interface ExploreState {
  status: ExploreStatus
  result: ExploreResult | null
  error: string | null
}
