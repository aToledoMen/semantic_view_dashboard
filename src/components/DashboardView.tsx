import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { RefreshCw, TrendingUp, Users, DollarSign, BarChart3, Globe, Tag, AlertCircle, Filter, ChevronDown, ChevronRight, X, Layers } from 'lucide-react'
import {
  LineChart, Line,
  BarChart, Bar,
  AreaChart, Area,
  ComposedChart,
  PieChart, Pie, Cell,
  Treemap,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, Brush,
  ResponsiveContainer,
} from 'recharts'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { executeBatch } from '@/lib/api'
import { buildWidgets, buildDrillQuery, DRILLABLE_WIDGETS, buildDimDrillQuery, DIM_DRILLABLE_WIDGETS, getDimDrillConfig, type DashboardFilters } from '@/lib/dashboardWidgets'
import { SNOWFLAKE_CONFIG } from '@/config'
import type { CatalogResponse } from '@/types/catalog'
import type { DashboardWidget, WidgetState, QueryResult, TimeGrain, DrillState, DimDrillState } from '@/types/dashboard'

interface DashboardViewProps {
  catalog: CatalogResponse | null
  onDimensionValues?: (values: Map<string, string[]>) => void
}

/* ── Professional muted palette ── */

const PALETTE = [
  '#4B6A8A', // steel blue
  '#6B8E7B', // sage
  '#7C6E8A', // muted plum
  '#8A7D6B', // warm taupe
  '#5A7D9A', // slate blue
  '#7A8A6B', // olive
  '#6B7A8A', // cool grey-blue
  '#8A6B7A', // dusty rose
]

const KPI_ICONS = [TrendingUp, Users, DollarSign, BarChart3, Globe, Tag]

/* ── Helpers ── */

function formatKpiValue(value: unknown): string {
  const num = Number(value)
  if (isNaN(num)) return String(value ?? '—')
  if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(1)}B`
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`
  if (Number.isInteger(num)) return num.toLocaleString()
  return num.toFixed(2)
}

function normaliseDate(v: unknown): string {
  if (typeof v === 'string' && /^\d{4}-\d{2}/.test(v)) return v
  const n = Number(v)
  if (!isNaN(n) && Number.isFinite(n)) {
    const ms = n * 86_400_000
    const d = new Date(ms)
    const year = d.getFullYear()
    if (year >= 1970 && year <= 2100) {
      return d.toISOString().slice(0, 10)
    }
  }
  return String(v)
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function formatDateByGrain(value: string, grain: TimeGrain): string {
  if (!value) return ''
  const d = new Date(value)
  if (isNaN(d.getTime())) return String(value)
  switch (grain) {
    case 'YEAR': return String(d.getFullYear())
    case 'MONTH': return MONTH_NAMES[d.getMonth()]
    case 'DAY': return `${MONTH_NAMES[d.getMonth()]} ${d.getDate()}`
  }
}

function formatTooltipByGrain(value: string, grain: TimeGrain): string {
  if (!value) return ''
  const d = new Date(value)
  if (isNaN(d.getTime())) return String(value)
  switch (grain) {
    case 'YEAR': return String(d.getFullYear())
    case 'MONTH': return d.toLocaleDateString('en', { month: 'long', year: 'numeric' })
    case 'DAY': return d.toLocaleDateString('en', { day: 'numeric', month: 'long', year: 'numeric' })
  }
}

function fmtNum(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`
  if (Number.isInteger(value)) return value.toLocaleString()
  return value.toFixed(2)
}

function coerceNumeric(rows: Record<string, unknown>[], field: string): Record<string, unknown>[] {
  return rows.map((r) => ({ ...r, [field]: Number(r[field]) || 0 }))
}

function coerceMultiNumeric(rows: Record<string, unknown>[], fields: string[]): Record<string, unknown>[] {
  return rows.map((r) => {
    const next = { ...r }
    for (const f of fields) next[f] = Number(r[f]) || 0
    return next
  })
}

function isCurrencyField(name: string): boolean {
  return name.includes('AVERAGE_VALUE') || name.includes('AVG_VALUE')
}

function fmtField(value: number, field: string): string {
  return isCurrencyField(field) ? `€${fmtNum(value)}` : fmtNum(value)
}

function drillCacheKey(drill?: DrillState | null): string {
  if (!drill || drill.grain === 'YEAR') return 'YEAR'
  if (drill.grain === 'MONTH') return `MONTH:${drill.year}`
  return `DAY:${drill.year}:${drill.month}`
}

const TOOLTIP_STYLE = {
  backgroundColor: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: 6,
  fontSize: 12,
  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
}

/* ── Chart data prep ── */

function prepareLineData(data: QueryResult) {
  const xField = data.columns[0]
  const yField = data.columns[1]
  const rows = data.rows.map((r) => ({
    ...r,
    [xField]: normaliseDate(r[xField]),
    [yField]: Number(r[yField]) || 0,
  }))
  return { rows, xField, yField }
}

/* ── Chart components ── */

function RechartLine({ data, onDrillDown, grain = 'YEAR' }: { data: QueryResult; onDrillDown?: (dateValue: string) => void; grain?: TimeGrain }) {
  const { rows, xField, yField } = useMemo(() => prepareLineData(data), [data])
  const currency = isCurrencyField(yField)

  return (
    <div style={{ cursor: onDrillDown ? 'pointer' : undefined }}>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={rows} margin={{ top: 8, right: 16, bottom: 4, left: 8 }} onClick={(e: any) => { if (onDrillDown && e?.activeLabel) onDrillDown(String(e.activeLabel)) }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.6} />
          <XAxis
            dataKey={xField}
            tickFormatter={(v) => formatDateByGrain(v, grain)}
            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            stroke="hsl(var(--border))"
            tickLine={false}
          />
          <YAxis
            tickFormatter={(v) => currency ? `€${fmtNum(v)}` : fmtNum(v)}
            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            stroke="hsl(var(--border))"
            tickLine={false}
            axisLine={false}
            width={currency ? 60 : 50}
          />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            formatter={(value: number | undefined) => [fmtField(value ?? 0, yField), yField.replace(/_/g, ' ')]}
            labelFormatter={(label) => formatTooltipByGrain(String(label), grain)}
          />
          <Line
            type="monotone"
            dataKey={yField}
            stroke={PALETTE[0]}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: PALETTE[0], strokeWidth: 0 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

function RechartMultiLine({ data, onDrillDown, grain = 'YEAR' }: { data: QueryResult; onDrillDown?: (dateValue: string) => void; grain?: TimeGrain }) {
  const xField = data.columns[0]
  const dimField = data.columns[1]
  const metricField = data.columns[2]

  const { pivoted, seriesKeys } = useMemo(() => {
    const byX = new Map<string, Record<string, unknown>>()
    const keys = new Set<string>()

    for (const row of data.rows) {
      const x = normaliseDate(row[xField])
      const series = String(row[dimField])
      const val = Number(row[metricField]) || 0
      keys.add(series)

      if (!byX.has(x)) byX.set(x, { [xField]: x })
      byX.get(x)![series] = val
    }

    return {
      pivoted: Array.from(byX.values()).sort((a, b) =>
        String(a[xField]).localeCompare(String(b[xField]))
      ),
      seriesKeys: Array.from(keys),
    }
  }, [data.rows, xField, dimField, metricField])

  const [hidden, setHidden] = useState<Set<string>>(new Set())
  const [hovered, setHovered] = useState<string | null>(null)

  const handleLegendClick = useCallback((entry: any) => {
    const key = entry.dataKey ?? entry.value
    setHidden((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

  const handleLegendEnter = useCallback((entry: any) => {
    setHovered(entry.dataKey ?? entry.value)
  }, [])

  const handleLegendLeave = useCallback(() => {
    setHovered(null)
  }, [])

  return (
    <div style={{ cursor: onDrillDown ? 'pointer' : undefined }}>
      <ResponsiveContainer width="100%" height={pivoted.length > 4 ? 280 : 240}>
        <LineChart data={pivoted} margin={{ top: 8, right: 16, bottom: 4, left: 8 }} onClick={(e: any) => { if (onDrillDown && e?.activeLabel) onDrillDown(String(e.activeLabel)) }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.6} />
          <XAxis
            dataKey={xField}
            tickFormatter={(v) => formatDateByGrain(v, grain)}
            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            stroke="hsl(var(--border))"
            tickLine={false}
          />
          <YAxis
            tickFormatter={fmtNum}
            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            stroke="hsl(var(--border))"
            tickLine={false}
            axisLine={false}
            width={55}
          />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            labelFormatter={(label) => formatTooltipByGrain(String(label), grain)}
            formatter={(value: number | undefined, name?: string) => [
              fmtNum(value ?? 0),
              (name ?? '').replace(/_/g, ' '),
            ]}
          />
          <Legend
            verticalAlign="top"
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 10, color: 'hsl(var(--muted-foreground))', cursor: 'pointer' }}
            onClick={handleLegendClick}
            onMouseEnter={handleLegendEnter}
            onMouseLeave={handleLegendLeave}
            formatter={(value: string) => (
              <span style={{ textDecoration: hidden.has(value) ? 'line-through' : 'none', opacity: hidden.has(value) ? 0.4 : 1 }}>
                {value}
              </span>
            )}
          />
          {seriesKeys.map((key, i) => (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              stroke={PALETTE[i % PALETTE.length]}
              strokeWidth={2}
              dot={{ r: 3, fill: PALETTE[i % PALETTE.length], strokeWidth: 0 }}
              activeDot={{ r: 5, fill: PALETTE[i % PALETTE.length], strokeWidth: 0 }}
              hide={hidden.has(key)}
              strokeOpacity={hovered && hovered !== key ? 0.15 : 1}
            />
          ))}
          {pivoted.length > 4 && (
            <Brush
              dataKey={xField}
              height={20}
              stroke="hsl(var(--border))"
              tickFormatter={(v) => formatDateByGrain(v, grain)}
              fill="hsl(var(--muted))"
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

function RechartArea({ data, onDrillDown, grain = 'YEAR' }: { data: QueryResult; onDrillDown?: (dateValue: string) => void; grain?: TimeGrain }) {
  const { rows, xField, yField } = useMemo(() => prepareLineData(data), [data])

  return (
    <div style={{ cursor: onDrillDown ? 'pointer' : undefined }}>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={rows} margin={{ top: 8, right: 16, bottom: 4, left: 8 }} onClick={(e: any) => { if (onDrillDown && e?.activeLabel) onDrillDown(String(e.activeLabel)) }}>
          <defs>
            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={PALETTE[1]} stopOpacity={0.3} />
              <stop offset="95%" stopColor={PALETTE[1]} stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.6} />
          <XAxis
            dataKey={xField}
            tickFormatter={(v) => formatDateByGrain(v, grain)}
            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            stroke="hsl(var(--border))"
            tickLine={false}
          />
          <YAxis
            tickFormatter={fmtNum}
            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            stroke="hsl(var(--border))"
            tickLine={false}
            axisLine={false}
            width={50}
          />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            formatter={(value: number | undefined) => [fmtNum(value ?? 0), yField.replace(/_/g, ' ')]}
            labelFormatter={(label) => formatTooltipByGrain(String(label), grain)}
          />
          <Area
            type="monotone"
            dataKey={yField}
            stroke={PALETTE[1]}
            strokeWidth={2}
            fill="url(#areaGrad)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

function RechartBar({ data, onDrillDown }: { data: QueryResult; onDrillDown?: (categoryValue: string) => void }) {
  const catField = data.columns[0]
  const valField = data.columns[1]
  const rows = useMemo(() => coerceNumeric(data.rows, valField), [data.rows, valField])
  const barHeight = Math.max(220, rows.length * 36)

  const handleClick = useCallback((_: any, index: number) => {
    if (!onDrillDown) return
    const value = rows[index]?.[catField]
    if (value != null) onDrillDown(String(value))
  }, [onDrillDown, rows, catField])

  return (
    <div style={{ cursor: onDrillDown ? 'pointer' : undefined }}>
      <ResponsiveContainer width="100%" height={barHeight}>
        <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 60, bottom: 4, left: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.6} horizontal={false} />
          <YAxis
            dataKey={catField}
            type="category"
            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            stroke="hsl(var(--border))"
            tickLine={false}
            axisLine={false}
            width={120}
          />
          <XAxis
            type="number"
            tickFormatter={fmtNum}
            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            stroke="hsl(var(--border))"
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            formatter={(value: number | undefined) => [fmtNum(value ?? 0), valField.replace(/_/g, ' ')]}
          />
          <Bar dataKey={valField} radius={[0, 3, 3, 0]} fill={PALETTE[0]} onClick={handleClick} label={{ position: 'right', fontSize: 10, fill: 'hsl(var(--muted-foreground))', formatter: (v: unknown) => fmtNum(Number(v) || 0) }}>
            {rows.map((_, i) => (
              <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function RechartComposed({ data }: { data: QueryResult }) {
  const xField = data.columns[0]
  const barField = data.columns[1]
  const lineField = data.columns[2]
  const rows = useMemo(
    () => coerceMultiNumeric(data.rows, [barField, lineField]),
    [data.rows, barField, lineField]
  )

  const [hidden, setHidden] = useState<Set<string>>(new Set())
  const [hovered, setHovered] = useState<string | null>(null)

  const handleLegendClick = useCallback((entry: any) => {
    const key = entry.dataKey ?? entry.value
    setHidden((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])
  const handleLegendEnter = useCallback((entry: any) => {
    setHovered(entry.dataKey ?? entry.value)
  }, [])
  const handleLegendLeave = useCallback(() => setHovered(null), [])

  return (
    <ResponsiveContainer width="100%" height={240}>
      <ComposedChart data={rows} margin={{ top: 8, right: 16, bottom: 4, left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.6} />
        <XAxis
          dataKey={xField}
          tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
          stroke="hsl(var(--border))"
          tickLine={false}
          interval={0}
          angle={-25}
          textAnchor="end"
          height={50}
        />
        <YAxis
          yAxisId="left"
          tickFormatter={fmtNum}
          tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
          stroke="hsl(var(--border))"
          tickLine={false}
          axisLine={false}
          width={50}
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          tickFormatter={(v) => `€${fmtNum(v)}`}
          tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
          stroke="hsl(var(--border))"
          tickLine={false}
          axisLine={false}
          width={60}
        />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          formatter={(value: number | undefined, name?: string) => [
            name === lineField ? `€${fmtNum(value ?? 0)}` : fmtNum(value ?? 0),
            (name ?? '').replace(/_/g, ' '),
          ]}
        />
        <Legend
          verticalAlign="top"
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 11, color: 'hsl(var(--muted-foreground))', cursor: 'pointer' }}
          onClick={handleLegendClick}
          onMouseEnter={handleLegendEnter}
          onMouseLeave={handleLegendLeave}
          formatter={(value: string) => (
            <span style={{ textDecoration: hidden.has(value) ? 'line-through' : 'none', opacity: hidden.has(value) ? 0.4 : 1 }}>
              {value.replace(/_/g, ' ')}
            </span>
          )}
        />
        <Bar
          yAxisId="left"
          dataKey={barField}
          fill={PALETTE[0]}
          radius={[3, 3, 0, 0]}
          barSize={30}
          hide={hidden.has(barField)}
          fillOpacity={hovered && hovered !== barField ? 0.15 : 1}
        />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey={lineField}
          stroke={PALETTE[3]}
          strokeWidth={2}
          dot={{ r: 3 }}
          hide={hidden.has(lineField)}
          strokeOpacity={hovered && hovered !== lineField ? 0.15 : 1}
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}

function RechartDonut({ data }: { data: QueryResult }) {
  const catField = data.columns[0]
  const valField = data.columns[1]
  const rows = useMemo(() => coerceNumeric(data.rows, valField), [data.rows, valField])

  const [hidden, setHidden] = useState<Set<string>>(new Set())
  const [hovered, setHovered] = useState<string | null>(null)

  const visibleRows = rows

  const handleLegendClick = useCallback((entry: any) => {
    const key = String(entry.value)
    setHidden((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])
  const handleLegendEnter = useCallback((entry: any) => {
    setHovered(String(entry.value))
  }, [])
  const handleLegendLeave = useCallback(() => setHovered(null), [])

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={visibleRows}
          dataKey={valField}
          nameKey={catField}
          cx="50%"
          cy="45%"
          innerRadius={45}
          outerRadius={80}
          paddingAngle={2}
          strokeWidth={1}
          stroke="hsl(var(--card))"
        >
          {visibleRows.map((r: Record<string, unknown>, i: number) => {
            const name = String(r[catField])
            const isHidden = hidden.has(name)
            const isDimmed = hovered && hovered !== name
            return (
              <Cell
                key={i}
                fill={PALETTE[i % PALETTE.length]}
                fillOpacity={isHidden ? 0.08 : isDimmed ? 0.2 : 1}
              />
            )
          })}
        </Pie>
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          formatter={(value: number | undefined) => [fmtNum(value ?? 0), valField.replace(/_/g, ' ')]}
        />
        <Legend
          verticalAlign="bottom"
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 11, color: 'hsl(var(--muted-foreground))', cursor: 'pointer' }}
          onClick={handleLegendClick}
          onMouseEnter={handleLegendEnter}
          onMouseLeave={handleLegendLeave}
          formatter={(value: string) => (
            <span style={{ textDecoration: hidden.has(value) ? 'line-through' : 'none', opacity: hidden.has(value) ? 0.4 : 1 }}>
              {value}
            </span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}

function RechartTreemap({ data }: { data: QueryResult }) {
  const nameField = data.columns[0]
  const sizeField = data.columns[1]
  const rows = useMemo(
    () => data.rows.map((r, i) => ({
      name: String(r[nameField]),
      size: Number(r[sizeField]) || 0,
      fill: PALETTE[i % PALETTE.length],
    })),
    [data.rows, nameField, sizeField]
  )

  return (
    <ResponsiveContainer width="100%" height={280}>
      <Treemap
        data={rows}
        dataKey="size"
        nameKey="name"
        stroke="hsl(var(--card))"
        content={({ x, y, width, height, name, fill }: any) => {
          if (width < 40 || height < 25) return <rect x={x} y={y} width={width} height={height} fill={fill} rx={3} />
          return (
            <g>
              <rect x={x} y={y} width={width} height={height} fill={fill} rx={3} />
              <text
                x={x + width / 2}
                y={y + height / 2 - 6}
                textAnchor="middle"
                dominantBaseline="central"
                fill="#fff"
                fontSize={width < 80 ? 9 : 11}
                fontWeight={500}
              >
                {name}
              </text>
              <text
                x={x + width / 2}
                y={y + height / 2 + 10}
                textAnchor="middle"
                dominantBaseline="central"
                fill="rgba(255,255,255,0.7)"
                fontSize={9}
              >
                {fmtNum(rows.find((r) => r.name === name)?.size ?? 0)}
              </text>
            </g>
          )
        }}
      />
    </ResponsiveContainer>
  )
}

type NumFilter = { op: '>=' | '<=' | '=' | '>' | '<'; val: number | null }
type ColFilter = { type: 'text'; selected: Set<string> } | { type: 'num'; filter: NumFilter }

const NUM_OPS = ['>=', '<=', '>', '<', '='] as const

function isNumericColumn(rows: Record<string, unknown>[], col: string): boolean {
  if (rows.length === 0) return false
  const sample = rows[0][col]
  return typeof sample === 'number' || (typeof sample === 'string' && !isNaN(Number(sample)) && sample.trim() !== '')
}

function DashboardTable({ data }: { data: QueryResult }) {
  const [sortCol, setSortCol] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [colFilters, setColFilters] = useState<Map<string, ColFilter>>(new Map())

  const colMeta = useMemo(() => {
    const meta = new Map<string, { numeric: boolean; uniqueValues: string[] }>()
    for (const col of data.columns) {
      const numeric = isNumericColumn(data.rows, col)
      if (!numeric) {
        const vals = new Set<string>()
        for (const row of data.rows) {
          const v = row[col]
          if (v != null && v !== '') vals.add(String(v))
        }
        meta.set(col, { numeric: false, uniqueValues: Array.from(vals).sort() })
      } else {
        meta.set(col, { numeric: true, uniqueValues: [] })
      }
    }
    return meta
  }, [data.columns, data.rows])

  const handleSort = useCallback((col: string) => {
    setSortCol((prev) => {
      if (prev === col) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
        return col
      }
      setSortDir('asc')
      return col
    })
  }, [])

  const toggleTextFilter = useCallback((col: string, value: string) => {
    setColFilters((prev) => {
      const next = new Map(prev)
      const existing = next.get(col)
      if (existing?.type === 'text') {
        const selected = new Set(existing.selected)
        if (selected.has(value)) selected.delete(value)
        else selected.add(value)
        if (selected.size === 0) next.delete(col)
        else next.set(col, { type: 'text', selected })
      } else {
        next.set(col, { type: 'text', selected: new Set([value]) })
      }
      return next
    })
  }, [])

  const setNumFilter = useCallback((col: string, op: NumFilter['op'], val: string) => {
    setColFilters((prev) => {
      const next = new Map(prev)
      const n = Number(val)
      const numVal = val === '' || isNaN(n) ? null : n
      next.set(col, { type: 'num', filter: { op, val: numVal } })
      return next
    })
  }, [])

  const activeFilterCount = Array.from(colFilters.values()).filter(
    (f) => f.type === 'text' || (f.type === 'num' && f.filter.val !== null)
  ).length

  const processedRows = useMemo(() => {
    let rows = data.rows

    if (colFilters.size > 0) {
      rows = rows.filter((row) => {
        for (const [col, filter] of colFilters) {
          if (filter.type === 'text') {
            const val = String(row[col] ?? '')
            if (!filter.selected.has(val)) return false
          } else {
            const threshold = filter.filter.val
            if (threshold === null) continue
            const val = Number(row[col])
            if (isNaN(val)) return false
            const { op } = filter.filter
            if (op === '>=' && !(val >= threshold)) return false
            if (op === '<=' && !(val <= threshold)) return false
            if (op === '>' && !(val > threshold)) return false
            if (op === '<' && !(val < threshold)) return false
            if (op === '=' && val !== threshold) return false
          }
        }
        return true
      })
    }

    if (sortCol) {
      rows = [...rows].sort((a, b) => {
        const av = a[sortCol]
        const bv = b[sortCol]
        const an = Number(av)
        const bn = Number(bv)
        const bothNum = !isNaN(an) && !isNaN(bn)
        const cmp = bothNum ? an - bn : String(av ?? '').localeCompare(String(bv ?? ''))
        return sortDir === 'asc' ? cmp : -cmp
      })
    }

    return rows
  }, [data.rows, sortCol, sortDir, colFilters])

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <ScrollArea className="max-h-[400px]">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted sticky top-0 z-10">
              <tr>
                {data.columns.map((col) => (
                  <th key={col} className="border-b border-border text-left">
                    <button
                      onClick={() => handleSort(col)}
                      className="w-full px-4 py-2.5 flex items-center gap-1.5 font-medium text-muted-foreground text-xs uppercase tracking-wide hover:text-foreground transition-colors"
                    >
                      {col.replace(/_/g, ' ')}
                      <span className="text-[10px] opacity-60">
                        {sortCol === col ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}
                      </span>
                    </button>
                  </th>
                ))}
              </tr>
              <tr className="bg-muted/60">
                {data.columns.map((col) => {
                  const meta = colMeta.get(col)
                  const currentFilter = colFilters.get(col)

                  if (meta?.numeric) {
                    const numF = currentFilter?.type === 'num' ? currentFilter.filter : null
                    return (
                      <th key={`f-${col}`} className="px-2 py-1.5 border-b border-border">
                        <div className="flex gap-1">
                          <select
                            value={numF?.op ?? '>='}
                            onChange={(e) => setNumFilter(col, e.target.value as NumFilter['op'], numF?.val != null ? String(numF.val) : '')}
                            className="bg-card border border-border/60 rounded px-1 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring w-12"
                          >
                            {NUM_OPS.map((op) => (
                              <option key={op} value={op}>{op}</option>
                            ))}
                          </select>
                          <input
                            type="number"
                            placeholder="Value"
                            value={numF?.val ?? ''}
                            onChange={(e) => {
                              const op = numF?.op ?? '>='
                              setNumFilter(col, op, e.target.value)
                            }}
                            className="flex-1 min-w-0 bg-card border border-border/60 rounded px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring"
                          />
                        </div>
                      </th>
                    )
                  }

                  // Text column: multi-select dropdown
                  const selected = currentFilter?.type === 'text' ? currentFilter.selected : new Set<string>()
                  return (
                    <th key={`f-${col}`} className="px-2 py-1.5 border-b border-border align-top">
                      <details className="relative">
                        <summary className={cn(
                          'cursor-pointer bg-card border border-border/60 rounded px-2 py-1 text-xs list-none flex items-center justify-between gap-1',
                          selected.size > 0 ? 'text-foreground font-medium' : 'text-muted-foreground/50'
                        )}>
                          {selected.size > 0 ? `${selected.size} selected` : 'All'}
                          <span className="text-[9px]">▾</span>
                        </summary>
                        <div className="absolute z-20 mt-1 left-0 min-w-[160px] max-h-[200px] overflow-y-auto bg-card border border-border rounded-md shadow-lg py-1">
                          {meta?.uniqueValues.map((val) => (
                            <label
                              key={val}
                              className="flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-muted/50 cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={selected.has(val)}
                                onChange={() => toggleTextFilter(col, val)}
                                className="rounded border-border"
                              />
                              <span className="truncate text-foreground">{val}</span>
                            </label>
                          ))}
                        </div>
                      </details>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {processedRows.length === 0 && (
                <tr>
                  <td colSpan={data.columns.length} className="px-4 py-6 text-center text-xs text-muted-foreground">
                    No matching rows
                  </td>
                </tr>
              )}
              {processedRows.map((row, rowIdx) => (
                <tr
                  key={rowIdx}
                  className={cn(
                    'border-b border-border/50 hover:bg-muted/50 transition-colors',
                    rowIdx % 2 === 1 && 'bg-muted/20'
                  )}
                >
                  {data.columns.map((col) => {
                    const val = row[col]
                    const num = Number(val)
                    return (
                      <td key={col} className="px-4 py-2 whitespace-nowrap text-foreground">
                        {!isNaN(num) && typeof val !== 'string' ? fmtField(num, col) : String(val ?? '')}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ScrollArea>
      {activeFilterCount > 0 && (
        <div className="px-4 py-2 bg-muted/40 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
          <span>{processedRows.length} of {data.rows.length} rows</span>
          <button
            onClick={() => setColFilters(new Map())}
            className="text-primary hover:underline"
          >
            Clear filters
          </button>
        </div>
      )}
    </div>
  )
}

/* ── Widget cards ── */

function KpiCard({
  widget,
  state,
  colorIndex,
}: {
  widget: DashboardWidget
  state: WidgetState
  colorIndex: number
}) {
  const Icon = KPI_ICONS[colorIndex % KPI_ICONS.length]

  return (
    <div className="bg-card rounded-lg border border-border p-5 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
          {widget.title}
        </span>
        <div className="w-7 h-7 rounded-md bg-muted flex items-center justify-center">
          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
      </div>
      {state.status === 'loading' && (
        <Skeleton className="h-9 w-28 rounded" />
      )}
      {state.status === 'error' && (
        <span className="text-sm text-destructive">Error</span>
      )}
      {state.status === 'success' && state.data && (() => {
        const raw = state.data.rows[0]?.value ?? state.data.rows[0]?.[state.data.columns[0]]
        const isCurrency = widget.id === 'kpi-avg-value'
        const formatted = formatKpiValue(raw)
        return (
          <span className="text-2xl font-semibold text-foreground tabular-nums tracking-tight">
            {isCurrency ? `€${formatted}` : formatted}
          </span>
        )
      })()}
    </div>
  )
}

function ChartCard({
  widget,
  state,
  onRetry,
  drillState,
  onDrillDown,
  onDrillUp,
  dimDrillState,
  dimDrillConfig,
  onDimDrillDown,
  onDimDrillUp,
}: {
  widget: DashboardWidget
  state: WidgetState
  onRetry: () => void
  drillState?: DrillState
  onDrillDown?: (dateValue: string) => void
  onDrillUp?: (targetGrain?: TimeGrain) => void
  dimDrillState?: DimDrillState
  dimDrillConfig?: { parentLabel: string; childLabel: string } | null
  onDimDrillDown?: (categoryValue: string) => void
  onDimDrillUp?: () => void
}) {
  const grain: TimeGrain = drillState?.grain ?? 'YEAR'
  const canDrill = onDrillDown && grain !== 'DAY'
  const canDimDrill = onDimDrillDown && !dimDrillState
  const isDrillable = !!(onDrillDown || onDimDrillDown)

  return (
    <div className={cn(
      'bg-card rounded-lg border p-5',
      isDrillable ? 'border-primary/25' : 'border-border',
      widget.colSpan === 2 && 'col-span-2',
      widget.colSpan === 4 && 'col-span-full',
    )}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-foreground uppercase tracking-wide flex items-center gap-1.5">
          {widget.title}
          {isDrillable && (
            <Layers className="h-3 w-3 text-primary/50" />
          )}
        </h3>
        {/* Temporal drill breadcrumb */}
        {drillState && drillState.grain !== 'YEAR' && onDrillUp && (
          <div className="flex items-center gap-0.5 text-[11px] text-muted-foreground">
            <button onClick={() => onDrillUp('YEAR')} className="hover:text-primary transition-colors">
              All Years
            </button>
            {drillState.year != null && (
              <>
                <ChevronRight className="h-3 w-3" />
                {drillState.grain === 'DAY' ? (
                  <button onClick={() => onDrillUp('MONTH')} className="hover:text-primary transition-colors">
                    {drillState.year}
                  </button>
                ) : (
                  <span className="text-foreground font-medium">{drillState.year}</span>
                )}
              </>
            )}
            {drillState.month != null && (
              <>
                <ChevronRight className="h-3 w-3" />
                <span className="text-foreground font-medium">{MONTH_NAMES[drillState.month - 1]}</span>
              </>
            )}
          </div>
        )}
        {/* Dimensional drill breadcrumb */}
        {dimDrillState && dimDrillConfig && onDimDrillUp && (
          <div className="flex items-center gap-0.5 text-[11px] text-muted-foreground">
            <button onClick={onDimDrillUp} className="hover:text-primary transition-colors">
              All {dimDrillConfig.parentLabel}s
            </button>
            <ChevronRight className="h-3 w-3" />
            <span className="text-foreground font-medium">{dimDrillState.parentValue}</span>
          </div>
        )}
      </div>

      {state.status === 'loading' && (
        <div className="h-48 w-full rounded-lg flex items-center justify-center bg-muted/30">
          <div className="flex flex-col items-center gap-2">
            <RefreshCw className="h-5 w-5 animate-spin text-primary" />
            <span className="text-[11px] text-muted-foreground">Loading...</span>
          </div>
        </div>
      )}

      {state.status === 'error' && (
        <div className="flex flex-col items-center justify-center py-8 gap-3">
          <AlertCircle className="h-6 w-6 text-muted-foreground" />
          <p className="text-xs text-muted-foreground text-center max-w-[220px]">
            {state.error || 'Failed to load'}
          </p>
          <button
            onClick={onRetry}
            className="text-xs text-primary hover:underline"
          >
            Retry
          </button>
        </div>
      )}

      {state.status === 'success' && state.data && (
        <>
          {widget.type === 'line' && <RechartLine data={state.data} onDrillDown={canDrill ? onDrillDown : undefined} grain={grain} />}
          {widget.type === 'multiline' && <RechartMultiLine data={state.data} onDrillDown={canDrill ? onDrillDown : undefined} grain={grain} />}
          {widget.type === 'bar' && <RechartBar data={state.data} onDrillDown={canDimDrill ? onDimDrillDown : undefined} />}
          {widget.type === 'donut' && <RechartDonut data={state.data} />}
          {widget.type === 'area' && <RechartArea data={state.data} onDrillDown={canDrill ? onDrillDown : undefined} grain={grain} />}
          {widget.type === 'composed' && <RechartComposed data={state.data} />}
          {widget.type === 'treemap' && <RechartTreemap data={state.data} />}
          {widget.type === 'table' && <DashboardTable data={state.data} />}
          {canDrill && (
            <p className="text-[10px] text-muted-foreground/60 text-center mt-2 select-none">
              Click on a data point to drill into {grain === 'YEAR' ? 'months' : 'days'}
            </p>
          )}
          {canDimDrill && dimDrillConfig && (
            <p className="text-[10px] text-muted-foreground/60 text-center mt-2 select-none">
              Click on a bar to drill into {dimDrillConfig.childLabel.toLowerCase()}s
            </p>
          )}
        </>
      )}
    </div>
  )
}

/* ── Main view ── */

/** Columns that correspond to catalog dimensions */
const DIMENSION_COLUMNS = new Set([
  'CUSTOMER_REGION_NAME',
  'CUSTOMER_NATION_NAME',
  'CUSTOMER_MARKET_SEGMENT',
  'CUSTOMER_NAME',
  'CUSTOMER_COUNTRY_CODE',
])

const FILTERABLE_DIMS = [
  { name: 'CUSTOMER_REGION_NAME', label: 'Region' },
  { name: 'CUSTOMER_MARKET_SEGMENT', label: 'Segment' },
  { name: 'CUSTOMER_NATION_NAME', label: 'Nation' },
] as const

export function DashboardView({ catalog, onDimensionValues }: DashboardViewProps) {
  const [appliedFilters, setAppliedFilters] = useState<DashboardFilters>({})
  const [pendingFilters, setPendingFilters] = useState<Map<string, Set<string>>>(new Map())
  const [filterDropdown, setFilterDropdown] = useState<string | null>(null)
  const [filterValues, setFilterValues] = useState<Map<string, string[]>>(new Map())

  const widgets = useMemo(() => buildWidgets(appliedFilters), [appliedFilters])
  const [widgetStates, setWidgetStates] = useState<Map<string, WidgetState>>(new Map())
  const [drillStates, setDrillStates] = useState<Map<string, DrillState>>(new Map())
  const [dimDrillStates, setDimDrillStates] = useState<Map<string, DimDrillState>>(new Map())
  const [bulkLoading, setBulkLoading] = useState(false)
  const extractedRef = useRef(new Map<string, Set<string>>())

  // Drill cache: widgetId → cacheKey → WidgetState (instant back-navigation)
  const drillCacheRef = useRef(new Map<string, Map<string, WidgetState>>())
  const drillStatesRef = useRef(drillStates)
  drillStatesRef.current = drillStates

  // Initialize filter dropdown values from catalog sample_values
  useEffect(() => {
    if (!catalog) return
    setFilterValues((prev) => {
      const next = new Map(prev)
      for (const { name } of FILTERABLE_DIMS) {
        const dim = catalog.dimensions.find((d) => d.name === name)
        const sample = dim?.sample_values ?? []
        const existing = prev.get(name) ?? []
        const merged = new Set([...existing, ...sample])
        next.set(name, Array.from(merged).sort())
      }
      return next
    })
  }, [catalog])

  const emitDimensionValues = useCallback((data: QueryResult) => {
    let changed = false
    for (const col of data.columns) {
      if (!DIMENSION_COLUMNS.has(col)) continue
      const existing = extractedRef.current.get(col) ?? new Set<string>()
      const before = existing.size
      for (const row of data.rows) {
        const v = row[col]
        if (v != null && v !== '') existing.add(String(v))
      }
      if (existing.size > before) {
        extractedRef.current.set(col, existing)
        changed = true
      }
    }
    if (changed) {
      const result = new Map<string, string[]>()
      extractedRef.current.forEach((vals: Set<string>, key: string) => {
        result.set(key, Array.from(vals).sort())
      })
      if (onDimensionValues) onDimensionValues(result)

      // Enrich filter dropdown values
      setFilterValues((prev) => {
        const next = new Map(prev)
        for (const { name } of FILTERABLE_DIMS) {
          const extracted = extractedRef.current.get(name)
          if (!extracted) continue
          const existing = new Set(prev.get(name) ?? [])
          for (const v of extracted) existing.add(v)
          next.set(name, Array.from(existing).sort())
        }
        return next
      })
    }
  }, [onDimensionValues])

  const loadAll = useCallback(async (resetDrill = false) => {
    if (resetDrill) {
      setDrillStates(new Map())
      drillStatesRef.current = new Map()
      setDimDrillStates(new Map())
    }
    drillCacheRef.current.clear()
    setBulkLoading(true)

    // Build queries: use drill query for widgets at a drill level, base query otherwise
    const currentDrills = drillStatesRef.current
    const queries = widgets.map((w) => {
      const drill = currentDrills.get(w.id)
      const drillSql = drill ? buildDrillQuery(w.id, drill, appliedFilters) : null
      return { id: w.id, sql: drillSql ?? w.sql }
    })

    setWidgetStates((prev) => {
      const next = new Map(prev)
      for (const w of widgets) {
        next.set(w.id, { status: 'loading', data: null, error: null })
      }
      return next
    })

    try {
      const batchResults = await executeBatch(queries)

      setWidgetStates((prev) => {
        const next = new Map(prev)
        for (const w of widgets) {
          const result = batchResults[w.id]
          if (!result) {
            next.set(w.id, { status: 'error', data: null, error: 'No result returned' })
          } else if (result.error) {
            next.set(w.id, { status: 'error', data: null, error: result.error })
          } else {
            const data: QueryResult = { columns: result.columns!, rows: result.rows! }
            emitDimensionValues(data)
            next.set(w.id, { status: 'success', data, error: null })
          }
        }
        return next
      })
    } catch (err: any) {
      setWidgetStates((prev) => {
        const next = new Map(prev)
        for (const w of widgets) {
          next.set(w.id, { status: 'error', data: null, error: err?.message || 'Batch query failed' })
        }
        return next
      })
    } finally {
      setBulkLoading(false)
    }
  }, [widgets, emitDimensionValues, appliedFilters])

  const retryWidget = useCallback(async (widget: DashboardWidget) => {
    setWidgetStates((prev) => {
      const next = new Map(prev)
      next.set(widget.id, { status: 'loading', data: null, error: null })
      return next
    })

    try {
      const batchResults = await executeBatch([{ id: widget.id, sql: widget.sql }])
      const result = batchResults[widget.id]
      setWidgetStates((prev) => {
        const next = new Map(prev)
        if (result?.error) {
          next.set(widget.id, { status: 'error', data: null, error: result.error })
        } else if (result) {
          const data: QueryResult = { columns: result.columns!, rows: result.rows! }
          emitDimensionValues(data)
          next.set(widget.id, { status: 'success', data, error: null })
        } else {
          next.set(widget.id, { status: 'error', data: null, error: 'No result returned' })
        }
        return next
      })
    } catch (err: any) {
      setWidgetStates((prev) => {
        const next = new Map(prev)
        next.set(widget.id, { status: 'error', data: null, error: err?.message || 'Query failed' })
        return next
      })
    }
  }, [emitDimensionValues])

  const handleDrillDown = useCallback(async (widgetId: string, dateValue: string) => {
    const currentDrill = drillStates.get(widgetId) ?? { grain: 'YEAR' as TimeGrain }
    const d = new Date(dateValue)
    if (isNaN(d.getTime())) return

    let newDrill: DrillState
    if (currentDrill.grain === 'YEAR') {
      newDrill = { grain: 'MONTH', year: d.getFullYear() }
    } else if (currentDrill.grain === 'MONTH') {
      newDrill = { grain: 'DAY', year: currentDrill.year!, month: d.getMonth() + 1 }
    } else {
      return
    }

    // Cache current state before drilling deeper
    const currentState = widgetStates.get(widgetId)
    if (currentState?.status === 'success') {
      const wCache = drillCacheRef.current.get(widgetId) ?? new Map()
      wCache.set(drillCacheKey(currentDrill), currentState)
      drillCacheRef.current.set(widgetId, wCache)
    }

    setDrillStates((prev) => { const next = new Map(prev); next.set(widgetId, newDrill); return next })
    const sql = buildDrillQuery(widgetId, newDrill, appliedFilters)
    if (!sql) return

    setWidgetStates((prev) => { const next = new Map(prev); next.set(widgetId, { status: 'loading', data: null, error: null }); return next })

    try {
      const result = await executeBatch([{ id: widgetId, sql }])
      const item = result[widgetId]
      setWidgetStates((prev) => {
        const next = new Map(prev)
        if (item?.error) {
          next.set(widgetId, { status: 'error', data: null, error: item.error })
        } else if (item) {
          const state: WidgetState = { status: 'success', data: { columns: item.columns!, rows: item.rows! }, error: null }
          next.set(widgetId, state)
          // Also cache the new drill level
          const wCache = drillCacheRef.current.get(widgetId) ?? new Map()
          wCache.set(drillCacheKey(newDrill), state)
          drillCacheRef.current.set(widgetId, wCache)
        }
        return next
      })
    } catch (err: any) {
      setWidgetStates((prev) => { const next = new Map(prev); next.set(widgetId, { status: 'error', data: null, error: err?.message || 'Drill query failed' }); return next })
    }
  }, [drillStates, appliedFilters, widgetStates])

  const handleDrillUp = useCallback(async (widgetId: string, targetGrain?: TimeGrain) => {
    const currentDrill = drillStates.get(widgetId)
    if (!currentDrill || currentDrill.grain === 'YEAR') return

    let newDrill: DrillState | null
    if (targetGrain === 'YEAR' || currentDrill.grain === 'MONTH') {
      newDrill = null // back to top level
    } else {
      newDrill = { grain: 'MONTH', year: currentDrill.year }
    }

    // Check cache first — instant back-navigation
    const cacheKey = drillCacheKey(newDrill)
    const cached = drillCacheRef.current.get(widgetId)?.get(cacheKey)
    if (cached?.status === 'success') {
      setDrillStates((prev) => {
        const next = new Map(prev)
        if (newDrill) next.set(widgetId, newDrill)
        else next.delete(widgetId)
        return next
      })
      setWidgetStates((prev) => { const next = new Map(prev); next.set(widgetId, cached); return next })
      return
    }

    setDrillStates((prev) => {
      const next = new Map(prev)
      if (newDrill) next.set(widgetId, newDrill)
      else next.delete(widgetId)
      return next
    })

    const sql = newDrill
      ? buildDrillQuery(widgetId, newDrill, appliedFilters)
      : widgets.find((w) => w.id === widgetId)?.sql
    if (!sql) return

    setWidgetStates((prev) => { const next = new Map(prev); next.set(widgetId, { status: 'loading', data: null, error: null }); return next })

    try {
      const result = await executeBatch([{ id: widgetId, sql }])
      const item = result[widgetId]
      setWidgetStates((prev) => {
        const next = new Map(prev)
        if (item?.error) {
          next.set(widgetId, { status: 'error', data: null, error: item.error })
        } else if (item) {
          next.set(widgetId, { status: 'success', data: { columns: item.columns!, rows: item.rows! }, error: null })
        }
        return next
      })
    } catch (err: any) {
      setWidgetStates((prev) => { const next = new Map(prev); next.set(widgetId, { status: 'error', data: null, error: err?.message || 'Drill query failed' }); return next })
    }
  }, [drillStates, appliedFilters, widgets])

  /* ── Dimensional drill (Region → Nation) ── */

  const handleDimDrillDown = useCallback(async (widgetId: string, categoryValue: string) => {
    const sql = buildDimDrillQuery(widgetId, categoryValue, appliedFilters)
    if (!sql) return

    // Cache current (parent) state
    const currentState = widgetStates.get(widgetId)
    if (currentState?.status === 'success') {
      const wCache = drillCacheRef.current.get(widgetId) ?? new Map()
      wCache.set('dim:parent', currentState)
      drillCacheRef.current.set(widgetId, wCache)
    }

    setDimDrillStates((prev) => { const next = new Map(prev); next.set(widgetId, { parentValue: categoryValue }); return next })
    setWidgetStates((prev) => { const next = new Map(prev); next.set(widgetId, { status: 'loading', data: null, error: null }); return next })

    try {
      const result = await executeBatch([{ id: widgetId, sql }])
      const item = result[widgetId]
      setWidgetStates((prev) => {
        const next = new Map(prev)
        if (item?.error) {
          next.set(widgetId, { status: 'error', data: null, error: item.error })
        } else if (item) {
          next.set(widgetId, { status: 'success', data: { columns: item.columns!, rows: item.rows! }, error: null })
        }
        return next
      })
    } catch (err: any) {
      setWidgetStates((prev) => { const next = new Map(prev); next.set(widgetId, { status: 'error', data: null, error: err?.message || 'Drill query failed' }); return next })
    }
  }, [appliedFilters, widgetStates])

  const handleDimDrillUp = useCallback(async (widgetId: string) => {
    setDimDrillStates((prev) => { const next = new Map(prev); next.delete(widgetId); return next })

    // Restore from cache
    const cached = drillCacheRef.current.get(widgetId)?.get('dim:parent')
    if (cached?.status === 'success') {
      setWidgetStates((prev) => { const next = new Map(prev); next.set(widgetId, cached); return next })
      return
    }

    // Fallback: re-query original
    const widget = widgets.find((w) => w.id === widgetId)
    if (!widget) return
    setWidgetStates((prev) => { const next = new Map(prev); next.set(widgetId, { status: 'loading', data: null, error: null }); return next })
    try {
      const result = await executeBatch([{ id: widgetId, sql: widget.sql }])
      const item = result[widgetId]
      setWidgetStates((prev) => {
        const next = new Map(prev)
        if (item?.error) {
          next.set(widgetId, { status: 'error', data: null, error: item.error })
        } else if (item) {
          next.set(widgetId, { status: 'success', data: { columns: item.columns!, rows: item.rows! }, error: null })
        }
        return next
      })
    } catch (err: any) {
      setWidgetStates((prev) => { const next = new Map(prev); next.set(widgetId, { status: 'error', data: null, error: err?.message || 'Drill query failed' }); return next })
    }
  }, [widgets])

  // Reload when widgets change (filter apply) — preserves drill level
  useEffect(() => {
    loadAll()
  }, [loadAll])

  // Manual refresh resets drill to top level
  const handleRefresh = useCallback(() => {
    loadAll(true)
  }, [loadAll])

  const kpiWidgets = widgets.filter((w) => w.type === 'kpi')
  const chartWidgets = widgets.filter((w) => w.type !== 'kpi' && w.type !== 'table')
  const tableWidgets = widgets.filter((w) => w.type === 'table')
  const anyLoading = Array.from(widgetStates.values()).some((s) => s.status === 'loading')

  // ── Filter helpers ──

  const togglePendingFilter = useCallback((dim: string, value: string) => {
    setPendingFilters((prev) => {
      const next = new Map(prev)
      const current = next.get(dim) ?? new Set<string>()
      const updated = new Set(current)
      if (updated.has(value)) updated.delete(value)
      else updated.add(value)
      if (updated.size === 0) next.delete(dim)
      else next.set(dim, updated)
      return next
    })
  }, [])

  const clearPendingDim = useCallback((dim: string) => {
    setPendingFilters((prev) => {
      const next = new Map(prev)
      next.delete(dim)
      return next
    })
  }, [])

  const clearAllPending = useCallback(() => {
    setPendingFilters(new Map())
    setAppliedFilters({})
  }, [])

  const applyFilters = useCallback(() => {
    const filters: DashboardFilters = {}
    pendingFilters.forEach((values, key) => {
      if (values.size > 0) filters[key] = Array.from(values)
    })
    setAppliedFilters(filters)
    setFilterDropdown(null)
  }, [pendingFilters])

  const totalPendingCount = useMemo(
    () => Array.from(pendingFilters.values()).reduce((sum, s) => sum + s.size, 0),
    [pendingFilters]
  )

  const hasUnappliedChanges = useMemo(() => {
    for (const { name } of FILTERABLE_DIMS) {
      const pending = Array.from(pendingFilters.get(name) ?? []).sort()
      const applied = (appliedFilters[name] ?? []).slice().sort()
      if (pending.join(',') !== applied.join(',')) return true
    }
    return false
  }, [pendingFilters, appliedFilters])

  return (
    <main className="flex-1 bg-background overflow-hidden relative">
      {bulkLoading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
            <RefreshCw className="h-8 w-8 animate-spin text-primary" />
            <span className="text-sm font-medium text-muted-foreground">Loading dashboard...</span>
          </div>
        </div>
      )}
      <ScrollArea className="h-full">
        <div className="p-6 max-w-[1600px] mx-auto space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-foreground tracking-tight">
                Dashboard
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {catalog?.semantic_view ?? SNOWFLAKE_CONFIG.semanticView} — {catalog?.description || 'Auto-generated overview'}
              </p>
            </div>
            <button
              onClick={handleRefresh}
              disabled={anyLoading}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                anyLoading
                  ? 'bg-muted text-muted-foreground cursor-not-allowed'
                  : 'bg-foreground/8 text-foreground hover:bg-foreground/12'
              )}
            >
              <RefreshCw className={cn('h-3 w-3', anyLoading && 'animate-spin')} />
              Refresh
            </button>
          </div>

          {/* Filter Bar */}
          {catalog && (
            <div className="flex items-center gap-3 flex-wrap bg-card rounded-lg border border-border px-4 py-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Filter className="h-3.5 w-3.5" />
                <span className="font-medium">Filters</span>
              </div>

              {FILTERABLE_DIMS.map(({ name, label }) => {
                const selected = pendingFilters.get(name) ?? new Set<string>()
                const isOpen = filterDropdown === name
                const values = filterValues.get(name) ?? []

                return (
                  <div key={name} className="relative">
                    <button
                      onClick={() => setFilterDropdown(isOpen ? null : name)}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-all',
                        selected.size > 0
                          ? 'border-primary/50 bg-primary/10 text-primary'
                          : 'border-border bg-muted/50 text-muted-foreground hover:bg-muted'
                      )}
                    >
                      {label}
                      {selected.size > 0 && (
                        <span className="bg-primary text-primary-foreground px-1 rounded text-[10px] leading-4 min-w-[16px] text-center">
                          {selected.size}
                        </span>
                      )}
                      <ChevronDown className={cn('h-3 w-3 transition-transform', isOpen && 'rotate-180')} />
                    </button>

                    {isOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setFilterDropdown(null)} />
                        <div className="absolute top-full left-0 mt-1 z-50 w-56 bg-card rounded-lg border border-border shadow-lg p-2">
                          {values.length === 0 ? (
                            <p className="text-xs text-muted-foreground text-center py-3">Loading values...</p>
                          ) : (
                            <ScrollArea className="max-h-[220px]">
                              <div className="space-y-0.5">
                                {values.map((val) => (
                                  <label
                                    key={val}
                                    className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer text-xs"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={selected.has(val)}
                                      onChange={() => togglePendingFilter(name, val)}
                                      className="rounded border-border accent-primary"
                                    />
                                    <span className="text-foreground truncate">{val}</span>
                                  </label>
                                ))}
                              </div>
                            </ScrollArea>
                          )}
                          {selected.size > 0 && (
                            <button
                              onClick={() => clearPendingDim(name)}
                              className="w-full text-[11px] text-muted-foreground hover:text-foreground text-center py-1.5 mt-1 border-t border-border"
                            >
                              Clear {label}
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )
              })}

              {/* Active filter chips */}
              {totalPendingCount > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  {FILTERABLE_DIMS.map(({ name }) => {
                    const selected = pendingFilters.get(name)
                    if (!selected || selected.size === 0) return null
                    return Array.from(selected).map((val) => (
                      <span
                        key={`${name}-${val}`}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[11px]"
                      >
                        {val}
                        <button
                          onClick={() => togglePendingFilter(name, val)}
                          className="hover:text-destructive transition-colors"
                        >
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </span>
                    ))
                  })}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 ml-auto">
                {totalPendingCount > 0 && (
                  <button
                    onClick={clearAllPending}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Clear all
                  </button>
                )}
                {hasUnappliedChanges && (
                  <button
                    onClick={applyFilters}
                    disabled={anyLoading}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                      anyLoading
                        ? 'bg-muted text-muted-foreground cursor-not-allowed'
                        : 'bg-primary text-primary-foreground hover:opacity-90'
                    )}
                  >
                    Apply
                  </button>
                )}
              </div>
            </div>
          )}

          {/* KPI Row */}
          {kpiWidgets.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {kpiWidgets.map((w, i) => (
                <KpiCard
                  key={w.id}
                  widget={w}
                  state={widgetStates.get(w.id) ?? { status: 'loading', data: null, error: null }}
                  colorIndex={i}
                />
              ))}
            </div>
          )}

          {/* Charts Grid */}
          {chartWidgets.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {chartWidgets.map((w) => (
                <ChartCard
                  key={w.id}
                  widget={w}
                  state={widgetStates.get(w.id) ?? { status: 'loading', data: null, error: null }}
                  onRetry={() => retryWidget(w)}
                  drillState={drillStates.get(w.id)}
                  onDrillDown={DRILLABLE_WIDGETS.has(w.id) ? (dateValue) => handleDrillDown(w.id, dateValue) : undefined}
                  onDrillUp={DRILLABLE_WIDGETS.has(w.id) ? (targetGrain) => handleDrillUp(w.id, targetGrain) : undefined}
                  dimDrillState={dimDrillStates.get(w.id)}
                  dimDrillConfig={DIM_DRILLABLE_WIDGETS.has(w.id) ? getDimDrillConfig(w.id) : null}
                  onDimDrillDown={DIM_DRILLABLE_WIDGETS.has(w.id) ? (val) => handleDimDrillDown(w.id, val) : undefined}
                  onDimDrillUp={DIM_DRILLABLE_WIDGETS.has(w.id) ? () => handleDimDrillUp(w.id) : undefined}
                />
              ))}
            </div>
          )}

          {/* Detail Tables */}
          {tableWidgets.length > 0 && (
            <div className="space-y-4">
              {tableWidgets.map((w) => (
                <ChartCard
                  key={w.id}
                  widget={w}
                  state={widgetStates.get(w.id) ?? { status: 'loading', data: null, error: null }}
                  onRetry={() => retryWidget(w)}
                />
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </main>
  )
}
