import {
  useCallback,
  useEffect,
  useState,
} from 'react';

import {
  Outlet,
} from 'react-router-dom';

import Sidebar from './Sidebar';
import Topbar from './Topbar';

import ChangePasswordRequired from './auth/ChangePasswordRequired';
import SmartCsvImportEnhancer from './import/SmartCsvImportEnhancer';

import api, {
  getApiErrorMessage,
} from '../services/api';

export default function Layout() {
  const [
    sidebarOpen,
    setSidebarOpen,
  ] = useState(false);

  const [
    checkingPassword,
    setCheckingPassword,
  ] = useState(true);

  const [
    mustChangePassword,
    setMustChangePassword,
  ] = useState(false);

  const [
    passwordCheckError,
    setPasswordCheckError,
  ] = useState('');

  const checkPasswordStatus =
    useCallback(
      async () => {
        setCheckingPassword(true);
        setPasswordCheckError('');

        try {
          const response =
            await api.get(
              '/employees/me'
            );

          setMustChangePassword(
            response.data?.data
              ?.mustChangePassword ===
              true &&
            response.data?.data
              ?.passwordChangedFromDefault !==
              true
          );
        } catch (error) {
          /*
           * Fail closed: if mandatory-password status cannot be verified,
           * do not expose the application until the backend check succeeds.
           */
          setPasswordCheckError(
            getApiErrorMessage(
              error,
              'Unable to verify your password status.'
            )
          );
        } finally {
          setCheckingPassword(false);
        }
      },
      []
    );

  useEffect(() => {
    void checkPasswordStatus();
  }, [checkPasswordStatus]);

  if (
    checkingPassword
  ) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 text-sm text-gray-500">
        Checking account security...
      </div>
    );
  }

  if (
    passwordCheckError
  ) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md rounded-2xl border border-rose-200 bg-white p-6 text-center shadow-sm">
          <p className="text-sm text-rose-700">
            {passwordCheckError}
          </p>

          <button
            type="button"
            onClick={() =>
              void checkPasswordStatus()
            }
            className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (
    mustChangePassword
  ) {
    return (
      <ChangePasswordRequired />
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar
        open={sidebarOpen}
        onClose={() =>
          setSidebarOpen(false)
        }
      />

      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar
          onMenuClick={() =>
            setSidebarOpen(true)
          }
        />

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl px-4 py-6 lg:px-8">
            <Outlet />
          </div>
        </main>
      </div>
      <SmartCsvImportEnhancer />
    </div>
  );
}
