import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { authService } from '../services/api';
import { trackEvent } from '../services/analytics';
import { useAuth } from '../context/AuthContext';

export default function VerifyEmailPage() {
  const { isAuthenticated, user } = useAuth();
  const [searchParams] = useSearchParams();
  const token = useMemo(() => searchParams.get('token') || '', [searchParams]);
  const pending = useMemo(() => searchParams.get('pending') === '1', [searchParams]);
  const initialEmail = useMemo(() => user?.email || '', [user?.email]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState(initialEmail);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    setEmail(initialEmail);
  }, [initialEmail]);

  useEffect(() => {
    const verify = async () => {
      if (!token) {
        if (pending) {
          setStatus('idle');
          setMessage('Your email is not verified yet.');
          return;
        }
        setStatus('error');
        setMessage('Missing verification token.');
        return;
      }
      setStatus('loading');
      try {
        const response = await authService.verifyEmail(token);
        setStatus('success');
        setMessage(response.message);
        await trackEvent('verification_completed');
      } catch {
        setStatus('error');
        setMessage('Invalid or expired verification token.');
      }
    };
    void verify();
  }, [pending, token]);

  const resendVerification = async () => {
    setSending(true);
    setStatus('idle');
    setMessage('');
    try {
      const response = isAuthenticated
        ? await authService.sendVerification()
        : await authService.sendVerification(email);
      setStatus('success');
      setMessage(response.message);
      await trackEvent('verification_email_resent');
    } catch {
      setStatus('error');
      setMessage('Could not send verification email right now.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-12">
      <div className="mx-auto max-w-md rounded-2xl bg-white p-8 shadow-lg border border-slate-200">
        <h1 className="text-xl font-semibold text-slate-900">Verify email</h1>
        <p className="mt-2 text-sm text-slate-600">
          {token
            ? 'Confirming your verification token.'
            : 'We can send a fresh verification email.'}
        </p>
        {(status !== 'idle' || message) && (
          <p className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
            {status === 'loading' ? 'Verifying...' : message}
          </p>
        )}
        {!token && (
          <div className="mt-4 space-y-3">
            {!isAuthenticated && (
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
            )}
            <button
              type="button"
              onClick={() => void resendVerification()}
              disabled={sending || (!isAuthenticated && !email)}
              className="inline-flex w-full items-center justify-center rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
            >
              {sending ? 'Sending...' : 'Resend verification email'}
            </button>
          </div>
        )}
        {(status === 'success' || status === 'error') && (
          <p className="mt-4 text-sm text-slate-600">
            Continue to{' '}
            <Link to="/login" className="font-semibold text-orange-600 hover:text-orange-700">
              login
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
