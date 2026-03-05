import { useCallback } from 'react'
import { Download } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { VegaLiteSpec } from '@/types/explore'

interface DataTableProps {
  chart?: VegaLiteSpec
  rawData?: string[][]
  className?: string
}

export function DataTable({ chart, rawData, className }: DataTableProps) {
  // Prefer chart.data.values, fall back to rawData (first row = headers)
  const chartValues = (chart?.data as any)?.values as Record<string, string>[] | undefined
  const dataValues: Record<string, string>[] | undefined = chartValues
    ?? (rawData && rawData.length > 1
      ? rawData.slice(1).map((row) => {
          const obj: Record<string, string> = {}
          rawData[0].forEach((h, i) => { obj[h] = row[i] ?? '' })
          return obj
        })
      : undefined)

  const exportCsv = useCallback(() => {
    if (!dataValues || dataValues.length === 0) return
    const headers = Object.keys(dataValues[0])
    const csvRows = [
      headers.join(','),
      ...dataValues.map((row) =>
        headers.map((h) => {
          const val = String(row[h] ?? '')
          return val.includes(',') || val.includes('"') || val.includes('\n')
            ? `"${val.replace(/"/g, '""')}"`
            : val
        }).join(',')
      ),
    ]
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'data.csv'
    a.click()
    URL.revokeObjectURL(url)
  }, [dataValues])

  if (!dataValues || dataValues.length === 0) return null

  const headers = Object.keys(dataValues[0])

  return (
    <div className={cn('border border-border rounded-lg overflow-hidden', className)}>
      <div className="flex items-center justify-end px-3 py-1.5 bg-muted/40 border-b border-border">
        <button
          onClick={exportCsv}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <Download className="h-3 w-3" />
          Export CSV
        </button>
      </div>
      <div className="max-h-[400px] overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted sticky top-0 z-10">
            <tr>
              {headers.map((header) => (
                <th
                  key={header}
                  className="px-4 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap border-b border-border"
                >
                  {header.replace(/_/g, ' ')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dataValues.map((row, rowIdx) => (
              <tr
                key={rowIdx}
                className="border-b border-border/50 hover:bg-muted/50 transition-colors"
              >
                {headers.map((header) => (
                  <td
                    key={header}
                    className="px-4 py-2 whitespace-nowrap text-foreground"
                  >
                    {row[header]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
