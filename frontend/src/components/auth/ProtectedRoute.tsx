import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

/** Pass ?demo=1 in any URL (or "Open Dashboard Free" CTA) to
 *  skip auth checks and explore all pages with demo fallback data. */
function isDemoMode(): boolean {
  if (typeof window === 'undefined') return false;
  if (new URLSearchParams(window.location.search).get('demo') === '1') {
    localStorage.setItem('demo_mode', '1');
    return true;
  }
  return localStorage.getItem('demo_mode') === '1';
}

export default function ProtectedRoute() {
  const { loading, isAuthenticated, user } = useAuth();
  const location = useLocation();

  // Allow demo exploration without a real account
  if (isDemoMode()) return <Outlet />;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="h-10 w-10 rounded-full border-4 border-slate-300 border-t-slate-700 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  if (user && user.is_email_verified === false) {
    return <Navigate to="/verify-email?pending=1" replace />;
  }

  return <Outlet />;
}
