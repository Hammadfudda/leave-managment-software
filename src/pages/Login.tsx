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
  const [password, setPassword] =
    useState('');

  const [loading, setLoading] =
    useState(false);

  const [showDemo, setShowDemo] =
    useState(false);

  const [popup, setPopup] =
    useState<PopupState>({
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
      const result = await login(
        email.trim(),
        password
      );

      if (result.success) {
        navigate('/dashboard', {
          replace: true,
        });
        return;
      }

      showPopup(
        'error',
        'Login Failed',
        result.error ||
          'Invalid email or password.'
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

  /**
   * Temporary demo login handler.
   *
   * Demo/client separation will be handled
   * after the real frontend/backend API
   * integration is complete.
   */
  const quickLogin = async (
    demoEmail: string,
    demoPassword: string
  ) => {
    if (loading) return;

    setEmail(demoEmail);
    setPassword(demoPassword);
    setLoading(true);

    try {
      const result = await login(
        demoEmail,
        demoPassword
      );

      if (result.success) {
        navigate('/dashboard', {
          replace: true,
        });
        return;
      }

      showPopup(
        'error',
        'Demo Login Failed',
        result.error ||
          'This demo account is not available on the current backend.'
      );
    } catch {
      showPopup(
        'error',
        'Demo Login Failed',
        'Unable to sign in with this demo account.'
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
            src="/Nutrilov_Logo.webp"
            alt="Nutrilov"
            className="h-14 w-14 rounded-xl object-contain"
          />

          <h1 className="mt-3 text-xl font-semibold text-gray-900">
            Nutrilov
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
            Use your organization credentials
            to continue.
          </p>

          <form
            onSubmit={handleSubmit}
            className="mt-4 space-y-3"
          >
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">
                Email
              </label>

              <input
                type="email"
                value={email}
                onChange={(event) =>
                  setEmail(
                    event.target.value
                  )
                }
                disabled={loading}
                autoComplete="email"
                placeholder="you@nutrilov.com"
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
                onChange={(event) =>
                  setPassword(
                    event.target.value
                  )
                }
                disabled={loading}
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:bg-gray-50"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full"
            >
              {loading
                ? 'Signing in...'
                : 'Sign in'}
            </Button>
          </form>

          <div className="mt-3 border-t border-gray-100 pt-3">
            <button
              type="button"
              disabled={loading}
              onClick={() =>
                setShowDemo(
                  (current) =>
                    !current
                )
              }
              className="text-xs font-medium text-blue-600 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {showDemo
                ? 'Hide demo accounts'
                : 'Show demo accounts'}
            </button>

            {showDemo && (
              <div className="mt-2 grid grid-cols-2 gap-1.5">
                {[
                  {
                    label: 'Admin',
                    email:
                      'admin@nutrilov.com',
                    password:
                      'admin123',
                  },
                  {
                    label: 'Manager',
                    email:
                      'manager@nutrilov.com',
                    password:
                      'manager123',
                  },
                  {
                    label:
                      'Employee',
                    email:
                      'employee@nutrilov.com',
                    password:
                      'emp123',
                  },
                ].map(
                  (account) => (
                    <button
                      key={
                        account.label
                      }
                      type="button"
                      disabled={
                        loading
                      }
                      onClick={() =>
                        quickLogin(
                          account.email,
                          account.password
                        )
                      }
                      className="rounded-lg border border-gray-200 px-2 py-1.5 text-[11px] font-medium text-gray-600 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {
                        account.label
                      }
                    </button>
                  )
                )}
              </div>
            )}
          </div>
        </div>

        <p className="mt-3 text-center text-[10px] text-gray-400">
          © 2026 Nutrilov · Internal use
          only
        </p>

        <div className="mt-4 flex flex-row items-center justify-center gap-2">
          <img
            src="/nedd-logo.png"
            alt="Nedd Consultant"
            className="h-10 w-auto object-contain opacity-100"
          />

          <p className="text-xs font-medium text-gray-500">
            Made by Nedd Consultant
          </p>
        </div>
      </div>
    </div>
  );
}