import {
  useState,
  type FormEvent,
} from 'react';

import {
  Eye,
  EyeOff,
  KeyRound,
  ShieldCheck,
} from 'lucide-react';

import Button from '../ui/Button';

import {
  useAuth,
} from '../../context/AuthContext';

import api, {
  getApiErrorMessage,
} from '../../services/api';

export default function ChangePasswordRequired() {
  const {
    user,
    logout,
  } = useAuth();

  const [
    currentPassword,
    setCurrentPassword,
  ] = useState('');

  const [
    newPassword,
    setNewPassword,
  ] = useState('');

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState('');

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState('');

  const [
    showCurrent,
    setShowCurrent,
  ] = useState(false);

  const [
    showNew,
    setShowNew,
  ] = useState(false);

  const submit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (
      !currentPassword ||
      !newPassword ||
      !confirmPassword
    ) {
      setError(
        'Complete all password fields.'
      );
      return;
    }

    if (
      newPassword.length < 8
    ) {
      setError(
        'New password must be at least 8 characters.'
      );
      return;
    }

    if (
      newPassword !==
      confirmPassword
    ) {
      setError(
        'New password and confirmation do not match.'
      );
      return;
    }

    if (
      newPassword ===
      currentPassword
    ) {
      setError(
        'New password must be different from your temporary password.'
      );
      return;
    }

    setSaving(true);
    setError('');

    try {
      await api.post(
        '/auth/change-password',
        {
          currentPassword,
          newPassword,
        }
      );

      await logout();

      window.location.replace(
        '/'
      );
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          'Unable to change your password.'
        )
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-5 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-sm">
            <ShieldCheck
              size={28}
            />
          </div>

          <h1 className="mt-4 text-2xl font-semibold text-gray-900">
            Change Your Password
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Welcome{user?.fullName ? `, ${user.fullName}` : ''}. Your account is using a temporary password.
          </p>
        </div>

        <form
          onSubmit={submit}
          className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
        >
          <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <p className="font-semibold">
              Password change required
            </p>

            <p className="mt-1 leading-5">
              Once you log in, you have to change your password before you can use the Leave Management System.
            </p>
          </div>

          {error && (
            <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <PasswordField
              label="Temporary / Current Password"
              value={currentPassword}
              onChange={setCurrentPassword}
              visible={showCurrent}
              onToggle={() =>
                setShowCurrent(
                  (current) =>
                    !current
                )
              }
            />

            <PasswordField
              label="New Password"
              value={newPassword}
              onChange={setNewPassword}
              visible={showNew}
              onToggle={() =>
                setShowNew(
                  (current) =>
                    !current
                )
              }
            />

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Confirm New Password
              </label>

              <div className="relative">
                <KeyRound
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />

                <input
                  type={showNew ? 'text' : 'password'}
                  value={confirmPassword}
                  disabled={saving}
                  onChange={(event) =>
                    setConfirmPassword(
                      event.target.value
                    )
                  }
                  className="w-full rounded-lg border border-gray-300 py-2.5 pl-9 pr-10 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:bg-gray-50"
                />
              </div>
            </div>

            <p className="text-xs leading-5 text-gray-500">
              Use at least 8 characters. After changing it, your new password will only be known to you.
            </p>

            <Button
              type="submit"
              loading={saving}
              loadingText="Updating Password..."
              className="w-full"
            >
              Update Password
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  visible,
  onToggle,
}: {
  label: string;
  value: string;
  onChange: (
    value: string
  ) => void;
  visible: boolean;
  onToggle: () => void;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-gray-700">
        {label}
      </label>

      <div className="relative">
        <KeyRound
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
        />

        <input
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(event) =>
            onChange(
              event.target.value
            )
          }
          className="w-full rounded-lg border border-gray-300 py-2.5 pl-9 pr-10 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
        />

        <button
          type="button"
          onClick={onToggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          {visible ? (
            <EyeOff size={16} />
          ) : (
            <Eye size={16} />
          )}
        </button>
      </div>
    </div>
  );
}
