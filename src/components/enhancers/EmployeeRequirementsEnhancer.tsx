import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  createPortal,
} from 'react-dom';

import {
  useLocation,
} from 'react-router-dom';

import api, {
  getApiErrorMessage,
} from '../../services/api';

import {
  getOrganizationSettings,
  updateOrganizationSettings,
} from '../../services/organizationSettings';

type DivisionRow = {
  _id: string;
  name: string;
};

type DepartmentRow = {
  _id: string;
  name: string;
  divisionName?: string;
};

const RESERVED_DIVISIONS =
  new Set([
    'admin',
    'manager',
    'employee',
  ]);

function isRealDivision(
  name:
    string
) {
  return !RESERVED_DIVISIONS.has(
    name
      .trim()
      .toLowerCase()
  );
}

function findFieldSelect(
  labels:
    string[]
) {
  const allLabels =
    Array.from(
      document.querySelectorAll(
        'label'
      )
    );

  const label =
    allLabels.find(
      (
        item
      ) =>
        labels.includes(
          item.textContent
            ?.trim() ||
            ''
        )
    );

  if (!label) {
    return null;
  }

  return (
    label.parentElement
      ?.querySelector(
        'select'
      ) ||
    null
  ) as
    | HTMLSelectElement
    | null;
}

export default function EmployeeRequirementsEnhancer() {
  const location =
    useLocation();

  const [
    divisions,
    setDivisions,
  ] =
    useState<
      DivisionRow[]
    >([]);

  const [
    departments,
    setDepartments,
  ] =
    useState<
      DepartmentRow[]
    >([]);

  const [
    mount,
    setMount,
  ] =
    useState<
      HTMLElement | null
    >(null);

  const [
    day,
    setDay,
  ] =
    useState(
      1
    );

  const [
    month,
    setMonth,
  ] =
    useState(
      1
    );

  const [
    display,
    setDisplay,
  ] =
    useState('');

  const [
    busy,
    setBusy,
  ] =
    useState(
      false
    );

  const [
    message,
    setMessage,
  ] =
    useState('');

  const months =
    useMemo(
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

  const load =
    async () => {
      const [
        settings,
        divisionResponse,
        departmentResponse,
      ] =
        await Promise.all([
          getOrganizationSettings(),
          api.get(
            '/roles'
          ),
          api.get(
            '/departments'
          ),
        ]);

      setDay(
        settings.leaveYearStartDay
      );

      setMonth(
        settings.leaveYearStartMonth
      );

      setDisplay(
        settings.leaveYearStart
      );

      setDivisions(
        (
          divisionResponse.data?.data ||
          []
        ).filter(
          (
            division:
              DivisionRow
          ) =>
            isRealDivision(
              division.name ||
              ''
            )
        )
      );

      setDepartments(
        departmentResponse.data?.data ||
        []
      );
    };

  useEffect(
    () => {
      if (
        location.pathname !==
        '/employees'
      ) {
        return;
      }

      void load().catch(
        () => {
          setDivisions(
            []
          );

          setDepartments(
            []
          );
        }
      );
    },
    [
      location.pathname,
    ]
  );

  useEffect(
    () => {
      if (
        location.pathname !==
        '/employees'
      ) {
        return;
      }

      let host:
        HTMLDivElement | null =
        null;

      let currentDivisionSelect:
        HTMLSelectElement | null =
        null;

      const enforceDivisionOptions =
        () => {
          const divisionSelect =
            findFieldSelect([
              'Division',
              'Role',
            ]);

          if (!divisionSelect) {
            return null;
          }

          /*
           * Hide legacy Portal Access values from the Division selector.
           * Their database rows can remain for backward compatibility, but
           * they are not valid organization Divisions.
           */
          for (
            const option
            of Array.from(
              divisionSelect.options
            )
          ) {
            if (
              !option.value
            ) {
              continue;
            }

            const allowed =
              isRealDivision(
                option.value
              ) &&
              divisions.some(
                (
                  division
                ) =>
                  division.name ===
                  option.value
              );

            option.hidden =
              !allowed;

            option.disabled =
              !allowed;
          }

          if (
            divisionSelect.value &&
            !isRealDivision(
              divisionSelect.value
            )
          ) {
            divisionSelect.value =
              '';

            divisionSelect.dispatchEvent(
              new Event(
                'change',
                {
                  bubbles:
                    true,
                }
              )
            );
          }

          return divisionSelect;
        };

      const filterDepartments =
        () => {
          const divisionSelect =
            enforceDivisionOptions();

          const departmentSelect =
            findFieldSelect([
              'Department',
            ]);

          if (
            !divisionSelect ||
            !departmentSelect
          ) {
            return;
          }

          const selectedDivision =
            divisionSelect.value;

          const divisionByDepartment =
            new Map(
              departments.map(
                (
                  department
                ) => [
                  department.name,
                  department.divisionName ||
                    '',
                ]
              )
            );

          for (
            const option
            of Array.from(
              departmentSelect.options
            )
          ) {
            if (
              !option.value
            ) {
              option.hidden =
                false;

              option.disabled =
                false;

              continue;
            }

            const parentDivision =
              divisionByDepartment.get(
                option.value
              ) ||
              '';

            /*
             * A new employee must follow Division -> Department.
             * Legacy unassigned departments remain visible only until the
             * Admin assigns them in Master Data, preserving old data safely.
             */
            const allowed =
              !selectedDivision
                ? false
                : (
                    !parentDivision ||
                    parentDivision ===
                      selectedDivision
                  );

            option.hidden =
              !allowed;

            option.disabled =
              !allowed;
          }

          if (
            !selectedDivision
          ) {
            departmentSelect.value =
              '';
          } else {
            const selectedOption =
              departmentSelect
                .selectedOptions[0];

            if (
              selectedOption &&
              selectedOption.disabled
            ) {
              departmentSelect.value =
                '';
            }
          }

          if (
            currentDivisionSelect !==
            divisionSelect
          ) {
            currentDivisionSelect?.removeEventListener(
              'change',
              filterDepartments
            );

            currentDivisionSelect =
              divisionSelect;

            currentDivisionSelect.addEventListener(
              'change',
              filterDepartments
            );
          }
        };

      const installLeaveYearField =
        () => {
          const modalTitle =
            Array.from(
              document.querySelectorAll(
                'h1,h2,h3'
              )
            ).find(
              (
                heading
              ) =>
                [
                  'Create Employee',
                  'Edit Employee',
                ].includes(
                  heading.textContent
                    ?.trim() ||
                    ''
                )
            );

          if (!modalTitle) {
            host?.remove();
            host =
              null;

            setMount(
              null
            );

            return;
          }

          if (
            host?.isConnected
          ) {
            return;
          }

          const dateLabel =
            Array.from(
              document.querySelectorAll(
                'label'
              )
            ).find(
              (
                label
              ) =>
                label.textContent
                  ?.trim() ===
                'Date of Joining'
            );

          const dateField =
            dateLabel?.parentElement;

          const grid =
            dateField?.parentElement;

          if (!grid) {
            return;
          }

          host =
            document.createElement(
              'div'
            );

          host.setAttribute(
            'data-employee-leave-year-start',
            'true'
          );

          grid.insertBefore(
            host,
            dateField?.nextSibling ||
              null
          );

          setMount(
            host
          );
        };

      const enhance =
        () => {
          installLeaveYearField();
          filterDepartments();
        };

      const observer =
        new MutationObserver(
          enhance
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

      enhance();

      return () => {
        observer.disconnect();

        currentDivisionSelect?.removeEventListener(
          'change',
          filterDepartments
        );

        host?.remove();

        setMount(
          null
        );
      };
    },
    [
      departments,
      divisions,
      location.pathname,
    ]
  );

  const saveLeaveYear =
    async () => {
      setBusy(
        true
      );

      setMessage(
        ''
      );

      try {
        const next =
          await updateOrganizationSettings(
            day,
            month
          );

        setDisplay(
          next.leaveYearStart
        );

        setMessage(
          'Company Leave Year Start saved.'
        );
      } catch (
        error
      ) {
        setMessage(
          getApiErrorMessage(
            error,
            'Unable to save Leave Year Start.'
          )
        );
      } finally {
        setBusy(
          false
        );
      }
    };

  if (!mount) {
    return null;
  }

  return createPortal(
    <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3">
      <p className="text-sm font-semibold text-blue-950">
        Leave Year Start
      </p>

      <p className="mt-1 text-xs text-blue-700">
        Company-wide leave-year start used with Date of Joining to calculate
        prorated leave. Decimal results are always rounded down.
      </p>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-blue-900">
            Day
          </label>

          <input
            type="number"
            min={
              1
            }
            max={
              31
            }
            value={
              day
            }
            onChange={
              (
                event
              ) =>
                setDay(
                  Number(
                    event.target.value
                  )
                )
            }
            className="w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-blue-900">
            Month
          </label>

          <select
            value={
              month
            }
            onChange={
              (
                event
              ) =>
                setMonth(
                  Number(
                    event.target.value
                  )
                )
            }
            className="w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm"
          >
            {months.map(
              (
                name,
                index
              ) => (
                <option
                  key={
                    name
                  }
                  value={
                    index +
                    1
                  }
                >
                  {
                    name
                  }
                </option>
              )
            )}
          </select>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={
            busy
          }
          onClick={() =>
            void saveLeaveYear()
          }
          className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
        >
          {busy
            ? 'Saving...'
            : 'Save Leave Year Start'}
        </button>

        <span className="text-xs text-blue-700">
          Current: {display || 'Not loaded'}
        </span>
      </div>

      {message && (
        <p className="mt-2 text-xs text-blue-800">
          {
            message
          }
        </p>
      )}
    </div>,
    mount
  );
}
