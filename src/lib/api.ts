import Domo from 'ryuu.js'
import type { CatalogResponse } from '@/types/catalog'
import type { ExploreResult } from '@/types/explore'
import type { QueryResult, BatchQuery, BatchResults } from '@/types/dashboard'
import { SNOWFLAKE_CONFIG } from '@/config'

const CE_BASE = '/domo/codeengine/v2/packages'

export async function fetchCatalog(): Promise<CatalogResponse> {
  const url = `${CE_BASE}/getCatalog`
  const body = {
    snowflakeAccount: SNOWFLAKE_CONFIG.account,
    snowflakeDatabase: SNOWFLAKE_CONFIG.database,
    snowflakeSchema: SNOWFLAKE_CONFIG.schema,
    semanticView: SNOWFLAKE_CONFIG.semanticView,
  }
  console.log('[API] fetchCatalog → POST', url, body)

  try {
    const response = await Domo.post<{ result: CatalogResponse }>(url, body)
    console.log('[API] fetchCatalog ← response:', response)
    return response.result
  } catch (error) {
    console.error('[API] fetchCatalog ✗ error:', error)
    throw error
  }
}

export async function exploreData(
  metrics: string[],
  dimensions: string[],
  timeGrain?: string | null,
  dimensionFilters?: Record<string, string[]>,
  metricFilters?: Record<string, { op: string; val: string }>
): Promise<ExploreResult> {
  const url = `${CE_BASE}/explore`
  const requestBody: Record<string, unknown> = { metrics, dimensions }
  if (timeGrain) requestBody.time_grain = timeGrain

  const allFilters: { dim: string; op: string; val: string | string[] }[] = []

  if (dimensionFilters && Object.keys(dimensionFilters).length > 0) {
    for (const [dim, values] of Object.entries(dimensionFilters)) {
      allFilters.push({ dim, op: 'IN', val: values })
    }
  }

  if (metricFilters && Object.keys(metricFilters).length > 0) {
    for (const [dim, filter] of Object.entries(metricFilters)) {
      allFilters.push({ dim, op: filter.op, val: filter.val })
    }
  }

  if (allFilters.length > 0) {
    requestBody.filters = allFilters
  }

  const body = {
    snowflakeAccount: SNOWFLAKE_CONFIG.account,
    snowflakeDatabase: SNOWFLAKE_CONFIG.database,
    snowflakeSchema: SNOWFLAKE_CONFIG.schema,
    snowflakeAgent: SNOWFLAKE_CONFIG.agent,
    requestBody,
  }
  console.log('[API] explore → POST', url, body)

  try {
    const response = await Domo.post<{ result: ExploreResult }>(url, body)
    console.log('[API] explore ← response:', response)
    return response.result
  } catch (error) {
    console.error('[API] explore ✗ error:', error)
    throw error
  }
}

export async function executeQuery(sql: string): Promise<QueryResult> {
  const url = `${CE_BASE}/executeQuery`
  const body = {
    snowflakeAccount: SNOWFLAKE_CONFIG.account,
    snowflakeDatabase: SNOWFLAKE_CONFIG.database,
    snowflakeSchema: SNOWFLAKE_CONFIG.schema,
    snowflakeWH: SNOWFLAKE_CONFIG.warehouse,
    sql,
  }
  console.log('[API] executeQuery → POST', url, body)

  try {
    const response = await Domo.post<{ result: QueryResult }>(url, body)
    console.log('[API] executeQuery ← response:', response)
    return response.result
  } catch (error) {
    console.error('[API] executeQuery ✗ error:', error)
    throw error
  }
}

export async function executeBatch(queries: BatchQuery[]): Promise<BatchResults> {
  const url = `${CE_BASE}/executeBatchSqlApi`
  const body = {
    snowflakeAccount: SNOWFLAKE_CONFIG.account,
    snowflakeDatabase: SNOWFLAKE_CONFIG.database,
    snowflakeSchema: SNOWFLAKE_CONFIG.schema,
    snowflakeWH: SNOWFLAKE_CONFIG.warehouse,
    queries: queries.map(q => ({ ...q, sql: q.sql.replace(/\n/g, ' ') })),
  }
  console.log(`[API] executeBatch → POST ${url} (${queries.length} queries)`)

  try {
    const response = await Domo.post<any>(url, body)
    console.log('[API] executeBatch ← raw response:', response)

    // Unwrap: CE may double-wrap as { result: { result: { ... } } }
    let data = response.result ?? response
    if (data.result && !data.columns) data = data.result

    // Convert string values to numbers where possible
    for (const key of Object.keys(data)) {
      const item = data[key]
      if (item?.rows) {
        item.rows = item.rows.map((row: Record<string, unknown>) => {
          const converted: Record<string, unknown> = {}
          for (const [col, val] of Object.entries(row)) {
            if (typeof val === 'string' && val !== '' && !isNaN(Number(val))) {
              converted[col] = Number(val)
            } else {
              converted[col] = val
            }
          }
          return converted
        })
      }
    }

    return data
  } catch (error) {
    console.error('[API] executeBatch ✗ error:', error)
    throw error
  }
}
