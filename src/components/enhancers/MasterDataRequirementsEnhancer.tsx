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

import {
  Pencil,
  Plus,
  Save,
  Trash2,
  X,
} from 'lucide-react';

import api, {
  getApiErrorMessage,
} from '../../services/api';

type DivisionRow = {
  _id: string;
  name: string;
};

type DepartmentRow = {
  _id: string;
  name: string;
  saturdayOff?: boolean;
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

export default function MasterDataRequirementsEnhancer() {
  const location =
    useLocation();

  const [
    mount,
    setMount,
  ] =
    useState<
      HTMLElement | null
    >(null);

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
    newDivision,
    setNewDivision,
  ] =
    useState('');

  const [
    editingId,
    setEditingId,
  ] =
    useState('');

  const [
    editingName,
    setEditingName,
  ] =
    useState('');

  const [
    busyKey,
    setBusyKey,
  ] =
    useState('');

  const [
    message,
    setMessage,
  ] =
    useState('');

  const load =
    async () => {
      const [
        divisionResponse,
        departmentResponse,
      ] =
        await Promise.all([
          api.get(
            '/roles'
          ),
          api.get(
            '/departments'
          ),
        ]);

      const rawDivisions =
        (
          divisionResponse.data?.data ||
          []
        ) as DivisionRow[];

      setDivisions(
        rawDivisions.filter(
          (
            division
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
        '/create'
      ) {
        return;
      }

      void load().catch(
        (
          error
        ) => {
          setMessage(
            getApiErrorMessage(
              error,
              'Unable to load Division / Department structure.'
            )
          );
        }
      );
    },
    [
      location.pathname,
    ]
  );

  /*
   * Remove the old HR Role UI from Master Data completely.
   * We keep the same backend /roles API only as a compatibility endpoint.
   */
  useEffect(
    () => {
      if (
        location.pathname !==
        '/create'
      ) {
        return;
      }

      const hideLegacyRoleUi =
        () => {
          const buttons =
            Array.from(
              document.querySelectorAll(
                'button'
              )
            ) as HTMLButtonElement[];

          const designationTab =
            buttons.find(
              (
                button
              ) =>
                button.textContent
                  ?.trim() ===
                'Designations'
            );

          const roleTab =
            buttons.find(
              (
                button
              ) =>
                [
                  'Roles',
                  'Divisions',
                ].includes(
                  button.textContent
                    ?.trim() ||
                    ''
                )
            );

          if (
            roleTab
          ) {
            const isSelected =
              roleTab.className.includes(
                'bg-blue'
              );

            if (
              isSelected &&
              designationTab
            ) {
              designationTab.click();
            }

            roleTab.style.display =
              'none';
          }

          for (
            const button
            of buttons
          ) {
            const text =
              button.textContent
                ?.trim() ||
              '';

            if (
              text ===
                'Add Role' ||
              text ===
                'Add Division'
            ) {
              button.style.display =
                'none';
            }
          }
        };

      const observer =
        new MutationObserver(
          hideLegacyRoleUi
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

      hideLegacyRoleUi();

      return () =>
        observer.disconnect();
    },
    [
      location.pathname,
    ]
  );

  useEffect(
    () => {
      if (
        location.pathname !==
        '/create'
      ) {
        return;
      }

      let host:
        HTMLDivElement | null =
        null;

      const install =
        () => {
          if (
            host?.isConnected
          ) {
            return;
          }

          const pageRoot =
            document.querySelector(
              'main .mx-auto.max-w-7xl'
            );

          if (!pageRoot) {
            return;
          }

          host =
            document.createElement(
              'div'
            );

          host.setAttribute(
            'data-division-department-setup',
            'true'
          );

          pageRoot.prepend(
            host
          );

          setMount(
            host
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

      install();

      return () => {
        observer.disconnect();

        host?.remove();

        setMount(
          null
        );
      };
    },
    [
      location.pathname,
    ]
  );

  const grouped =
    useMemo(
      () => {
        const map =
          new Map<
            string,
            DepartmentRow[]
          >();

        for (
          const division
          of divisions
        ) {
          map.set(
            division.name,
            []
          );
        }

        for (
          const department
          of departments
        ) {
          if (
            department.divisionName &&
            map.has(
              department.divisionName
            )
          ) {
            map
              .get(
                department.divisionName
              )
              ?.push(
                department
              );
          }
        }

        return map;
      },
      [
        departments,
        divisions,
      ]
    );

  const unassigned =
    useMemo(
      () =>
        departments.filter(
          (
            department
          ) =>
            !department.divisionName ||
            !divisions.some(
              (
                division
              ) =>
                division.name ===
                department.divisionName
            )
        ),
      [
        departments,
        divisions,
      ]
    );

  const createDivision =
    async () => {
      const name =
        newDivision.trim();

      if (
        !name
      ) {
        setMessage(
          'Division name is required.'
        );

        return;
      }

      if (
        !isRealDivision(
          name
        )
      ) {
        setMessage(
          'Admin, Manager and Employee are Portal Access values, not Divisions.'
        );

        return;
      }

      setBusyKey(
        'create'
      );

      setMessage(
        ''
      );

      try {
        await api.post(
          '/roles',
          {
            name,
          }
        );

        setNewDivision(
          ''
        );

        await load();

        setMessage(
          `${name} Division created.`
        );
      } catch (
        error
      ) {
        setMessage(
          getApiErrorMessage(
            error,
            'Unable to create Division.'
          )
        );
      } finally {
        setBusyKey(
          ''
        );
      }
    };

  const saveDivision =
    async (
      division:
        DivisionRow
    ) => {
      const name =
        editingName.trim();

      if (
        !name
      ) {
        setMessage(
          'Division name is required.'
        );

        return;
      }

      if (
        !isRealDivision(
          name
        )
      ) {
        setMessage(
          'Admin, Manager and Employee are Portal Access values, not Divisions.'
        );

        return;
      }

      setBusyKey(
        division._id
      );

      setMessage(
        ''
      );

      try {
        await api.patch(
          `/roles/${division._id}`,
          {
            name,
          }
        );

        setEditingId(
          ''
        );

        setEditingName(
          ''
        );

        await load();

        setMessage(
          'Division updated.'
        );
      } catch (
        error
      ) {
        setMessage(
          getApiErrorMessage(
            error,
            'Unable to update Division.'
          )
        );
      } finally {
        setBusyKey(
          ''
        );
      }
    };

  const removeDivision =
    async (
      division:
        DivisionRow
    ) => {
      const confirmed =
        window.confirm(
          `Delete Division "${division.name}"? This will be blocked if employees or departments still use it.`
        );

      if (
        !confirmed
      ) {
        return;
      }

      setBusyKey(
        division._id
      );

      setMessage(
        ''
      );

      try {
        await api.delete(
          `/roles/${division._id}`
        );

        await load();

        setMessage(
          'Division deleted.'
        );
      } catch (
        error
      ) {
        setMessage(
          getApiErrorMessage(
            error,
            'Unable to delete Division.'
          )
        );
      } finally {
        setBusyKey(
          ''
        );
      }
    };

  const assignDivision =
    async (
      department:
        DepartmentRow,
      divisionName:
        string
    ) => {
      setBusyKey(
        `department-${department._id}`
      );

      setMessage(
        ''
      );

      try {
        await api.patch(
          `/departments/${department._id}`,
          {
            divisionName,
          }
        );

        await load();

        setMessage(
          divisionName
            ? `${department.name} assigned to ${divisionName}.`
            : `${department.name} is now unassigned.`
        );
      } catch (
        error
      ) {
        setMessage(
          getApiErrorMessage(
            error,
            'Unable to update Department Division.'
          )
        );
      } finally {
        setBusyKey(
          ''
        );
      }
    };

  if (!mount) {
    return null;
  }

  return createPortal(
    <section className="mb-6 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Divisions & Departments
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Division is the parent organizational unit. Every Department can
            be assigned to one Division, and employee creation filters
            Departments by the selected Division.
          </p>
        </div>

        <div className="flex min-w-[300px] gap-2">
          <input
            value={
              newDivision
            }
            onChange={
              (
                event
              ) =>
                setNewDivision(
                  event.target.value
                )
            }
            placeholder="New division name"
            className="min-w-0 flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />

          <button
            type="button"
            disabled={
              busyKey ===
              'create'
            }
            onClick={() =>
              void createDivision()
            }
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            <Plus
              size={
                15
              }
            />
            Add Division
          </button>
        </div>
      </div>

      {divisions.length ===
        0 && (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          No real Divisions exist yet. Add one above. Portal Access values
          such as Employee / Manager / Admin are not treated as Divisions.
        </div>
      )}

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        {divisions.map(
          (
            division
          ) => (
            <div
              key={
                division._id
              }
              className="rounded-xl border border-gray-100 p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                {editingId ===
                division._id ? (
                  <div className="flex min-w-0 flex-1 gap-2">
                    <input
                      value={
                        editingName
                      }
                      onChange={
                        (
                          event
                        ) =>
                          setEditingName(
                            event.target.value
                          )
                      }
                      className="min-w-0 flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    />

                    <button
                      type="button"
                      disabled={
                        busyKey ===
                        division._id
                      }
                      onClick={() =>
                        void saveDivision(
                          division
                        )
                      }
                      className="rounded-lg bg-emerald-50 p-2 text-emerald-700"
                      title="Save Division"
                    >
                      <Save
                        size={
                          15
                        }
                      />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(
                          ''
                        );

                        setEditingName(
                          ''
                        );
                      }}
                      className="rounded-lg bg-gray-50 p-2 text-gray-600"
                      title="Cancel"
                    >
                      <X
                        size={
                          15
                        }
                      />
                    </button>
                  </div>
                ) : (
                  <>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {
                          division.name
                        }
                      </h3>

                      <span className="mt-1 inline-block rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                        {
                          grouped.get(
                            division.name
                          )?.length ||
                          0
                        }{' '}
                        Department(s)
                      </span>
                    </div>

                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(
                            division._id
                          );

                          setEditingName(
                            division.name
                          );
                        }}
                        className="rounded-lg p-2 text-amber-600 hover:bg-amber-50"
                        title="Edit Division"
                      >
                        <Pencil
                          size={
                            15
                          }
                        />
                      </button>

                      <button
                        type="button"
                        disabled={
                          busyKey ===
                          division._id
                        }
                        onClick={() =>
                          void removeDivision(
                            division
                          )
                        }
                        className="rounded-lg p-2 text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                        title="Delete Division"
                      >
                        <Trash2
                          size={
                            15
                          }
                        />
                      </button>
                    </div>
                  </>
                )}
              </div>

              <div className="mt-3 space-y-2">
                {(
                  grouped.get(
                    division.name
                  ) ||
                  []
                ).length ===
                  0 && (
                  <p className="text-sm text-gray-400">
                    No Departments assigned yet.
                  </p>
                )}

                {(
                  grouped.get(
                    division.name
                  ) ||
                  []
                ).map(
                  (
                    department
                  ) => (
                    <div
                      key={
                        department._id
                      }
                      className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 px-3 py-2"
                    >
                      <span className="text-sm font-medium text-gray-700">
                        {
                          department.name
                        }
                      </span>

                      <select
                        value={
                          department.divisionName ||
                          ''
                        }
                        disabled={
                          busyKey ===
                          `department-${department._id}`
                        }
                        onChange={
                          (
                            event
                          ) =>
                            void assignDivision(
                              department,
                              event.target.value
                            )
                        }
                        className="max-w-[180px] rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs"
                      >
                        <option value="">
                          Unassigned
                        </option>

                        {divisions.map(
                          (
                            option
                          ) => (
                            <option
                              key={
                                option._id
                              }
                              value={
                                option.name
                              }
                            >
                              {
                                option.name
                              }
                            </option>
                          )
                        )}
                      </select>
                    </div>
                  )
                )}
              </div>
            </div>
          )
        )}
      </div>

      {unassigned.length >
        0 && (
        <div className="mt-5 rounded-xl border border-amber-100 bg-amber-50/60 p-4">
          <h3 className="text-sm font-semibold text-amber-900">
            Unassigned Departments
          </h3>

          <p className="mt-1 text-xs text-amber-700">
            Assign these Departments to a Division before creating new
            employees under them.
          </p>

          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {unassigned.map(
              (
                department
              ) => (
                <div
                  key={
                    department._id
                  }
                  className="flex items-center gap-3 rounded-lg bg-white px-3 py-2"
                >
                  <span className="min-w-0 flex-1 truncate text-sm text-gray-700">
                    {
                      department.name
                    }
                  </span>

                  <select
                    value=""
                    disabled={
                      busyKey ===
                      `department-${department._id}`
                    }
                    onChange={
                      (
                        event
                      ) =>
                        void assignDivision(
                          department,
                          event.target.value
                        )
                    }
                    className="rounded-lg border border-gray-200 px-2 py-1.5 text-xs"
                  >
                    <option value="">
                      Select Division
                    </option>

                    {divisions.map(
                      (
                        division
                      ) => (
                        <option
                          key={
                            division._id
                          }
                          value={
                            division.name
                          }
                        >
                          {
                            division.name
                          }
                        </option>
                      )
                    )}
                  </select>
                </div>
              )
            )}
          </div>
        </div>
      )}

      {message && (
        <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
          {
            message
          }
        </div>
      )}
    </section>,
    mount
  );
}
