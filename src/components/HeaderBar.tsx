import { Snowflake, Database, Compass, LayoutDashboard } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'

export type AppTab = 'explorer' | 'dashboard'

interface HeaderBarProps {
  semanticView: string | null
  loading: boolean
  activeTab: AppTab
  onTabChange: (tab: AppTab) => void
}

export function HeaderBar({ semanticView, loading, activeTab, onTabChange }: HeaderBarProps) {
  return (
    <header className="h-14 bg-sidebar flex items-center justify-between px-5 shrink-0">
      <div className="flex items-center gap-2.5">
        <Snowflake className="h-6 w-6 text-sidebar-accent" />
        <h1 className="text-base font-semibold text-white tracking-tight">
          Domo Snowflake Semantic View BI
        </h1>
      </div>

      {/* Tab switcher */}
      <div className="flex items-center bg-sidebar-muted rounded-lg p-0.5">
        <button
          onClick={() => onTabChange('explorer')}
          className={cn(
            'flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-medium transition-all',
            activeTab === 'explorer'
              ? 'bg-sidebar-accent text-white shadow-sm'
              : 'text-sidebar-foreground/60 hover:text-sidebar-foreground'
          )}
        >
          <Compass className="h-3.5 w-3.5" />
          Explorer
        </button>
        <button
          onClick={() => onTabChange('dashboard')}
          className={cn(
            'flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-medium transition-all',
            activeTab === 'dashboard'
              ? 'bg-sidebar-accent text-white shadow-sm'
              : 'text-sidebar-foreground/60 hover:text-sidebar-foreground'
          )}
        >
          <LayoutDashboard className="h-3.5 w-3.5" />
          Dashboard
        </button>
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
