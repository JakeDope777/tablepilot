import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { authService } from '../services/api';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = useMemo(() => searchParams.get('token') || '', [searchParams]);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token) {
      setMessage('Missing reset token.');
      return;
    }
    if (password.length < 8) {
      setMessage('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setMessage('Passwords do not match.');
      return;
    }
    setLoading(true);
    setMessage('');
    try {
      const response = await authService.resetPassword(token, password);
      setMessage(response.message);
    } catch {
      setMessage('Invalid or expired reset token.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-12">
      <div className="mx-auto max-w-md rounded-2xl bg-white p-8 shadow-lg border border-slate-200">
        <h1 className="text-xl font-semibold text-slate-900">Reset password</h1>
        <form className="mt-5 space-y-4" onSubmit={submit}>
          <div>
            <label className="mb-1 block text-sm text-slate-700">New password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-700">Confirm password</label>
            <input
              type="password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="input-field"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {loading ? 'Updating...' : 'Update password'}
          </button>
        </form>
        {message && <p className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">{message}</p>}
        <p className="mt-4 text-sm text-slate-600">
          Back to{' '}
          <Link to="/login" className="font-semibold text-orange-600 hover:text-orange-700">
            login
          </Link>
        </p>
      </div>
    </div>
  );
}
