import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function PublicOnlyRoute() {
  const { loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="h-10 w-10 rounded-full border-4 border-slate-300 border-t-slate-700 animate-spin" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/app/control-tower" replace />;
  }

  return <Outlet />;
}
