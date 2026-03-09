import { Bell, LogOut, Menu, User } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface HeaderProps {
  onMenuClick?: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="h-16 bg-white/90 backdrop-blur border-b border-slate-200 flex items-center justify-between px-4 sm:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="p-2 text-slate-500 hover:text-slate-700 rounded-lg hover:bg-slate-100 lg:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Control Center</p>
          <h2 className="text-sm sm:text-base font-semibold text-slate-900">TablePilot AI</h2>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <button className="relative p-2 text-slate-500 hover:text-slate-700 rounded-lg hover:bg-slate-100">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-orange-500 rounded-full" />
        </button>
        <Link
          to="/app/profile"
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-700 rounded-lg hover:bg-slate-100"
        >
          <User className="w-5 h-5" />
          <span className="hidden sm:inline">{user?.email ?? 'Account'}</span>
        </Link>
        <button
          onClick={handleLogout}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
}
