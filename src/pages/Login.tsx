import {
  useState,
  type FormEvent,
} from 'react';

import {
  ArrowRight,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

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

  const [email, setEmail] =
    useState('');

  const [password, setPassword] =
    useState('');

  const [loading, setLoading] =
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
    setPopup(
      (
        current
      ) => ({
        ...current,
        open: false,
      })
    );
  };

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (
      loading
    ) {
      return;
    }

    if (
      !email.trim()
    ) {
      showPopup(
        'warning',
        'Email Required',
        'Please enter your email address.'
      );

      return;
    }

    if (
      !password.trim()
    ) {
      showPopup(
        'warning',
        'Password Required',
        'Please enter your password.'
      );

      return;
    }

    setLoading(
      true
    );

    try {
      const result =
        await login(
          email.trim(),
          password
        );

      if (
        result.success
      ) {
        navigate(
          '/dashboard',
          {
            replace: true,
          }
        );

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
      setLoading(
        false
      );
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f5f7fb] px-4 py-6 sm:px-6 lg:px-8">
      <Popup
        open={
          popup.open
        }
        type={
          popup.type
        }
        title={
          popup.title
        }
        message={
          popup.message
        }
        onClose={
          closePopup
        }
      />

      <div className="pointer-events-none absolute left-[-8rem] top-[-8rem] h-80 w-80 rounded-full bg-blue-100/80 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-10rem] right-[-6rem] h-96 w-96 rounded-full bg-sky-100/70 blur-3xl" />

      <div className="relative mx-auto flex min-h-[calc(100vh-3rem)] max-w-6xl items-center justify-center">
        <div className="grid w-full overflow-hidden rounded-[34px] border border-slate-200/80 bg-white shadow-[0_30px_90px_rgba(15,23,42,0.12)] lg:grid-cols-[1.08fr_0.92fr]">
          <section className="relative hidden min-h-[690px] overflow-hidden bg-[#0b2a52] p-10 text-white lg:flex lg:flex-col lg:justify-between xl:p-12">
            <div className="absolute right-[-110px] top-[-100px] h-80 w-80 rounded-full border border-white/10" />
            <div className="absolute right-[-35px] top-[-25px] h-48 w-48 rounded-full border border-white/10" />
            <div className="absolute bottom-24 left-12 h-px w-48 bg-gradient-to-r from-sky-300/70 to-transparent" />

            <div className="relative">
              <div className="inline-flex rounded-2xl bg-white px-3 py-2 shadow-xl shadow-black/15">
                <img
                  src="/neddconsultantlogo.png"
                  alt="Nedd Consultant"
                  className="h-20 w-auto object-contain"
                />
              </div>
            </div>

            <div className="relative max-w-lg">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs font-medium text-blue-100">
                <Sparkles className="h-3.5 w-3.5 text-sky-300" />
                Employee & Management Portal
              </div>

              <h1 className="mt-6 text-4xl font-semibold leading-tight tracking-tight xl:text-5xl">
                A simpler way to manage leave across your organization.
              </h1>

              <p className="mt-5 max-w-md text-sm leading-7 text-blue-100/75">
                Request leave, review approvals, track balances and manage employee records from one secure workspace.
              </p>

              <div className="mt-9 grid gap-3">
                {[
                  'Real-time leave balances',
                  'Manager approval workflows',
                  'Employee records and policy controls',
                ].map(
                  (
                    item
                  ) => (
                    <div
                      key={
                        item
                      }
                      className="flex items-center gap-3 text-sm text-blue-50/90"
                    >
                      <span className="grid h-7 w-7 place-items-center rounded-full bg-white/10">
                        <ShieldCheck className="h-3.5 w-3.5 text-sky-300" />
                      </span>
                      {
                        item
                      }
                    </div>
                  )
                )}
              </div>
            </div>

            <p className="relative text-xs text-blue-100/40">
              Powered by Nedd Consultant
            </p>
          </section>

          <section className="flex items-center justify-center px-5 py-10 sm:px-10 lg:px-12 xl:px-14">
            <div className="w-full max-w-md">
              <div className="mb-8 flex justify-center lg:hidden">
                <div className="inline-flex rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
                  <img
                    src="/neddconsultantlogo.png"
                    alt="Nedd Consultant"
                    className="h-16 w-auto object-contain"
                  />
                </div>
              </div>

              <div>
                <span className="inline-flex rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                  Secure Sign In
                </span>

                <h2 className="mt-5 text-3xl font-bold tracking-tight text-slate-950">
                  Welcome back
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Sign in using the credentials provided by your organization.
                </p>
              </div>

              <form
                onSubmit={
                  handleSubmit
                }
                className="mt-8 space-y-5"
              >
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Work email
                  </label>

                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                    <input
                      type="email"
                      value={
                        email
                      }
                      onChange={(
                        event
                      ) =>
                        setEmail(
                          event
                            .target
                            .value
                        )
                      }
                      disabled={
                        loading
                      }
                      autoComplete="email"
                      placeholder="name@company.com"
                      className="w-full rounded-2xl border border-slate-200 bg-white py-3.5 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Password
                  </label>

                  <div className="relative">
                    <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                    <input
                      type="password"
                      value={
                        password
                      }
                      onChange={(
                        event
                      ) =>
                        setPassword(
                          event
                            .target
                            .value
                        )
                      }
                      disabled={
                        loading
                      }
                      autoComplete="current-password"
                      placeholder="Enter your password"
                      className="w-full rounded-2xl border border-slate-200 bg-white py-3.5 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={
                    loading
                  }
                  className="group flex w-full items-center justify-center gap-2 !rounded-2xl !bg-[#1557a8] !py-3.5 !font-semibold hover:!bg-[#104a91]"
                >
                  {
                    loading
                      ? 'Signing in...'
                      : (
                        <>
                          Sign in
                          <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                        </>
                      )
                  }
                </Button>
              </form>

              <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />

                  <p className="text-xs leading-5 text-slate-500">
                    Your account access is managed by your organization. Contact your administrator if you have trouble signing in.
                  </p>
                </div>
              </div>

              <p className="mt-8 text-center text-xs text-slate-400">
                © 2026 Nedd Consultant · Leave Management Software
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
