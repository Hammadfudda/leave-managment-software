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
  X,
} from 'lucide-react';

import api, {
  getApiErrorMessage,
} from '../../services/api';

import {
  getOrganizationSettings,
} from '../../services/organizationSettings';

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

interface ExistingManagerPreview {
  id: string;
  fullName: string;
  email: string;
  department: string;
}

interface PolicySuggestion {
  leaveType: string;
  isPaid: boolean;
  gradeQuotas: Array<{
    gradeName: string;
    yearlyQuota: number;
  }>;
}

interface SmartPreview {
  rows: PreviewRow[];
  missingDepartments: string[];
  missingDesignations: string[];
  missingGrades: string[];
  existingManagers: ExistingManagerPreview[];
  policySuggestions: PolicySuggestion[];
}

interface MetadataPreview {
  missingDivisions?: string[];
  missingRoles?: string[];
  usedLeaveTypes: string[];
  errors: Array<{
    rowNumber: number;
    message: string;
  }>;
}

function Check({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange:
    (value: boolean) =>
      void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700">
      <input
        type="checkbox"
        checked={
          checked
        }
        onChange={
          (
            event
          ) =>
            onChange(
              event
                .target
                .checked
            )
        }
        className="mt-0.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
      />
      <span>
        {label}
      </span>
    </label>
  );
}

export default function SmartCsvImportEnhancer() {
  const [
    mount,
    setMount,
  ] =
    useState<HTMLElement | null>(
      null
    );

  const [
    guideOpen,
    setGuideOpen,
  ] =
    useState(false);

  const [
    modalOpen,
    setModalOpen,
  ] =
    useState(false);

  const [
    file,
    setFile,
  ] =
    useState<File | null>(
      null
    );

  const [
    preview,
    setPreview,
  ] =
    useState<SmartPreview | null>(
      null
    );

  const [
    metadataPreview,
    setMetadataPreview,
  ] =
    useState<MetadataPreview | null>(
      null
    );

  const [
    rowAccess,
    setRowAccess,
  ] =
    useState<Record<number, PortalAccess>>(
      {}
    );

  const [
    leaveYearStart,
    setLeaveYearStart,
  ] =
    useState(
      '01-01'
    );

  const [
    permissions,
    setPermissions,
  ] =
    useState({
      autoCreateDepartments:
        false,
      autoCreateDesignations:
        false,
      autoCreateGrades:
        false,
      autoCreateDivisions:
        false,
      createLeavePolicies:
        false,
      applyManagerAssignments:
        false,
    });

  const [
    busy,
    setBusy,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState('');

  const [
    success,
    setSuccess,
  ] =
    useState('');

  const inputRef =
    useRef<HTMLInputElement | null>(
      null
    );

  useEffect(
    () => {
      void getOrganizationSettings()
        .then(
          (
            settings
          ) =>
            setLeaveYearStart(
              settings.leaveYearStart
            )
        )
        .catch(
          () => {}
        );
    },
    []
  );

  useEffect(
    () => {
      let inserted:
        HTMLSpanElement | null =
        null;

      let originalLabel:
        HTMLElement | null =
        null;

      const install =
        () => {
          if (
            window.location.pathname !==
            '/employees'
          ) {
            return;
          }

          if (
            inserted
              ?.isConnected
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
            !label
              .parentElement
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
          400
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

        setMount(
          null
        );
      };
    },
    []
  );

  const newRows =
    useMemo(
      () =>
        preview
          ?.rows
          .filter(
            (
              row
            ) =>
              !row.exists
          ) ||
        [],
      [
        preview,
      ]
    );

  const invalidRows =
    useMemo(
      () =>
        preview
          ?.rows
          .filter(
            (
              row
            ) =>
              row.errors
                .length >
              0
          ) ||
        [],
      [
        preview,
      ]
    );


  const managerReviewErrors =
    useMemo(
      () => {
        const errors:
          Record<number, string[]> = {};

        if (
          !preview ||
          !permissions.applyManagerAssignments
        ) {
          return errors;
        }

        const normalize =
          (value: string) =>
            String(value || '')
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
              ) || [];

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
              ) || [];

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
      },
      [
        preview,
        permissions.applyManagerAssignments,
        rowAccess,
      ]
    );

  const managerBlockingCount =
    Object.keys(
      managerReviewErrors
    ).length;

  const missingDivisions =
    metadataPreview
      ?.missingDivisions ||
    metadataPreview
      ?.missingRoles ||
    [];

  const downloadSample =
    () => {
      const header =
        'fullName,email,cnic,phone,employeeId,portalRole,division,designation,department,grade,dateOfJoining,leaveYearStart,managerEmail,canApproveOtherDepartments,annualQuota,annualUsed,annualPaid,sickQuota,sickUsed,sickPaid,casualQuota,casualUsed,casualPaid';

      const rows = [
        header,
        `James Carter,james.carter@example.com,42101-8765432-1,+923001111111,EMP-001,manager,Technology Division,Engineering Manager,Engineering,G4,2026-01-15,${leaveYearStart},,false,24,5,Paid,12,2,Paid,8,1,Paid`,
        `Alex Thompson,alex.thompson@example.com,42101-2345678-2,+923002222222,EMP-002,employee,Technology Division,Software Engineer,Engineering,G4,2026-07-01,${leaveYearStart},james.carter@example.com,false,24,4,Paid,12,1,Paid,8,2,Paid`,
      ];

      const blob =
        new Blob(
          [
            rows.join(
              '\n'
            ),
          ],
          {
            type:
              'text/csv;charset=utf-8;',
          }
        );

      const url =
        window.URL.createObjectURL(
          blob
        );

      const link =
        document.createElement(
          'a'
        );

      link.href =
        url;

      link.download =
        'leave-management-smart-import-sample.csv';

      document.body.appendChild(
        link
      );

      link.click();
      link.remove();

      window.URL.revokeObjectURL(
        url
      );
    };

  const loadPreview =
    async (
      selected:
        File
    ) => {
      setBusy(
        true
      );

      setError(
        ''
      );

      setSuccess(
        ''
      );

      try {
        const mainForm =
          new FormData();

        mainForm.append(
          'file',
          selected
        );

        const metadataForm =
          new FormData();

        metadataForm.append(
          'file',
          selected
        );

        const [
          mainResponse,
          metadataResponse,
        ] =
          await Promise.all([
            api.post(
              '/employees/import-smart/preview',
              mainForm,
              {
                headers: {
                  'Content-Type':
                    'multipart/form-data',
                },
              }
            ),
            api.post(
              '/employees/import-smart/metadata-preview',
              metadataForm,
              {
                headers: {
                  'Content-Type':
                    'multipart/form-data',
                },
              }
            ),
          ]);

        const nextPreview =
          mainResponse
            .data
            ?.preview as SmartPreview;

        setPreview(
          nextPreview
        );

        setMetadataPreview(
          metadataResponse
            .data
            ?.preview as MetadataPreview
        );

        setRowAccess(
          Object.fromEntries(
            nextPreview.rows.map(
              (
                row
              ) => [
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

        setGuideOpen(
          false
        );
      } catch (
        requestError
      ) {
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
        setBusy(
          false
        );
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
        invalidRows.length
      ) {
        setError(
          'Fix the blocking row errors before importing.'
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
      if (
        metadataPreview
          ?.errors
          .length
      ) {
        setError(
          'Fix the starting leave usage errors before importing.'
        );

        return;
      }

      if (
        missingDivisions
          .length &&
        !permissions
          .autoCreateDivisions
      ) {
        setError(
          'Missing Divisions exist. Allow automatic Division creation or create them first.'
        );

        return;
      }

      setBusy(
        true
      );

      setError(
        ''
      );

      let employeeImportSaved =
        false;

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
            permissions: {
              autoCreateDepartments:
                permissions
                  .autoCreateDepartments,
              autoCreateDesignations:
                permissions
                  .autoCreateDesignations,
              autoCreateGrades:
                permissions
                  .autoCreateGrades,
              createLeavePolicies:
                permissions
                  .createLeavePolicies,
              applyManagerAssignments:
                permissions
                  .applyManagerAssignments,
            },
            rows:
              preview.rows.map(
                (
                  row
                ) => ({
                  rowNumber:
                    row.rowNumber,
                  portalAccess:
                    rowAccess[
                      row
                        .rowNumber
                    ] ||
                    row
                      .portalAccess,
                })
              ),
          })
        );

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

        employeeImportSaved =
          true;

        const metadataForm =
          new FormData();

        metadataForm.append(
          'file',
          file
        );

        metadataForm.append(
          'decisions',
          JSON.stringify({
            autoCreateDivisions:
              permissions
                .autoCreateDivisions,
            targetEmails:
              newRows.map(
                (
                  row
                ) =>
                  row.email
              ),
          })
        );

        await api.post(
          '/employees/import-smart/metadata-commit',
          metadataForm,
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
          'Import completed. Division, pro-rated granted leave and starting Used values were applied. Account emails continue through the existing QStash flow.'
        );
      } catch (
        requestError
      ) {
        const message =
          getApiErrorMessage(
            requestError,
            'Unable to complete Smart CSV import.'
          );

        setError(
          employeeImportSaved
            ? `Employees were created, but Division / starting leave setup failed: ${message}`
            : message
        );
      } finally {
        setBusy(
          false
        );
      }
    };

  useEffect(
    () => {
      if (
        window.location.pathname !==
        '/employees'
      ) {
        return;
      }

      void api
        .post(
          '/employees/import-smart/retry-emails'
        )
        .catch(
          () => {}
        );
    },
    []
  );

  const trigger =
    mount
      ? createPortal(
          <>
            <button
              type="button"
              disabled={
                busy
              }
              onClick={() => {
                setError(
                  ''
                );

                setSuccess(
                  ''
                );

                setGuideOpen(
                  true
                );
              }}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              <FileSpreadsheet
                size={
                  15
                }
              />
              {busy
                ? 'Reading CSV...'
                : 'Import CSV'}
            </button>

            <input
              ref={
                inputRef
              }
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={
                (
                  event
                ) => {
                  const selected =
                    event
                      .target
                      .files
                      ?.[0];

                  event.target.value =
                    '';

                  if (
                    selected
                  ) {
                    void loadPreview(
                      selected
                    );
                  }
                }
              }
            />
          </>,
          mount
        )
      : null;

  return (
    <>
      {trigger}

      {guideOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-gray-100 px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Import Employees from CSV
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Preview first. Nothing is committed until you approve the import.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setGuideOpen(
                    false
                  )
                }
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100"
              >
                <X
                  size={
                    18
                  }
                />
              </button>
            </div>

            <div className="space-y-4 p-5">
              <div className="rounded-xl border border-gray-200 p-4 text-sm text-gray-700">
                <p className="font-semibold text-gray-900">
                  Required employee fields
                </p>

                <p className="mt-2 text-xs leading-6">
                  fullName, email, cnic, employeeId, portalRole, division, designation, department, grade, dateOfJoining, leaveYearStart
                </p>
              </div>

              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-xs leading-6 text-blue-800">
                Organization Leave Year Start: <strong>{leaveYearStart}</strong>. Every CSV row must match this value. Leave quota columns configure Grade policy values, Used is starting employee consumption, and Remaining is always calculated by the system.
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-6 text-amber-800">
                Conflicting quotas for the same Grade + Leave Type block the import. Manager assignment, missing Master Data review, temporary passwords and QStash email scheduling keep the existing flow.
              </div>
            </div>

            <div className="flex flex-wrap justify-between gap-2 border-t border-gray-100 px-5 py-4">
              <button
                type="button"
                onClick={
                  downloadSample
                }
                className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100"
              >
                Download Sample CSV
              </button>

              <button
                type="button"
                onClick={() => {
                  setGuideOpen(
                    false
                  );

                  inputRef
                    .current
                    ?.click();
                }}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Choose CSV File
              </button>
            </div>
          </div>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
          <div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-gray-100 px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Smart CSV Import Review
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Review row validation and explicitly allow automatic setup.
                </p>
              </div>

              <button
                type="button"
                disabled={
                  busy
                }
                onClick={() =>
                  setModalOpen(
                    false
                  )
                }
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100"
              >
                <X
                  size={
                    18
                  }
                />
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
              {error && (
                <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm whitespace-pre-line text-rose-700">
                  {error}
                </div>
              )}

              {success && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {success}
                </div>
              )}

              {preview && (
                <>
                  <div className="grid gap-2 md:grid-cols-3">
                    <div className="rounded-lg border p-3 text-sm">
                      Rows: <strong>{preview.rows.length}</strong>
                    </div>
                    <div className="rounded-lg border p-3 text-sm">
                      New: <strong>{newRows.length}</strong>
                    </div>
                    <div className={`rounded-lg border p-3 text-sm ${invalidRows.length ? 'border-rose-200 bg-rose-50 text-rose-700' : ''}`}>
                      Blocking rows: <strong>{invalidRows.length}</strong>
                    </div>
                  </div>

                  <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                    <Check
                      label={`Auto-create missing Divisions (${missingDivisions.length})`}
                      checked={
                        permissions.autoCreateDivisions
                      }
                      onChange={
                        (
                          value
                        ) =>
                          setPermissions(
                            (
                              previous
                            ) => ({
                              ...previous,
                              autoCreateDivisions:
                                value,
                            })
                          )
                      }
                    />

                    <Check
                      label={`Auto-create missing Departments (${preview.missingDepartments.length})`}
                      checked={
                        permissions.autoCreateDepartments
                      }
                      onChange={
                        (
                          value
                        ) =>
                          setPermissions(
                            (
                              previous
                            ) => ({
                              ...previous,
                              autoCreateDepartments:
                                value,
                            })
                          )
                      }
                    />

                    <Check
                      label={`Auto-create missing Designations (${preview.missingDesignations.length})`}
                      checked={
                        permissions.autoCreateDesignations
                      }
                      onChange={
                        (
                          value
                        ) =>
                          setPermissions(
                            (
                              previous
                            ) => ({
                              ...previous,
                              autoCreateDesignations:
                                value,
                            })
                          )
                      }
                    />

                    <Check
                      label={`Auto-create missing Grades (${preview.missingGrades.length})`}
                      checked={
                        permissions.autoCreateGrades
                      }
                      onChange={
                        (
                          value
                        ) =>
                          setPermissions(
                            (
                              previous
                            ) => ({
                              ...previous,
                              autoCreateGrades:
                                value,
                            })
                          )
                      }
                    />

                    <Check
                      label="Create Leave Policies from sheet quotas"
                      checked={
                        permissions.createLeavePolicies
                      }
                      onChange={
                        (
                          value
                        ) =>
                          setPermissions(
                            (
                              previous
                            ) => ({
                              ...previous,
                              createLeavePolicies:
                                value,
                            })
                          )
                      }
                    />

                    <Check
                      label="Apply Manager assignments"
                      checked={
                        permissions.applyManagerAssignments
                      }
                      onChange={
                        (
                          value
                        ) =>
                          setPermissions(
                            (
                              previous
                            ) => ({
                              ...previous,
                              applyManagerAssignments:
                                value,
                            })
                          )
                      }
                    />
                  </div>

                  {metadataPreview?.errors.length ? (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                      {metadataPreview.errors.map(
                        (
                          item
                        ) => (
                          <p
                            key={`${item.rowNumber}-${item.message}`}
                          >
                            Row {item.rowNumber}: {item.message}
                          </p>
                        )
                      )}
                    </div>
                  ) : null}

                  <div className="overflow-x-auto rounded-xl border border-gray-200">
                    <table className="w-full min-w-[850px] text-sm">
                      <thead className="bg-gray-50 text-left text-xs text-gray-500">
                        <tr>
                          <th className="px-3 py-2">Row</th>
                          <th className="px-3 py-2">Employee</th>
                          <th className="px-3 py-2">Department</th>
                          <th className="px-3 py-2">Grade</th>
                          <th className="px-3 py-2">Portal Access</th>
                          <th className="px-3 py-2">Validation</th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-gray-100">
                        {preview.rows.map(
                          (
                            row
                          ) => (
                            <tr
                              key={
                                row.rowNumber
                              }
                            >
                              <td className="px-3 py-2">
                                {row.rowNumber}
                              </td>

                              <td className="px-3 py-2">
                                <p className="font-medium text-gray-900">
                                  {row.fullName}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {row.email}
                                </p>
                              </td>

                              <td className="px-3 py-2">
                                {row.department}
                              </td>

                              <td className="px-3 py-2">
                                {row.grade}
                              </td>

                              <td className="px-3 py-2">
                                <select
                                  disabled={
                                    row.exists
                                  }
                                  value={
                                    rowAccess[row.rowNumber] ||
                                    row.portalAccess
                                  }
                                  onChange={
                                    (
                                      event
                                    ) =>
                                      setRowAccess(
                                        (
                                          previous
                                        ) => ({
                                          ...previous,
                                          [row.rowNumber]:
                                            event.target.value as PortalAccess,
                                        })
                                      )
                                  }
                                  className="rounded border border-gray-200 px-2 py-1 text-xs"
                                >
                                  <option value="employee">Employee</option>
                                  <option value="manager">Manager</option>
                                  <option value="none">No portal access</option>
                                </select>
                              </td>

                              <td className="px-3 py-2">
                                {row.exists ? (
                                  <span className="text-gray-500">
                                    Existing email - skipped
                                  </span>
                                ) : row.errors.length ||
                                  managerReviewErrors[
                                    row.rowNumber
                                  ]?.length ? (
                                  <div className="text-xs text-rose-700">
                                    {[
                                      ...row.errors,
                                      ...(
                                        managerReviewErrors[
                                          row.rowNumber
                                        ] ||
                                        []
                                      ),
                                    ].map(
                                      (
                                        message
                                      ) => (
                                        <p
                                          key={
                                            message
                                          }
                                        >
                                          {message}
                                        </p>
                                      )
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-emerald-700">
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
                </>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-gray-100 px-5 py-4">
              <button
                type="button"
                disabled={
                  busy
                }
                onClick={() =>
                  setModalOpen(
                    false
                  )
                }
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
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
                    0
                }
                onClick={() =>
                  void commit()
                }
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy
                  ? 'Importing...'
                  : 'Import Employees'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
