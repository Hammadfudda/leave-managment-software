import {
  useEffect,
  useMemo,
  useState,
} from 'react';
import { createPortal } from 'react-dom';

import api, {
  getApiErrorMessage,
} from '../../services/api';

import {
  getOrganizationSettings,
  updateOrganizationSettings,
} from '../../services/organizationSettings';

type DepartmentRow = {
  _id: string;
  name: string;
  saturdayOff?: boolean;
  divisionName?: string;
};

export default function MasterDataRequirementsEnhancer() {
  const [mount, setMount] =
    useState<HTMLElement | null>(null);

  const [roles, setRoles] =
    useState<string[]>([]);

  const [departments, setDepartments] =
    useState<DepartmentRow[]>([]);

  const [day, setDay] =
    useState(1);

  const [month, setMonth] =
    useState(1);

  const [display, setDisplay] =
    useState('');

  const [busy, setBusy] =
    useState(false);

  const [message, setMessage] =
    useState('');

  const load = async () => {
    const [
      roleResponse,
      departmentResponse,
      settings,
    ] = await Promise.all([
      api.get('/roles'),
      api.get('/departments'),
      getOrganizationSettings(),
    ]);

    setRoles(
      (roleResponse.data?.data || []).map(
        (item: { name?: string } | string) =>
          typeof item === 'string'
            ? item
            : item.name || ''
      ).filter(Boolean)
    );

    setDepartments(
      departmentResponse.data?.data || []
    );

    setDay(settings.leaveYearStartDay);
    setMonth(settings.leaveYearStartMonth);
    setDisplay(settings.leaveYearStart);
  };

  useEffect(() => {
    if (
      window.location.pathname !==
      '/master-data'
    ) {
      return;
    }

    void load().catch((error) => {
      setMessage(
        getApiErrorMessage(
          error,
          'Unable to load Division / Leave Year settings.'
        )
      );
    });
  }, []);

  useEffect(() => {
    if (
      window.location.pathname !==
      '/master-data'
    ) {
      return;
    }

    let host: HTMLDivElement | null = null;

    const enhance = () => {
      /*
       * Keep the mature MasterData page intact. Only change user-visible
       * terminology from Role(s) to Division(s).
       */
      const candidates = Array.from(
        document.querySelectorAll(
          'button,h1,h2,h3,p,label,span'
        )
      );

      for (const element of candidates) {
        if (element.childElementCount > 0) {
          continue;
        }

        const text =
          element.textContent?.trim();

        if (text === 'Roles') {
          element.textContent = 'Divisions';
        } else if (text === 'Role') {
          element.textContent = 'Division';
        } else if (text === 'Add Role') {
          element.textContent = 'Add Division';
        } else if (text === 'Edit Role') {
          element.textContent = 'Edit Division';
        }
      }

      if (host?.isConnected) {
        return;
      }

      const pageRoot =
        document.querySelector(
          'main .mx-auto.max-w-7xl'
        );

      if (!pageRoot) {
        return;
      }

      host = document.createElement('div');
      host.setAttribute(
        'data-master-data-requirements',
        'true'
      );

      pageRoot.appendChild(host);
      setMount(host);
    };

    const observer =
      new MutationObserver(enhance);

    observer.observe(
      document.body,
      {
        childList: true,
        subtree: true,
      }
    );

    enhance();

    return () => {
      observer.disconnect();
      host?.remove();
      setMount(null);
    };
  }, []);

  const months = useMemo(
    () => [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ],
    []
  );

  const saveLeaveYear = async () => {
    setBusy(true);
    setMessage('');

    try {
      const next =
        await updateOrganizationSettings(
          day,
          month
        );

      setDisplay(next.leaveYearStart);
      setMessage(
        'Leave Year Start updated successfully.'
      );
    } catch (error) {
      setMessage(
        getApiErrorMessage(
          error,
          'Unable to update Leave Year Start.'
        )
      );
    } finally {
      setBusy(false);
    }
  };

  const assignDivision = async (
    department: DepartmentRow,
    divisionName: string
  ) => {
    setBusy(true);
    setMessage('');

    try {
      await api.patch(
        `/departments/${department._id}`,
        {
          divisionName,
        }
      );

      await load();

      setMessage(
        `${department.name} is now under ${
          divisionName || 'no Division'
        }.`
      );
    } catch (error) {
      setMessage(
        getApiErrorMessage(
          error,
          'Unable to update Department Division.'
        )
      );
    } finally {
      setBusy(false);
    }
  };

  if (!mount) {
    return null;
  }

  return createPortal(
    <div className="mt-6 space-y-5">
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-gray-900">
          Organization Leave Year
        </h2>

        <p className="mt-1 text-sm text-gray-500">
          Current Leave Year Start: {display || 'Loading...'}
        </p>

        <div className="mt-4 grid max-w-md grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Day
            </label>
            <input
              type="number"
              min={1}
              max={31}
              value={day}
              onChange={(event) =>
                setDay(
                  Number(event.target.value)
                )
              }
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Month
            </label>
            <select
              value={month}
              onChange={(event) =>
                setMonth(
                  Number(event.target.value)
                )
              }
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              {months.map(
                (name, index) => (
                  <option
                    key={name}
                    value={index + 1}
                  >
                    {name}
                  </option>
                )
              )}
            </select>
          </div>
        </div>

        <button
          type="button"
          disabled={busy}
          onClick={() =>
            void saveLeaveYear()
          }
          className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          Save Leave Year Start
        </button>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-gray-900">
          Division → Department Structure
        </h2>

        <p className="mt-1 text-sm text-gray-500">
          Existing Department edit/delete and Saturday settings stay unchanged.
          Assign only the parent Division here.
        </p>

        <div className="mt-4 divide-y divide-gray-100 rounded-xl border border-gray-100">
          {departments.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-gray-400">
              No Departments found.
            </p>
          )}

          {departments.map(
            (department) => (
              <div
                key={department._id}
                className="grid items-center gap-3 px-4 py-3 sm:grid-cols-[1fr_280px]"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {department.name}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    Parent: {department.divisionName || 'Not assigned'}
                  </p>
                </div>

                <select
                  disabled={busy}
                  value={department.divisionName || ''}
                  onChange={(event) =>
                    void assignDivision(
                      department,
                      event.target.value
                    )
                  }
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="">
                    Select Division
                  </option>

                  {roles.map(
                    (division) => (
                      <option
                        key={division}
                        value={division}
                      >
                        {division}
                      </option>
                    )
                  )}
                </select>
              </div>
            )
          )}
        </div>
      </div>

      {message && (
        <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700">
          {message}
        </div>
      )}
    </div>,
    mount
  );
}
