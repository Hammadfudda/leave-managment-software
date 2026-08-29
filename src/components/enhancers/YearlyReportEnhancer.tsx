import {
  useEffect,
  useState,
} from 'react';

import { createPortal } from 'react-dom';

import {
  exportYearlyLeaveReport,
  getYearlyLeaveReport,
  type YearlyLeaveSnapshot,
} from '../../services/yearlyReports';

import {
  getApiErrorMessage,
} from '../../services/api';

export default function YearlyReportEnhancer() {
  const [mount, setMount] =
    useState<HTMLElement | null>(null);

  const [year, setYear] =
    useState(
      new Date().getFullYear()
    );

  const [rows, setRows] =
    useState<YearlyLeaveSnapshot[]>([]);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState('');

  useEffect(() => {
    if (
      window.location.pathname !==
      '/audit-logs'
    ) {
      return;
    }

    let host: HTMLDivElement | null = null;

    const install = () => {
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
        'data-yearly-report',
        'true'
      );

      pageRoot.appendChild(host);
      setMount(host);
    };

    const observer =
      new MutationObserver(install);

    observer.observe(
      document.body,
      {
        childList: true,
        subtree: true,
      }
    );

    install();

    return () => {
      observer.disconnect();
      host?.remove();
      setMount(null);
    };
  }, []);

  useEffect(() => {
    if (!mount) {
      return;
    }

    setLoading(true);
    setError('');

    void getYearlyLeaveReport(year)
      .then(setRows)
      .catch((requestError) =>
        setError(
          getApiErrorMessage(
            requestError,
            'Unable to load yearly leave report.'
          )
        )
      )
      .finally(() =>
        setLoading(false)
      );
  }, [mount, year]);

  if (!mount) {
    return null;
  }

  const years =
    Array.from(
      { length: 8 },
      (_, index) =>
        new Date().getFullYear() -
        5 +
        index
    );

  return createPortal(
    <section className="mt-8 space-y-4 border-t border-gray-200 pt-7">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Historical Yearly Leave Report
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Past-year snapshots preserve the Division, Department, Designation,
            Grade and Granted / Used / Remaining values from that leave year.
          </p>
        </div>

        <div className="flex gap-2">
          <select
            value={year}
            onChange={(event) =>
              setYear(
                Number(event.target.value)
              )
            }
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
          >
            {years.map(
              (item) => (
                <option
                  key={item}
                  value={item}
                >
                  {item}
                </option>
              )
            )}
          </select>

          <button
            type="button"
            onClick={() =>
              void exportYearlyLeaveReport(
                year
              )
            }
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white"
          >
            Export CSV
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-sm">
        <table className="w-full min-w-[1000px] text-sm">
          <thead className="bg-gray-50 text-left text-xs text-gray-500">
            <tr>
              <th className="px-3 py-3">Year</th>
              <th className="px-3 py-3">Employee</th>
              <th className="px-3 py-3">ID</th>
              <th className="px-3 py-3">Division</th>
              <th className="px-3 py-3">Department</th>
              <th className="px-3 py-3">Designation</th>
              <th className="px-3 py-3">Grade</th>
              <th className="px-3 py-3">Leave Type</th>
              <th className="px-3 py-3 text-right">Granted</th>
              <th className="px-3 py-3 text-right">Used</th>
              <th className="px-3 py-3 text-right">Remaining</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {loading && (
              <tr>
                <td
                  colSpan={11}
                  className="px-3 py-8 text-center text-gray-400"
                >
                  Loading report...
                </td>
              </tr>
            )}

            {!loading &&
              rows.length === 0 && (
                <tr>
                  <td
                    colSpan={11}
                    className="px-3 py-8 text-center text-gray-400"
                  >
                    No preserved snapshot data is available for {year}.
                  </td>
                </tr>
              )}

            {!loading &&
              rows.map(
                (row, index) => (
                  <tr
                    key={`${row.employeeId}-${row.leaveType}-${index}`}
                  >
                    <td className="px-3 py-3">{row.leaveYear}</td>
                    <td className="px-3 py-3 font-medium text-gray-900">
                      {row.employeeName}
                    </td>
                    <td className="px-3 py-3">{row.employeeCode}</td>
                    <td className="px-3 py-3">{row.division || '—'}</td>
                    <td className="px-3 py-3">{row.department || '—'}</td>
                    <td className="px-3 py-3">{row.designation || '—'}</td>
                    <td className="px-3 py-3">{row.grade || '—'}</td>
                    <td className="px-3 py-3 capitalize">
                      {row.leaveType.replace(/_/g, ' ')}
                    </td>
                    <td className="px-3 py-3 text-right">{row.granted}</td>
                    <td className="px-3 py-3 text-right">{row.used}</td>
                    <td className="px-3 py-3 text-right font-medium text-emerald-700">
                      {row.remaining}
                    </td>
                  </tr>
                )
              )}
          </tbody>
        </table>
      </div>
    </section>,
    mount
  );
}
