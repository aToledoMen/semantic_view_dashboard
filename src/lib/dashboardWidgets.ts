import type { DashboardWidget, DrillState } from '@/types/dashboard'
import { SNOWFLAKE_CONFIG } from '@/config'

export type DashboardFilters = Record<string, string[]>

const VIEW = `${SNOWFLAKE_CONFIG.database}.${SNOWFLAKE_CONFIG.schema}.${SNOWFLAKE_CONFIG.semanticView}`

/**
 * Map metric/dimension names to their owning table in the semantic view.
 * Derived from: DESCRIBE SEMANTIC VIEW ATM_DB.SALES.TPCH_ANALYSIS
 */
const TABLE_MAP: Record<string, string> = {
  CUSTOMER_COUNT: 'CUSTOMER',
  ORDER_COUNT: 'ORDERS',
  ORDER_AVERAGE_VALUE: 'ORDERS',
  CUSTOMER_COUNTRY_CODE: 'CUSTOMER',
  CUSTOMER_MARKET_SEGMENT: 'CUSTOMER',
  CUSTOMER_NAME: 'CUSTOMER',
  CUSTOMER_NATION_NAME: 'NATION',
  O_ORDERKEY: 'ORDERS',
  ORDER_DATE: 'ORDERS',
  CUSTOMER_REGION_NAME: 'REGION',
  LINE_ITEM_ID: 'LINEITEM',
}

function q(name: string): string {
  const table = TABLE_MAP[name]
  return table ? `${table}.${name}` : name
}

/**
 * Build a SEMANTIC_VIEW SQL query with optional filtering.
 *
 * Uses the native WHERE clause inside SEMANTIC_VIEW() which filters
 * records before metric computation — no subquery wrapping needed.
 * See: https://docs.snowflake.com/en/sql-reference/constructs/semantic_view
 */
function svQuery(
  metrics: string[],
  dimensions?: string[],
  orderBy?: string,
  limit?: number,
  filters?: DashboardFilters
): string {
  const clauses: string[] = []
  if (dimensions && dimensions.length > 0) {
    clauses.push(`DIMENSIONS ${dimensions.map(q).join(', ')}`)
  }
  clauses.push(`METRICS ${metrics.map(q).join(', ')}`)

  // WHERE inside SEMANTIC_VIEW filters before metric computation
  if (filters) {
    const whereParts: string[] = []
    for (const [dim, values] of Object.entries(filters)) {
      if (values.length > 0) {
        const escaped = values.map(v => `'${v.replace(/'/g, "''")}'`).join(', ')
        whereParts.push(`${q(dim)} IN (${escaped})`)
      }
    }
    if (whereParts.length > 0) {
      clauses.push(`WHERE ${whereParts.join(' AND ')}`)
    }
  }

  let sql = `SELECT * FROM SEMANTIC_VIEW(\n  ${VIEW}\n  ${clauses.join('\n  ')}\n)`
  if (orderBy) sql += `\nORDER BY ${orderBy}`
  if (limit) sql += `\nLIMIT ${limit}`
  return sql
}

/** Wrap a SEMANTIC_VIEW query to aggregate time-based metrics by year */
function svQueryByYear(
  metric: string,
  timeDim: string,
  alias: string,
  filters?: DashboardFilters
): string {
  const inner = svQuery([metric], [timeDim], undefined, undefined, filters)
  return `SELECT DATE_TRUNC('YEAR', ${timeDim}) AS YEAR, SUM(${metric}) AS ${alias}\nFROM (${inner})\nGROUP BY YEAR\nORDER BY YEAR`
}

/** Aggregate by year + a dimension for multi-series line charts */
function svQueryByYearAndDim(
  metric: string,
  timeDim: string,
  dim: string,
  filters?: DashboardFilters
): string {
  const inner = svQuery([metric], [timeDim, dim], undefined, undefined, filters)
  return `SELECT DATE_TRUNC('YEAR', ${timeDim}) AS YEAR, ${dim}, SUM(${metric}) AS ${metric}\nFROM (${inner})\nGROUP BY YEAR, ${dim}\nORDER BY YEAR`
}

/* ── Drill-down query builders ── */

function buildDrillWhere(timeDim: string, drillState: DrillState): string {
  if (drillState.grain === 'MONTH' && drillState.year != null) {
    return `WHERE ${timeDim} >= '${drillState.year}-01-01' AND ${timeDim} < '${drillState.year + 1}-01-01'`
  }
  if (drillState.grain === 'DAY' && drillState.year != null && drillState.month != null) {
    const mm = String(drillState.month).padStart(2, '0')
    let nextYear = drillState.year
    let nextMonth = drillState.month + 1
    if (nextMonth > 12) { nextYear++; nextMonth = 1 }
    const nmm = String(nextMonth).padStart(2, '0')
    return `WHERE ${timeDim} >= '${drillState.year}-${mm}-01' AND ${timeDim} < '${nextYear}-${nmm}-01'`
  }
  return ''
}

function svQueryByGrain(
  metric: string,
  timeDim: string,
  alias: string,
  drillState: DrillState,
  filters?: DashboardFilters
): string {
  const inner = svQuery([metric], [timeDim], undefined, undefined, filters)
  const parts = [
    `SELECT DATE_TRUNC('${drillState.grain}', ${timeDim}) AS PERIOD, SUM(${metric}) AS ${alias}`,
    `FROM (${inner})`,
  ]
  const where = buildDrillWhere(timeDim, drillState)
  if (where) parts.push(where)
  parts.push('GROUP BY PERIOD', 'ORDER BY PERIOD')
  return parts.join('\n')
}

function svQueryByGrainAndDim(
  metric: string,
  timeDim: string,
  dim: string,
  drillState: DrillState,
  filters?: DashboardFilters
): string {
  const inner = svQuery([metric], [timeDim, dim], undefined, undefined, filters)
  const parts = [
    `SELECT DATE_TRUNC('${drillState.grain}', ${timeDim}) AS PERIOD, ${dim}, SUM(${metric}) AS ${metric}`,
    `FROM (${inner})`,
  ]
  const where = buildDrillWhere(timeDim, drillState)
  if (where) parts.push(where)
  parts.push(`GROUP BY PERIOD, ${dim}`, 'ORDER BY PERIOD')
  return parts.join('\n')
}

const DRILL_CONFIGS: Record<string, {
  type: 'single' | 'dim'
  metric: string
  timeDim: string
  alias?: string
  dim?: string
}> = {
  'chart-orders-over-time': { type: 'dim', metric: 'ORDER_COUNT', timeDim: 'ORDER_DATE', dim: 'CUSTOMER_REGION_NAME' },
  'chart-avg-value-trend': { type: 'single', metric: 'ORDER_AVERAGE_VALUE', timeDim: 'ORDER_DATE', alias: 'ORDER_AVERAGE_VALUE' },
  'chart-orders-area': { type: 'single', metric: 'ORDER_COUNT', timeDim: 'ORDER_DATE', alias: 'ORDER_COUNT' },
}

export const DRILLABLE_WIDGETS = new Set(Object.keys(DRILL_CONFIGS))

export function buildDrillQuery(
  widgetId: string,
  drillState: DrillState,
  dashFilters?: DashboardFilters
): string | null {
  const config = DRILL_CONFIGS[widgetId]
  if (!config) return null
  const f = dashFilters && Object.keys(dashFilters).length > 0 ? dashFilters : undefined
  if (config.type === 'dim') {
    return svQueryByGrainAndDim(config.metric, config.timeDim, config.dim!, drillState, f)
  }
  return svQueryByGrain(config.metric, config.timeDim, config.alias!, drillState, f)
}

/* ── Dimensional drill (Region → Nation) ── */

const DIM_DRILL_CONFIGS: Record<string, {
  metric: string
  parentDim: string
  childDim: string
  parentLabel: string
  childLabel: string
}> = {
  'chart-orders-by-region': {
    metric: 'ORDER_COUNT',
    parentDim: 'CUSTOMER_REGION_NAME',
    childDim: 'CUSTOMER_NATION_NAME',
    parentLabel: 'Region',
    childLabel: 'Nation',
  },
  'chart-customers-by-region': {
    metric: 'CUSTOMER_COUNT',
    parentDim: 'CUSTOMER_REGION_NAME',
    childDim: 'CUSTOMER_NATION_NAME',
    parentLabel: 'Region',
    childLabel: 'Nation',
  },
}

export const DIM_DRILLABLE_WIDGETS = new Set(Object.keys(DIM_DRILL_CONFIGS))

export function getDimDrillConfig(widgetId: string) {
  return DIM_DRILL_CONFIGS[widgetId] ?? null
}

export function buildDimDrillQuery(
  widgetId: string,
  parentValue: string,
  dashFilters?: DashboardFilters
): string | null {
  const config = DIM_DRILL_CONFIGS[widgetId]
  if (!config) return null
  const filters: DashboardFilters = { ...dashFilters, [config.parentDim]: [parentValue] }
  return svQuery([config.metric], [config.childDim], `${config.metric} DESC`, undefined, filters)
}

/**
 * Curated dashboard widgets for TPCH_ANALYSIS semantic view.
 * 3 KPIs + 5 charts covering all 3 metrics with meaningful dimension breakdowns.
 */
export function buildWidgets(filters?: DashboardFilters): DashboardWidget[] {
  const f = filters && Object.keys(filters).length > 0 ? filters : undefined
  return [
    // --- KPI row ---
    {
      id: 'kpi-orders',
      title: 'Total Orders',
      type: 'kpi',
      sql: svQuery(['ORDER_COUNT'], undefined, undefined, undefined, f),
      colSpan: 1,
    },
    {
      id: 'kpi-customers',
      title: 'Total Customers',
      type: 'kpi',
      sql: svQuery(['CUSTOMER_COUNT'], undefined, undefined, undefined, f),
      colSpan: 1,
    },
    {
      id: 'kpi-avg-value',
      title: 'Avg Order Value',
      type: 'kpi',
      sql: svQuery(['ORDER_AVERAGE_VALUE'], undefined, undefined, undefined, f),
      colSpan: 1,
    },
    {
      id: 'kpi-orders-per-customer',
      title: 'Orders per Customer',
      type: 'kpi',
      sql: `SELECT ROUND(ORDER_COUNT / NULLIF(CUSTOMER_COUNT, 0), 2) AS value FROM (${svQuery(['ORDER_COUNT', 'CUSTOMER_COUNT'], undefined, undefined, undefined, f)})`,
      colSpan: 1,
    },
    {
      id: 'kpi-top-region',
      title: 'Top Region',
      type: 'kpi',
      sql: svQuery(['ORDER_COUNT'], ['CUSTOMER_REGION_NAME'], 'ORDER_COUNT DESC', 1, f),
      colSpan: 1,
    },
    {
      id: 'kpi-top-segment',
      title: 'Top Segment',
      type: 'kpi',
      sql: svQuery(['CUSTOMER_COUNT'], ['CUSTOMER_MARKET_SEGMENT'], 'CUSTOMER_COUNT DESC', 1, f),
      colSpan: 1,
    },

    // --- Charts ---
    {
      id: 'chart-orders-over-time',
      title: 'Orders by year & region',
      type: 'multiline',
      sql: svQueryByYearAndDim('ORDER_COUNT', 'ORDER_DATE', 'CUSTOMER_REGION_NAME', f),
      colSpan: 2,
    },
    {
      id: 'chart-orders-by-region',
      title: 'Orders by region',
      type: 'bar',
      sql: svQuery(['ORDER_COUNT'], ['CUSTOMER_REGION_NAME'], 'ORDER_COUNT DESC', undefined, f),
      colSpan: 2,
    },
    {
      id: 'chart-customers-by-segment',
      title: 'Customers by market segment',
      type: 'donut',
      sql: svQuery(['CUSTOMER_COUNT'], ['CUSTOMER_MARKET_SEGMENT'], 'CUSTOMER_COUNT DESC', undefined, f),
      colSpan: 2,
    },
    {
      id: 'chart-top-nations',
      title: 'Top 10 nations by orders',
      type: 'bar',
      sql: svQuery(['ORDER_COUNT'], ['CUSTOMER_NATION_NAME'], 'ORDER_COUNT DESC', 10, f),
      colSpan: 2,
    },
    {
      id: 'chart-avg-value-trend',
      title: 'Avg order value by year',
      type: 'line',
      sql: svQueryByYear('ORDER_AVERAGE_VALUE', 'ORDER_DATE', 'ORDER_AVERAGE_VALUE', f),
      colSpan: 2,
    },
    {
      id: 'chart-customers-by-region',
      title: 'Customers by region',
      type: 'bar',
      sql: svQuery(['CUSTOMER_COUNT'], ['CUSTOMER_REGION_NAME'], 'CUSTOMER_COUNT DESC', undefined, f),
      colSpan: 2,
    },

    // --- New chart types ---
    {
      id: 'chart-orders-area',
      title: 'Order volume trend',
      type: 'area',
      sql: svQueryByYear('ORDER_COUNT', 'ORDER_DATE', 'ORDER_COUNT', f),
      colSpan: 2,
    },
    {
      id: 'chart-region-composed',
      title: 'Orders vs Avg Value by region',
      type: 'composed',
      sql: svQuery(['ORDER_COUNT', 'ORDER_AVERAGE_VALUE'], ['CUSTOMER_REGION_NAME'], 'ORDER_COUNT DESC', undefined, f),
      colSpan: 2,
    },
    {
      id: 'chart-customers-treemap',
      title: 'Customers by nation (top 15)',
      type: 'treemap',
      sql: svQuery(['CUSTOMER_COUNT'], ['CUSTOMER_NATION_NAME'], 'CUSTOMER_COUNT DESC', 15, f),
      colSpan: 2,
    },

    // --- Detail table ---
    {
      id: 'table-top-customers',
      title: 'Top 20 Customers',
      type: 'table',
      sql: svQuery(
        ['ORDER_COUNT', 'ORDER_AVERAGE_VALUE'],
        ['CUSTOMER_NAME', 'CUSTOMER_NATION_NAME', 'CUSTOMER_MARKET_SEGMENT'],
        'ORDER_COUNT DESC',
        20,
        f
      ),
      colSpan: 4,
    },
  ]
}
