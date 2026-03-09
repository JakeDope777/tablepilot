import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import { isAxiosError } from 'axios';
import { useAuth } from '../context/AuthContext';
import { trackEvent } from '../services/analytics';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      await trackEvent('login_completed');
      navigate('/app/control-tower');
    } catch (err) {
      if (isAxiosError(err)) {
        const detail = (err.response?.data as { detail?: string } | undefined)?.detail;
        if (detail) {
          setError(detail);
          return;
        }
      }
      setError('Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#fed7aa,_transparent_35%),linear-gradient(180deg,_#ffffff,_#f8fafc)] px-4 py-10">
      <div className="mx-auto w-full max-w-md rounded-2xl border border-slate-200 bg-white/95 p-8 shadow-xl shadow-slate-300/40">
        <h1 className="text-2xl font-bold text-slate-900">Welcome back</h1>
        <p className="mt-1 text-sm text-slate-600">Log in to run daily restaurant operations.</p>

        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field"
              placeholder="you@company.com"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field"
              placeholder="••••••••"
              required
            />
          </div>
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
          >
            <LogIn className="h-4 w-4" />
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        <p className="mt-2 text-right">
          <Link to="/forgot-password" className="text-sm font-medium text-slate-700 hover:text-slate-900">
            Forgot password?
          </Link>
        </p>
        <p className="mt-1 text-right">
          <Link to="/verify-email" className="text-sm font-medium text-slate-700 hover:text-slate-900">
            Resend verification email
          </Link>
        </p>

        <p className="mt-4 text-sm text-slate-600">
          Need an account?{' '}
          <Link to="/register" className="font-semibold text-orange-600 hover:text-orange-700">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
