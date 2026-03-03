import Domo from 'ryuu.js'
import type { CatalogResponse } from '@/types/catalog'
import type { ExploreResult } from '@/types/explore'
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
  filters?: Record<string, string[]>
): Promise<ExploreResult> {
  const url = `${CE_BASE}/explore`
  const requestBody: Record<string, unknown> = { metrics, dimensions }
  if (timeGrain) requestBody.time_grain = timeGrain
  if (filters && Object.keys(filters).length > 0) {
    requestBody.filters = Object.entries(filters).map(([dim, values]) => ({
      dim,
      op: 'IN',
      val: values,
    }))
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
