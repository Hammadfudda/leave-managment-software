import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Button from '../components/ui/Button';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDemo, setShowDemo] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = login(email, password);
    setLoading(false);
    if (result.success) navigate('/dashboard');
    else setError(result.error || 'Login failed');
  };

  const quickLogin = (em: string, pw: string) => {
    setEmail(em);
    setPassword(pw);
    setError('');
    const result = login(em, pw);
    if (result.success) navigate('/dashboard');
    else setError(result.error || 'Login failed');
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center overflow-y-auto bg-gradient-to-br from-slate-50 via-blue-50/40 to-slate-100 px-4 py-4">
      <div className="w-full max-w-sm">
        <div className="mb-4 flex flex-col items-center">
          <img src="/Nutrilov_Logo.webp" alt="Nutrilov" className="h-14 w-14 rounded-xl object-contain" />
          <h1 className="mt-3 text-xl font-semibold text-gray-900">Nutrilov</h1>
          <p className="text-xs text-gray-500">Leave Management Software</p>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-xl shadow-gray-200/50">
          <h2 className="text-base font-semibold text-gray-900">Sign in</h2>
          <p className="mt-0.5 text-xs text-gray-500">Use your organization credentials to continue.</p>

          <form onSubmit={handleSubmit} className="mt-4 space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@nutrilov.com"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            {error && (
              <div className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700 ring-1 ring-inset ring-rose-200">
                {error}
              </div>
            )}

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>

          <div className="mt-3 border-t border-gray-100 pt-3">
            <button
              type="button"
              onClick={() => setShowDemo(!showDemo)}
              className="text-xs font-medium text-blue-600 hover:text-blue-700"
            >
              {showDemo ? 'Hide demo accounts' : 'Show demo accounts'}
            </button>
            {showDemo && (
              <div className="mt-2 grid grid-cols-2 gap-1.5">
                {[
                  { label: 'Admin', em: 'admin@nutrilov.com', pw: 'admin123' },
                  { label: 'Manager', em: 'manager@nutrilov.com', pw: 'manager123' },
                  { label: 'Team Lead', em: 'tl@nutrilov.com', pw: 'tl123' },
                  { label: 'Employee', em: 'employee@nutrilov.com', pw: 'emp123' },
                ].map((a) => (
                  <button
                    key={a.label}
                    type="button"
                    onClick={() => quickLogin(a.em, a.pw)}
                    className="rounded-lg border border-gray-200 px-2 py-1.5 text-[11px] font-medium text-gray-600 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <p className="mt-3 text-center text-[10px] text-gray-400">© 2026 Nutrilov · Internal use only</p>
      </div>
    </div>
  );
}
