import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  createPortal,
} from 'react-dom';

import {
  FileSpreadsheet,
  Upload,
  X,
} from 'lucide-react';

import api, {
  getApiErrorMessage,
} from '../../services/api';

type PortalAccess =
  | 'employee'
  | 'manager'
  | 'none';

interface PreviewRow {
  rowNumber: number;
  fullName: string;
  email: string;
  employeeId: string;
  designation: string;
  department: string;
  grade: string;
  managerReference: string;
  sheetRole: string;
  portalAccess: PortalAccess;
  exists: boolean;
  errors: string[];
}

interface PolicySuggestion {
  leaveType: string;
  isPaid: boolean;
  gradeQuotas: Array<{
    gradeName: string;
    yearlyQuota: number;
  }>;
}

interface ExistingManagerPreview {
  id: string;
  fullName: string;
  email: string;
  department: string;
}

interface SmartPreview {
  rows: PreviewRow[];
  missingDepartments: string[];
  missingDesignations: string[];
  missingGrades: string[];
  existingManagers: ExistingManagerPreview[];
  policySuggestions: PolicySuggestion[];
}

function checkboxLabel(
  text: string,
  checked: boolean,
  onChange: (
    checked: boolean
  ) => void
) {
  return (
    <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) =>
          onChange(
            event.target.checked
          )
        }
        className="mt-0.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
      />

      <span>
        {text}
      </span>
    </label>
  );
}

export default function SmartCsvImportEnhancer() {
  const [
    mount,
    setMount,
  ] = useState<HTMLElement | null>(
    null
  );

  const [
    modalOpen,
    setModalOpen,
  ] = useState(false);

  const [
    file,
    setFile,
  ] = useState<File | null>(
    null
  );

  const [
    preview,
    setPreview,
  ] = useState<SmartPreview | null>(
    null
  );

  const [
    rowAccess,
    setRowAccess,
  ] = useState<
    Record<
      number,
      PortalAccess
    >
  >({});

  const [
    permissions,
    setPermissions,
  ] = useState({
    autoCreateDepartments:
      false,
    autoCreateDesignations:
      false,
    autoCreateGrades:
      false,
    createLeavePolicies:
      false,
    applyManagerAssignments:
      false,
  });

  const [
    busy,
    setBusy,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState('');

  const [
    success,
    setSuccess,
  ] = useState('');

  const [
    schedulingFailed,
    setSchedulingFailed,
  ] = useState(0);

  const inputRef =
    useRef<HTMLInputElement | null>(
      null
    );

  useEffect(() => {
    let inserted:
      HTMLSpanElement | null =
        null;

    let originalLabel:
      HTMLElement | null =
        null;

    const install = () => {
      if (
        window.location.pathname !==
        '/employees'
      ) {
        return;
      }

      if (
        inserted?.isConnected
      ) {
        return;
      }

      const oldInput =
        document.querySelector(
          'input[type="file"][accept*=".csv"]'
        ) as HTMLInputElement | null;

      const label =
        oldInput?.closest(
          'label'
        ) as HTMLElement | null;

      if (
        !label ||
        !label.parentElement
      ) {
        return;
      }

      originalLabel =
        label;

      label.style.display =
        'none';

      inserted =
        document.createElement(
          'span'
        );

      inserted.setAttribute(
        'data-smart-csv-import',
        'true'
      );

      label.parentElement.insertBefore(
        inserted,
        label.nextSibling
      );

      setMount(
        inserted
      );
    };

    const observer =
      new MutationObserver(
        install
      );

    observer.observe(
      document.body,
      {
        childList:
          true,
        subtree:
          true,
      }
    );

    const timer =
      window.setInterval(
        install,
        300
      );

    install();

    return () => {
      observer.disconnect();
      window.clearInterval(
        timer
      );

      if (
        originalLabel
      ) {
        originalLabel.style.display =
          '';
      }

      inserted?.remove();
      setMount(null);
    };
  }, []);

  const newRows =
    useMemo(
      () =>
        preview?.rows.filter(
          (row) =>
            !row.exists
        ) ||
        [],
      [preview]
    );

  const invalidRows =
    useMemo(
      () =>
        preview?.rows.filter(
          (row) =>
            row.errors.length >
            0
        ) ||
        [],
      [preview]
    );

  const managerReviewErrors =
    useMemo(() => {
      const errors:
        Record<
          number,
          string[]
        > = {};

      if (
        !preview ||
        !permissions.applyManagerAssignments
      ) {
        return errors;
      }

      const normalize =
        (value: string) =>
          String(
            value ||
            ''
          )
            .trim()
            .toLowerCase();

      type Candidate = {
        source:
          | 'existing'
          | 'csv';
        rowNumber?: number;
        fullName: string;
        email: string;
        department: string;
      };

      const byEmail =
        new Map<
          string,
          Candidate
        >();

      const byName =
        new Map<
          string,
          Candidate[]
        >();

      const addCandidate =
        (
          candidate:
            Candidate
        ) => {
          const email =
            normalize(
              candidate.email
            );

          if (email) {
            byEmail.set(
              email,
              candidate
            );
          }

          const name =
            normalize(
              candidate.fullName
            );

          if (!name) {
            return;
          }

          const current =
            byName.get(
              name
            ) ||
            [];

          current.push(
            candidate
          );

          byName.set(
            name,
            current
          );
        };

      for (
        const manager of
        preview.existingManagers ||
        []
      ) {
        addCandidate({
          source:
            'existing',
          fullName:
            manager.fullName,
          email:
            manager.email,
          department:
            manager.department,
        });
      }

      for (
        const row of
        preview.rows
      ) {
        if (
          row.exists ||
          (
            rowAccess[
              row.rowNumber
            ] ||
            row.portalAccess
          ) !==
            'manager'
        ) {
          continue;
        }

        addCandidate({
          source:
            'csv',
          rowNumber:
            row.rowNumber,
          fullName:
            row.fullName,
          email:
            row.email,
          department:
            row.department,
        });
      }

      for (
        const row of
        preview.rows
      ) {
        if (
          row.exists ||
          !row.managerReference
        ) {
          continue;
        }

        const rowErrors:
          string[] = [];

        const reference =
          normalize(
            row.managerReference
          );

        let candidate =
          byEmail.get(
            reference
          );

        if (!candidate) {
          const matches =
            byName.get(
              reference
            ) ||
            [];

          if (
            matches.length >
            1
          ) {
            rowErrors.push(
              'Manager name is ambiguous. Use managerEmail in the CSV.'
            );
          } else if (
            matches.length ===
            1
          ) {
            candidate =
              matches[0];
          }
        }

        if (
          !candidate &&
          rowErrors.length ===
            0
        ) {
          rowErrors.push(
            'Selected Manager is not an active existing Manager and is not a CSV row with Manager portal access.'
          );
        }

        if (
          candidate?.source ===
            'csv' &&
          candidate.rowNumber ===
            row.rowNumber
        ) {
          rowErrors.push(
            'An employee cannot be their own Manager.'
          );
        }

        if (
          candidate &&
          normalize(
            candidate.department
          ) !==
            normalize(
              row.department
            )
        ) {
          rowErrors.push(
            `Manager belongs to "${candidate.department}", but this employee belongs to "${row.department}".`
          );
        }

        if (
          rowErrors.length
        ) {
          errors[
            row.rowNumber
          ] =
            rowErrors;
        }
      }

      return errors;
    }, [
      preview,
      permissions.applyManagerAssignments,
      rowAccess,
    ]);

  const managerBlockingCount =
    Object.keys(
      managerReviewErrors
    ).length;

  const openPicker = () => {
    setError('');
    setSuccess('');
    setSchedulingFailed(0);
    inputRef.current?.click();
  };

  const loadPreview =
    async (
      selected:
        File
    ) => {
      setBusy(true);
      setError('');
      setSuccess('');
      setSchedulingFailed(0);

      try {
        const form =
          new FormData();

        form.append(
          'file',
          selected
        );

        const response =
          await api.post(
            '/employees/import-smart/preview',
            form,
            {
              headers: {
                'Content-Type':
                  'multipart/form-data',
              },
            }
          );

        const data =
          response.data
            ?.preview as SmartPreview;

        setPreview(
          data
        );

        setRowAccess(
          Object.fromEntries(
            data.rows.map(
              (row) => [
                row.rowNumber,
                row.portalAccess,
              ]
            )
          )
        );

        setFile(
          selected
        );

        setModalOpen(
          true
        );
      } catch (requestError) {
        setError(
          getApiErrorMessage(
            requestError,
            'Unable to preview this CSV.'
          )
        );

        setModalOpen(
          true
        );
      } finally {
        setBusy(false);
      }
    };

  const commit =
    async () => {
      if (
        !file ||
        !preview
      ) {
        return;
      }

      if (
        invalidRows.length >
        0
      ) {
        setError(
          'Fix the CSV row errors before importing.'
        );
        return;
      }

      if (
        managerBlockingCount >
        0
      ) {
        setError(
          'Fix the Manager / Portal Access conflicts highlighted in red before importing.'
        );
        return;
      }

      setBusy(true);
      setError('');
      setSuccess('');

      try {
        const form =
          new FormData();

        form.append(
          'file',
          file
        );

        form.append(
          'decisions',
          JSON.stringify({
            permissions,
            rows:
              preview.rows.map(
                (row) => ({
                  rowNumber:
                    row.rowNumber,
                  portalAccess:
                    rowAccess[
                      row.rowNumber
                    ] ||
                    row.portalAccess,
                })
              ),
          })
        );

        const response =
          await api.post(
            '/employees/import-smart/commit',
            form,
            {
              headers: {
                'Content-Type':
                  'multipart/form-data',
              },

              timeout:
                60000,
            }
          );

        setSuccess(
          response.data
            ?.message ||
            'Smart import completed successfully.'
        );

        setSchedulingFailed(
          Number(
            response.data?.data
              ?.emailSchedulingFailed ||
            0
          )
        );
      } catch (requestError: any) {
        const isTimeout =
          requestError?.code ===
            'ECONNABORTED' ||
          String(
            requestError?.message ||
              ''
          )
            .toLowerCase()
            .includes(
              'timeout'
            );

        setError(
          isTimeout
            ? 'Import request took too long. Please check the backend logs before trying again. The import may already have completed.'
            : getApiErrorMessage(
                requestError,
                'Unable to complete Smart CSV import.'
              )
        );
      } finally {
        setBusy(false);
      }
    };

  const retryEmailScheduling =
    async () => {
      setBusy(true);
      setError('');

      try {
        const response =
          await api.post(
            '/employees/import-smart/retry-emails'
          );

        setSuccess(
          response.data
            ?.message ||
            'Pending credential emails were rescheduled.'
        );

        setSchedulingFailed(
          Number(
            response.data?.data
              ?.failed ||
            0
          )
        );
      } catch (requestError) {
        setError(
          getApiErrorMessage(
            requestError,
            'Unable to retry pending credential email scheduling.'
          )
        );
      } finally {
        setBusy(false);
      }
    };

  const trigger =
    mount
      ? createPortal(
          <>
            <button
              type="button"
              disabled={busy}
              onClick={
                openPicker
              }
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FileSpreadsheet
                size={15}
              />

              {busy
                ? 'Reading CSV...'
                : 'Import CSV'}
            </button>

            <input
              ref={inputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(event) => {
                const selected =
                  event.target
                    .files?.[0];

                event.target.value =
                  '';

                if (
                  selected
                ) {
                  void loadPreview(
                    selected
                  );
                }
              }}
            />
          </>,
          mount
        )
      : null;

  return (
    <>
      {trigger}

      {modalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
          <div className="max-h-[92vh] w-full max-w-6xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-gray-100 px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Smart CSV Import Review
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Review portal access and approve automatic setup before anything is created.
                </p>
              </div>

              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  setModalOpen(
                    false
                  )
                }
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 disabled:opacity-50"
              >
                <X size={18} />
              </button>
            </div>

            <div className="max-h-[72vh] space-y-5 overflow-y-auto p-5">
              {error && (
                <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {error}
                </div>
              )}

              {success && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {success}

                  {schedulingFailed > 0 && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        void retryEmailScheduling()
                      }
                      className="ml-2 font-semibold underline disabled:opacity-50"
                    >
                      Retry Email Scheduling
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() =>
                      window.location.reload()
                    }
                    className="ml-2 font-semibold underline"
                  >
                    Refresh Employees
                  </button>
                </div>
              )}

              {preview && (
                <>
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    <Summary
                      label="Rows"
                      value={
                        preview.rows.length
                      }
                    />

                    <Summary
                      label="New"
                      value={
                        newRows.length
                      }
                    />

                    <Summary
                      label="Existing / Skip"
                      value={
                        preview.rows.length -
                        newRows.length
                      }
                    />

                    <Summary
                      label="Blocking Errors"
                      value={
                        invalidRows.length +
                        managerBlockingCount
                      }
                      danger={
                        invalidRows.length +
                          managerBlockingCount >
                        0
                      }
                    />
                  </div>

                  <section>
                    <h3 className="mb-2 text-sm font-semibold text-gray-900">
                      Automatic Setup Permissions
                    </h3>

                    <div className="grid gap-2 md:grid-cols-2">
                      {checkboxLabel(
                        `Create missing Departments automatically (${preview.missingDepartments.length})`,
                        permissions.autoCreateDepartments,
                        (checked) =>
                          setPermissions(
                            (previous) => ({
                              ...previous,
                              autoCreateDepartments:
                                checked,
                            })
                          )
                      )}

                      {checkboxLabel(
                        `Create missing Designations automatically (${preview.missingDesignations.length})`,
                        permissions.autoCreateDesignations,
                        (checked) =>
                          setPermissions(
                            (previous) => ({
                              ...previous,
                              autoCreateDesignations:
                                checked,
                            })
                          )
                      )}

                      {checkboxLabel(
                        `Create missing Grades automatically (${preview.missingGrades.length})`,
                        permissions.autoCreateGrades,
                        (checked) =>
                          setPermissions(
                            (previous) => ({
                              ...previous,
                              autoCreateGrades:
                                checked,
                            })
                          )
                      )}

                      {checkboxLabel(
                        `Create Leave Policies from sheet (${preview.policySuggestions.length})`,
                        permissions.createLeavePolicies,
                        (checked) =>
                          setPermissions(
                            (previous) => ({
                              ...previous,
                              createLeavePolicies:
                                checked,
                            })
                          )
                      )}

                      {checkboxLabel(
                        'Assign Managers exactly from the sheet',
                        permissions.applyManagerAssignments,
                        (checked) =>
                          setPermissions(
                            (previous) => ({
                              ...previous,
                              applyManagerAssignments:
                                checked,
                            })
                          )
                      )}
                    </div>

                    <p className="mt-2 text-xs text-gray-500">
                      Imported Leave Policies use the employee&apos;s assigned Manager as the final approver. If Paid/Unpaid is missing, the policy defaults to Unpaid. Quota is used only when the sheet provides it. If a leave type has no quota in the sheet, that policy is skipped instead of asking you to enter quota manually.
                    </p>
                  </section>

                  {(preview.missingDepartments.length >
                    0 ||
                    preview.missingDesignations.length >
                      0 ||
                    preview.missingGrades.length >
                      0) && (
                    <section className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                      <h3 className="text-sm font-semibold text-amber-900">
                        Missing Master Data
                      </h3>

                      <div className="mt-2 grid gap-3 text-xs text-amber-800 md:grid-cols-3">
                        <List
                          title="Departments"
                          items={
                            preview.missingDepartments
                          }
                        />

                        <List
                          title="Designations"
                          items={
                            preview.missingDesignations
                          }
                        />

                        <List
                          title="Grades"
                          items={
                            preview.missingGrades
                          }
                        />
                      </div>
                    </section>
                  )}

                  {preview.policySuggestions.length >
                    0 && (
                    <section>
                      <h3 className="mb-2 text-sm font-semibold text-gray-900">
                        Leave Policies detected from sheet
                      </h3>

                      <div className="overflow-x-auto rounded-xl border border-gray-200">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50 text-left text-xs text-gray-500">
                            <tr>
                              <th className="px-3 py-2">
                                Leave Type
                              </th>
                              <th className="px-3 py-2">
                                Paid / Unpaid
                              </th>
                              <th className="px-3 py-2">
                                Grade Quotas
                              </th>
                              <th className="px-3 py-2">
                                Approval
                              </th>
                            </tr>
                          </thead>

                          <tbody className="divide-y divide-gray-100">
                            {preview.policySuggestions.map(
                              (policy) => (
                                <tr
                                  key={
                                    policy.leaveType
                                  }
                                >
                                  <td className="px-3 py-2 font-medium capitalize">
                                    {
                                      policy.leaveType
                                    }
                                  </td>

                                  <td className="px-3 py-2">
                                    {policy.isPaid
                                      ? 'Paid'
                                      : 'Unpaid'}
                                  </td>

                                  <td className="px-3 py-2">
                                    {policy.gradeQuotas.length
                                      ? policy.gradeQuotas
                                          .map(
                                            (item) =>
                                              `${item.gradeName}: ${item.yearlyQuota}`
                                          )
                                          .join(
                                            ', '
                                          )
                                      : 'No quota — policy will be skipped'}
                                  </td>

                                  <td className="px-3 py-2">
                                    Assigned Manager
                                  </td>
                                </tr>
                              )
                            )}
                          </tbody>
                        </table>
                      </div>
                    </section>
                  )}

                  <section>
                    <div className="mb-2 flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-gray-900">
                        Employee / Manager Portal Access
                      </h3>

                      <span className="text-xs text-gray-500">
                        Existing emails are skipped
                      </span>
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-gray-200">
                      <table className="w-full min-w-[950px] text-sm">
                        <thead className="bg-gray-50 text-left text-xs text-gray-500">
                          <tr>
                            <th className="px-3 py-2">
                              Name
                            </th>
                            <th className="px-3 py-2">
                              Email
                            </th>
                            <th className="px-3 py-2">
                              Designation
                            </th>
                            <th className="px-3 py-2">
                              Department
                            </th>
                            <th className="px-3 py-2">
                              Sheet Role
                            </th>
                            <th className="px-3 py-2">
                              Manager
                            </th>
                            <th className="px-3 py-2">
                              Portal Access
                            </th>
                            <th className="px-3 py-2">
                              Status
                            </th>
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-gray-100">
                          {preview.rows.map(
                            (row) => (
                              <tr
                                key={
                                  row.rowNumber
                                }
                                className={
                                  row.errors.length ||
                                  managerReviewErrors[
                                    row.rowNumber
                                  ]?.length
                                    ? 'bg-rose-50/50'
                                    : ''
                                }
                              >
                                <td className="px-3 py-2 font-medium text-gray-900">
                                  {row.fullName}
                                </td>

                                <td className="px-3 py-2 text-xs text-gray-600">
                                  {row.email}
                                </td>

                                <td className="px-3 py-2">
                                  {row.designation ||
                                    '—'}
                                </td>

                                <td className="px-3 py-2">
                                  {row.department ||
                                    '—'}
                                </td>

                                <td className="px-3 py-2 capitalize">
                                  {row.sheetRole ||
                                    '—'}
                                </td>

                                <td className="px-3 py-2">
                                  {row.managerReference ||
                                    '—'}
                                </td>

                                <td className="px-3 py-2">
                                  <select
                                    disabled={
                                      row.exists
                                    }
                                    value={
                                      rowAccess[
                                        row.rowNumber
                                      ] ||
                                      row.portalAccess
                                    }
                                    onChange={(event) =>
                                      setRowAccess(
                                        (
                                          previous
                                        ) => ({
                                          ...previous,
                                          [row.rowNumber]:
                                            event.target
                                              .value as PortalAccess,
                                        })
                                      )
                                    }
                                    className="rounded-lg border border-gray-300 px-2 py-1.5 text-xs disabled:bg-gray-100"
                                  >
                                    <option value="employee">
                                      Employee
                                    </option>

                                    <option value="manager">
                                      Manager
                                    </option>

                                    <option value="none">
                                      No Portal Access
                                    </option>
                                  </select>
                                </td>

                                <td className="px-3 py-2 text-xs">
                                  {row.exists ? (
                                    <span className="font-medium text-amber-700">
                                      Exists — skipped
                                    </span>
                                  ) : row.errors.length ? (
                                    <span
                                      className="font-medium text-rose-700"
                                      title={
                                        row.errors.join(
                                          '\n'
                                        )
                                      }
                                    >
                                      {row.errors.length}{' '}
                                      error(s)
                                    </span>
                                  ) : managerReviewErrors[
                                      row.rowNumber
                                    ]?.length ? (
                                    <span
                                      className="font-medium text-rose-700"
                                      title={
                                        managerReviewErrors[
                                          row.rowNumber
                                        ].join(
                                          '\n'
                                        )
                                      }
                                    >
                                      Manager conflict
                                    </span>
                                  ) : (
                                    <span className="font-medium text-emerald-700">
                                      Ready
                                    </span>
                                  )}
                                </td>
                              </tr>
                            )
                          )}
                        </tbody>
                      </table>
                    </div>
                  </section>

                  {managerBlockingCount > 0 && (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                      <p className="font-semibold">
                        Manager / Portal Access conflicts must be fixed before import.
                      </p>

                      <ul className="mt-2 list-disc space-y-1 pl-5 text-xs">
                        {Object.entries(
                          managerReviewErrors
                        ).map(
                          ([
                            rowNumber,
                            messages,
                          ]) => (
                            <li
                              key={
                                rowNumber
                              }
                            >
                              Row {rowNumber}:{' '}
                              {messages.join(
                                ' '
                              )}
                            </li>
                          )
                        )}
                      </ul>
                    </div>
                  )}

                  <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                    New portal accounts will receive a Temporary Password by email. Emails are sent one at a time with a 30-second gap. Users must change their password after first login.
                  </div>
                </>
              )}
            </div>

            <div className="border-t border-gray-100 px-5 py-4">
              {error && (
                <div className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                  <strong>
                    Import failed:
                  </strong>{' '}
                  {error}
                </div>
              )}

              {busy && (
                <div className="mb-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                  Processing import... Please wait and do not close this window.
                </div>
              )}

              {success && (
                <div className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                  {success}

                  {schedulingFailed > 0 && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        void retryEmailScheduling()
                      }
                      className="ml-2 font-semibold underline disabled:opacity-50"
                    >
                      Retry Email Scheduling
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() =>
                      window.location.reload()
                    }
                    className="ml-2 font-semibold underline"
                  >
                    Refresh Employees
                  </button>
                </div>
              )}

              <div className="flex items-center justify-between gap-3">
                <button
                type="button"
                disabled={busy}
                onClick={
                  openPicker
                }
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                <Upload
                  size={15}
                />
                Choose Another CSV
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    setModalOpen(
                      false
                    )
                  }
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={
                    busy ||
                    !preview ||
                    invalidRows.length >
                      0 ||
                    managerBlockingCount >
                      0 ||
                    Boolean(
                      success
                    )
                  }
                  onClick={() =>
                    void commit()
                  }
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {busy
                    ? 'Processing...'
                    : 'Import with Approved Setup'}
                </button>
              </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Summary({
  label,
  value,
  danger = false,
}: {
  label: string;
  value: number;
  danger?: boolean;
}) {
  return (
    <div
      className={
        danger
          ? 'rounded-xl border border-rose-200 bg-rose-50 p-3'
          : 'rounded-xl border border-gray-200 bg-gray-50 p-3'
      }
    >
      <p className="text-xs text-gray-500">
        {label}
      </p>

      <p
        className={
          danger
            ? 'mt-1 text-2xl font-semibold text-rose-700'
            : 'mt-1 text-2xl font-semibold text-gray-900'
        }
      >
        {value}
      </p>
    </div>
  );
}

function List({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  return (
    <div>
      <p className="font-semibold">
        {title}
      </p>

      <p className="mt-1">
        {items.length
          ? items.join(', ')
          : 'None'}
      </p>
    </div>
  );
}
