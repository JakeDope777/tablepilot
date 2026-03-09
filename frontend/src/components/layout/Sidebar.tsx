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

export const navItems = [
  { label: 'Control Tower', path: '/app/control-tower', icon: LayoutDashboard },
  { label: 'Margin Brain', path: '/app/margin-brain', icon: TrendingUp },
  { label: 'Inventory & Waste', path: '/app/inventory-waste', icon: Boxes },
  { label: 'Manager Chat', path: '/app/manager-chat', icon: MessageSquare },
  { label: 'Integrations', path: '/app/integrations', icon: Plug },
  { label: 'Profile', path: '/app/profile', icon: UserCircle2 },
  { label: 'Settings', path: '/app/settings', icon: Settings },
];

interface SidebarProps {
  className?: string;
  onNavigate?: () => void;
}

export default function Sidebar({ className, onNavigate }: SidebarProps) {
  return (
    <aside className={clsx('w-72 bg-white/95 border-r border-slate-200 flex-col hidden lg:flex', className)}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-200">
        <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center shadow-lg shadow-orange-400/20">
          <Brain className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-slate-900 leading-tight">TablePilot</h1>
          <p className="text-xs text-slate-500">Restaurant Operating System</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ label, path, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            onClick={onNavigate}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              )
            }
          >
            <Icon className="w-5 h-5" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-slate-200">
        <p className="text-xs text-slate-500">TablePilot AI v0.2.0</p>
      </div>
    </aside>
  );
}
