import { cn } from '@/lib/utils'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { VegaLiteSpec } from '@/types/explore'

interface DataTableProps {
  chart: VegaLiteSpec
  className?: string
}

export function DataTable({ chart, className }: DataTableProps) {
  const dataValues = (chart?.data as any)?.values as Record<string, string>[] | undefined
  if (!dataValues || dataValues.length === 0) return null

  const headers = Object.keys(dataValues[0])

  return (
    <div className={cn('border border-border rounded-lg overflow-hidden', className)}>
      <ScrollArea className="max-h-[400px]">
        <div className="overflow-x-auto">
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
      </ScrollArea>
    </div>
  )
}
