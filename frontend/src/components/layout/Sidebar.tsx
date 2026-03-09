import type { ComponentType } from 'react';
import { NavLink } from 'react-router-dom';
import {
  MessageSquare,
  LayoutDashboard,
  TrendingUp,
  Boxes,
  Settings,
  Brain,
  UserCircle2,
  Plug,
} from 'lucide-react';
import clsx from 'clsx';

export const coreNavItems = [
  { label: 'Control Tower', path: '/app/control-tower', icon: LayoutDashboard },
  { label: 'Margin Brain', path: '/app/margin-brain', icon: TrendingUp },
  { label: 'Inventory & Waste', path: '/app/inventory-waste', icon: Boxes },
  { label: 'Manager Chat', path: '/app/manager-chat', icon: MessageSquare },
];

export const workspaceNavItems = [
  { label: 'Integrations', path: '/app/integrations', icon: Plug },
  { label: 'Profile', path: '/app/profile', icon: UserCircle2 },
  { label: 'Settings', path: '/app/settings', icon: Settings },
];

export const navItems = [...coreNavItems, ...workspaceNavItems];

interface SidebarProps {
  className?: string;
  onNavigate?: () => void;
}

function NavGroup({
  title,
  items,
  onNavigate,
}: {
  title: string;
  items: Array<{ label: string; path: string; icon: ComponentType<{ className?: string }> }>;
  onNavigate?: () => void;
}) {
  return (
    <div>
      <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{title}</p>
      <div className="space-y-1">
        {items.map(({ label, path, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            onClick={onNavigate}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
              )
            }
          >
            <Icon className="h-5 w-5" />
            {label}
          </NavLink>
        ))}
      </div>
    </div>
  );
}

export default function Sidebar({ className, onNavigate }: SidebarProps) {
  return (
    <aside className={clsx('hidden w-72 flex-col border-r border-slate-200 bg-white/95 lg:flex', className)}>
      <div className="flex items-center gap-3 border-b border-slate-200 px-6 py-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 shadow-lg shadow-orange-400/20">
          <Brain className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold leading-tight text-slate-900">TablePilot</h1>
          <p className="text-xs text-slate-500">AI Restaurant Operating System</p>
        </div>
      </div>

      <nav className="flex-1 space-y-6 px-3 py-4">
        <NavGroup title="Primary" items={coreNavItems} onNavigate={onNavigate} />
        <NavGroup title="Workspace" items={workspaceNavItems} onNavigate={onNavigate} />
      </nav>

      <div className="border-t border-slate-200 px-6 py-4">
        <p className="text-xs text-slate-500">TablePilot AI v0.3.0</p>
      </div>
    </aside>
  );
}
