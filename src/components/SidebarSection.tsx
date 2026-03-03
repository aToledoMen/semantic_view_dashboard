import { useState } from 'react'
import { ChevronDown, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'

interface SidebarSectionProps {
  title: string
  icon: React.ReactNode
  count: number
  selectedCount: number
  children: React.ReactNode
  defaultOpen?: boolean
  searchable?: boolean
  searchValue: string
  onSearchChange: (value: string) => void
}

export function SidebarSection({
  title,
  icon,
  count,
  selectedCount,
  children,
  defaultOpen = true,
  searchable = true,
  searchValue,
  onSearchChange,
}: SidebarSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className="border-b border-sidebar-border">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 w-full px-3 py-2.5 hover:bg-sidebar-muted transition-colors"
      >
        <span className="text-sidebar-accent">{icon}</span>
        <span className="text-sm font-medium text-sidebar-foreground flex-1 text-left">
          {title}
        </span>
        {selectedCount > 0 && (
          <span className="text-[10px] font-semibold bg-sidebar-accent text-white px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
            {selectedCount}
          </span>
        )}
        <span className="text-xs text-sidebar-foreground/50">{count}</span>
        <ChevronDown
          className={cn(
            'h-4 w-4 text-sidebar-foreground/50 transition-transform duration-200',
            !isOpen && '-rotate-90'
          )}
        />
      </button>

      {isOpen && (
        <div className="pb-2">
          {searchable && count > 5 && (
            <div className="px-3 pb-2">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-sidebar-foreground/40" />
                <Input
                  value={searchValue}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder="Filter..."
                  className="h-7 pl-7 text-xs bg-sidebar-muted border-sidebar-border text-sidebar-foreground placeholder:text-sidebar-foreground/40 focus-visible:ring-sidebar-accent"
                />
              </div>
            </div>
          )}
          <ScrollArea className="max-h-[280px]">
            <div className="px-1">{children}</div>
          </ScrollArea>
        </div>
      )}
    </div>
  )
}
