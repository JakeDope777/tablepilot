import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Rocket } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { trackEvent } from '../services/analytics';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { signup } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    await trackEvent('signup_started');

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await signup(email, password);
      await trackEvent('signup_completed');
      navigate('/app/dashboard');
    } catch {
      setError('Signup failed. Email may already exist.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_bottom_right,_#c7d2fe,_transparent_35%),linear-gradient(180deg,_#ffffff,_#f8fafc)] px-4 py-10">
      <div className="mx-auto w-full max-w-md rounded-2xl border border-slate-200 bg-white/95 p-8 shadow-xl shadow-slate-300/40">
        <h1 className="text-2xl font-bold text-slate-900">Create workspace</h1>
        <p className="mt-1 text-sm text-slate-600">Set up your TablePilot AI account in under a minute.</p>

        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Work Email</label>
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
              placeholder="At least 8 characters"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="input-field"
              placeholder="Repeat password"
              required
            />
          </div>
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-60"
          >
            <Rocket className="h-4 w-4" />
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="mt-4 text-sm text-slate-600">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-slate-900 hover:text-slate-700">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}
