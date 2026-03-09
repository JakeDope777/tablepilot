import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authService } from '../services/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const response = await authService.forgotPassword(email);
      setMessage(response.message);
    } catch {
      setMessage('Unable to send reset email right now.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-12">
      <div className="mx-auto max-w-md rounded-2xl bg-white p-8 shadow-lg border border-slate-200">
        <h1 className="text-xl font-semibold text-slate-900">Forgot password</h1>
        <p className="mt-1 text-sm text-slate-600">We will send reset instructions to your email.</p>
        <form className="mt-5 space-y-4" onSubmit={submit}>
          <div>
            <label className="mb-1 block text-sm text-slate-700">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field"
              placeholder="you@company.com"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {loading ? 'Sending...' : 'Send reset link'}
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
