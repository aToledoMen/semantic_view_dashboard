import { Snowflake, Database } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

interface HeaderBarProps {
  semanticView: string | null
  loading: boolean
}

export function HeaderBar({ semanticView, loading }: HeaderBarProps) {
  return (
    <header className="h-14 bg-sidebar flex items-center justify-between px-5 shrink-0">
      <div className="flex items-center gap-2.5">
        <Snowflake className="h-6 w-6 text-sidebar-accent" />
        <h1 className="text-base font-semibold text-white tracking-tight">
          Snowflake BI Explorer
        </h1>
      </div>

      <div className="flex items-center gap-2">
        {loading ? (
          <Skeleton className="h-5 w-48 bg-sidebar-muted" />
        ) : semanticView ? (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-sidebar-muted">
            <Database className="h-3.5 w-3.5 text-sidebar-accent" />
            <span className="text-xs font-medium text-sidebar-foreground">
              {semanticView}
            </span>
          </div>
        ) : null}
      </div>
    </header>
  )
}
