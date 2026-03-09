import { useState, type ComponentType } from 'react';
import { X, Sparkles } from 'lucide-react';
import { NavLink, Outlet, Link } from 'react-router-dom';
import Sidebar, { coreNavItems, workspaceNavItems } from './Sidebar';
import Header from './Header';
import clsx from 'clsx';

function DemoBanner() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed || localStorage.getItem('demo_mode') !== '1') return null;

  return (
    <div className="flex items-center justify-between gap-4 bg-orange-500 px-4 py-2 text-sm text-white">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 flex-shrink-0" />
        <span className="font-medium">Demo mode</span>
        <span className="hidden text-orange-100 sm:inline">Single-venue pilot data. No account needed.</span>
      </div>
      <div className="flex items-center gap-3">
        <Link
          to="/register"
          onClick={() => localStorage.removeItem('demo_mode')}
          className="whitespace-nowrap rounded-lg border border-white/40 bg-white/15 px-3 py-1 text-xs font-semibold transition-colors hover:bg-white/25"
        >
          Create account →
        </Link>
        <button onClick={() => setDismissed(true)} className="rounded p-0.5 hover:bg-white/20">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function MobileNavGroup({
  title,
  items,
  onNavigate,
}: {
  title: string;
  items: Array<{ label: string; path: string; icon: ComponentType<{ className?: string }> }>;
  onNavigate: () => void;
}) {
  return (
    <div className="space-y-1">
      <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{title}</p>
      {items.map(({ label, path, icon: Icon }) => (
        <NavLink
          key={path}
          to={path}
          onClick={onNavigate}
          className={({ isActive }) =>
            clsx(
              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium',
              isActive ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100',
            )
          }
        >
          <Icon className="h-5 w-5" />
          {label}
        </NavLink>
      ))}
    </div>
  );
}

export default function Layout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-b from-orange-50 via-amber-50 to-slate-100">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <DemoBanner />
        <Header onMenuClick={() => setMobileMenuOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <Outlet />
        </main>
      </div>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            aria-label="Close menu backdrop"
            onClick={() => setMobileMenuOpen(false)}
            className="absolute inset-0 bg-slate-900/30"
          />
          <aside className="absolute left-0 top-0 h-full w-72 border-r border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4">
              <p className="text-sm font-semibold text-slate-900">Navigation</p>
              <button onClick={() => setMobileMenuOpen(false)} className="rounded-md p-2 text-slate-600 hover:bg-slate-100">
                <X className="h-4 w-4" />
              </button>
            </div>
            <nav className="space-y-5 px-3 py-4">
              <MobileNavGroup title="Primary" items={coreNavItems} onNavigate={() => setMobileMenuOpen(false)} />
              <MobileNavGroup title="Workspace" items={workspaceNavItems} onNavigate={() => setMobileMenuOpen(false)} />
            </nav>
          </aside>
        </div>
      )}
    </div>
  );
}
