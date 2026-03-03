import { useRef, useEffect } from 'react'
import embed, { type Config } from 'vega-embed'
import type { VegaLiteSpec } from '@/types/explore'

const FONT = 'Inter, system-ui, -apple-system, sans-serif'

const modernTheme: Config = {
  background: 'transparent',
  font: FONT,
  padding: 16,
  title: {
    font: FONT,
    fontSize: 14,
    fontWeight: 600,
    color: '#1e293b',
    anchor: 'start',
    offset: 12,
  },
  axis: {
    labelFont: FONT,
    labelFontSize: 11,
    labelColor: '#64748b',
    labelPadding: 8,
    titleFont: FONT,
    titleFontSize: 12,
    titleFontWeight: 500,
    titleColor: '#475569',
    titlePadding: 12,
    domain: false,
    tickSize: 0,
    grid: true,
    gridColor: '#e2e8f0',
    gridOpacity: 0.6,
    gridDash: [4, 4],
  },
  axisX: {
    grid: false,
    labelAngle: 0,
  },
  axisY: {
    gridDash: [4, 4],
  },
  legend: {
    labelFont: FONT,
    labelFontSize: 11,
    labelColor: '#64748b',
    titleFont: FONT,
    titleFontSize: 12,
    titleFontWeight: 500,
    titleColor: '#475569',
    symbolSize: 100,
    orient: 'bottom',
    direction: 'horizontal',
    offset: 8,
  },
  range: {
    category: [
      '#29b5e8', // primary cyan
      '#14b8a6', // teal
      '#8b5cf6', // violet
      '#f59e0b', // amber
      '#ef4444', // red
      '#ec4899', // pink
      '#06b6d4', // cyan variant
      '#84cc16', // lime
    ],
    ramp: { scheme: 'blues' },
  },
  bar: {
    cornerRadiusEnd: 4,
    color: '#29b5e8',
  },
  line: {
    strokeWidth: 2.5,
    point: { filled: true, size: 40 },
    color: '#29b5e8',
  },
  point: {
    filled: true,
    size: 60,
    color: '#29b5e8',
  },
  area: {
    opacity: 0.15,
    line: true,
    color: '#29b5e8',
  },
  arc: {
    innerRadius: 40,
    stroke: '#ffffff',
    strokeWidth: 2,
  },
  view: {
    stroke: 'transparent',
  },
}

interface VegaChartProps {
  spec: VegaLiteSpec
  className?: string
}

export function VegaChart({ spec, className }: VegaChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current || !spec) return

    const patchedSpec = {
      ...spec,
      $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
      width: 'container',
    }

    const result = embed(containerRef.current, patchedSpec as any, {
      actions: { export: true, source: false, compiled: false, editor: false },
      renderer: 'canvas',
      config: modernTheme,
    })

    return () => {
      result.then((res) => res.finalize())
    }
  }, [spec])

  return <div ref={containerRef} className={className} />
}
