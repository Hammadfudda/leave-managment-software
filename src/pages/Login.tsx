import {
  useState,
  type FormEvent,
} from 'react';

import { useNavigate } from 'react-router-dom';

import { useAuth } from '../context/AuthContext';
import Button from '../components/ui/Button';
import Popup from '../components/ui/Popup';

type PopupType =
  | 'success'
  | 'error'
  | 'warning'
  | 'info';

interface PopupState {
  open: boolean;
  type: PopupType;
  title: string;
  message: string;
}

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const [popup, setPopup] = useState<PopupState>({
    open: false,
    type: 'error',
    title: '',
    message: '',
  });

  const showPopup = (
    type: PopupType,
    title: string,
    message: string
  ) => {
    setPopup({
      open: true,
      type,
      title,
      message,
    });
  };

  const closePopup = () => {
    setPopup((current) => ({
      ...current,
      open: false,
    }));
  };

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (loading) return;

    if (!email.trim()) {
      showPopup(
        'warning',
        'Email Required',
        'Please enter your email address.'
      );
      return;
    }

    if (!password.trim()) {
      showPopup(
        'warning',
        'Password Required',
        'Please enter your password.'
      );
      return;
    }

    setLoading(true);

    try {
      const result = await login(email.trim(), password);

      if (result.success) {
        navigate('/dashboard', { replace: true });
        return;
      }

      showPopup(
        'error',
        'Login Failed',
        result.error || 'Invalid email or password.'
      );
    } catch {
      showPopup(
        'error',
        'Login Failed',
        'Unable to sign in. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center overflow-y-auto bg-gradient-to-br from-slate-50 via-blue-50/40 to-slate-100 px-4 py-4">
      <Popup
        open={popup.open}
        type={popup.type}
        title={popup.title}
        message={popup.message}
        onClose={closePopup}
      />

      <div className="w-full max-w-sm">
        <div className="mb-4 flex flex-col items-center">
          <img
           src="/neddconsultantlogo.jpeg"
  alt="Nedd Consultant"
            className="h-16 w-auto object-contain"
          />

          <h1 className="mt-3 text-xl font-semibold text-gray-900">
            Nedd Consultant
          </h1>

          <p className="text-xs text-gray-500">
            Leave Management Software
          </p>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-xl shadow-gray-200/50">
          <h2 className="text-base font-semibold text-gray-900">
            Sign in
          </h2>

          <p className="mt-0.5 text-xs text-gray-500">
            Use your organization credentials to continue.
          </p>

          <form onSubmit={handleSubmit} className="mt-4 space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">
                Email
              </label>

              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={loading}
                autoComplete="email"
                placeholder="you@company.com"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:bg-gray-50"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">
                Password
              </label>

              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={loading}
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:bg-gray-50"
              />
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>
        </div>

        <p className="mt-3 text-center text-[10px] text-gray-400">
          © 2026 Nedd Consultant · Leave Management Software
        </p>
      </div>
    </div>
  );
}
