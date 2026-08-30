import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  useAppData,
} from '../context/AppDataContext';

import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Badge from '../components/ui/Badge';

import {
  Plus,
  Briefcase,
  Building2,
  GraduationCap,
  Network,
  Settings2,
  Pencil,
  Trash2,
} from 'lucide-react';

import type {
  Grade,
} from '../types';

import api, {
  getApiErrorMessage,
} from '../services/api';

import {
  getOrganizationSettings,
  updateOrganizationSettings,
} from '../services/organizationSettings';

type Tab =
  | 'designations'
  | 'departments'
  | 'grades'
  | 'divisions'
  | 'others';

type MessageType =
  | 'success'
  | 'error'
  | 'warning'
  | 'info';

interface MessageState {
  open: boolean;
  type: MessageType;
  title: string;
  message: string;
}

interface DepartmentRow {
  _id: string;
  name: string;
  saturdayOff?: boolean;
  divisionName?: string;
}

const emptyGradeForm = {
  name: '',
  description: '',
};

const RESERVED_DIVISIONS =
  new Set([
    'admin',
    'manager',
    'employee',
  ]);

export default function MasterData() {
  const {
    designations,
    departments,
    grades,
    roles,

    addDesignation,
    addDepartment,
    addGrade,
    addRole,

    updateDesignation,
    deleteDesignation,

    updateDepartment,
    deleteDepartment,

    updateRole,
    deleteRole,

    updateGrade,
    deleteGrade,

    departmentSaturdayOff,
    toggleDepartmentSaturday,

    refreshLookups,
  } = useAppData();

  const [
    tab,
    setTab,
  ] =
    useState<Tab>(
      'designations'
    );

  const [
    departmentRows,
    setDepartmentRows,
  ] =
    useState<DepartmentRow[]>(
      []
    );


  const [
    leaveYearDay,
    setLeaveYearDay,
  ] =
    useState(
      1
    );

  const [
    leaveYearMonth,
    setLeaveYearMonth,
  ] =
    useState(
      1
    );

  const [
    leaveYearDisplay,
    setLeaveYearDisplay,
  ] =
    useState(
      '01-01'
    );

  const [
    savingLeaveYear,
    setSavingLeaveYear,
  ] =
    useState(
      false
    );

  const [
    showAdd,
    setShowAdd,
  ] =
    useState(false);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    saving,
    setSaving,
  ] =
    useState(false);

  const [
    deleting,
    setDeleting,
  ] =
    useState(false);

  const [
    name,
    setName,
  ] =
    useState('');

  const [
    selectedDivision,
    setSelectedDivision,
  ] =
    useState('');

  const [
    saturdayOffValue,
    setSaturdayOffValue,
  ] =
    useState(true);

  const [
    editingItem,
    setEditingItem,
  ] =
    useState<string | null>(
      null
    );

  const [
    editingGrade,
    setEditingGrade,
  ] =
    useState<Grade | null>(
      null
    );

  const [
    gradeForm,
    setGradeForm,
  ] =
    useState(
      emptyGradeForm
    );

  const [
    message,
    setMessage,
  ] =
    useState<MessageState>({
      open:
        false,
      type:
        'info',
      title:
        '',
      message:
        '',
    });

  const divisions =
    useMemo(
      () =>
        roles.filter(
          (
            role
          ) =>
            !RESERVED_DIVISIONS.has(
              role
                .trim()
                .toLowerCase()
            )
        ),
      [
        roles,
      ]
    );

  const showMessage =
    (
      type:
        MessageType,
      title:
        string,
      messageText:
        string
    ) => {
      setMessage({
        open:
          true,
        type,
        title,
        message:
          messageText,
      });
    };

  const loadDepartmentHierarchy =
    async () => {
      const response =
        await api.get(
          '/departments'
        );

      setDepartmentRows(
        response.data?.data ||
        []
      );
    };


  const loadOrganizationSettings =
    async () => {
      try {
        const settings =
          await getOrganizationSettings();

        setLeaveYearDay(
          settings.leaveYearStartDay
        );

        setLeaveYearMonth(
          settings.leaveYearStartMonth
        );

        setLeaveYearDisplay(
          settings.leaveYearStart
        );
      } catch (
        error
      ) {
        /*
         * Master Data itself should still load if settings are temporarily
         * unavailable. The current saved value can be retried from Others.
         */
        console.warn(
          'Unable to load Organization Start year date.',
          error
        );
      }
    };

  useEffect(
    () => {
      const loadMasterData =
        async () => {
          setLoading(
            true
          );

          try {
            await Promise.all([
              refreshLookups(),
              loadDepartmentHierarchy(),
              loadOrganizationSettings(),
            ]);
          } catch (
            error
          ) {
            showMessage(
              'error',
              'Unable to Load Data',
              getApiErrorMessage(
                error,
                'Master data could not be loaded from the database.'
              )
            );
          } finally {
            setLoading(
              false
            );
          }
        };

      void loadMasterData();
    },
    [
      refreshLookups,
    ]
  );

  const resetGradeForm =
    () =>
      setGradeForm(
        emptyGradeForm
      );

  const resetModalState =
    () => {
      setShowAdd(
        false
      );
      setName(
        ''
      );
      setSelectedDivision(
        ''
      );
      setEditingItem(
        null
      );
      setEditingGrade(
        null
      );
      setSaturdayOffValue(
        true
      );
      resetGradeForm();
    };

  const openAdd =
    () => {
      setName(
        ''
      );
      setSelectedDivision(
        ''
      );
      setEditingItem(
        null
      );
      setEditingGrade(
        null
      );
      setSaturdayOffValue(
        true
      );
      resetGradeForm();
      setShowAdd(
        true
      );
    };

  const openEditItem =
    (
      item:
        string
    ) => {
      setName(
        item
      );
      setEditingItem(
        item
      );

      if (
        tab ===
        'departments'
      ) {
        setSaturdayOffValue(
          departmentSaturdayOff[
            item
          ] ??
          true
        );

        const current =
          departmentRows.find(
            (
              department
            ) =>
              department.name ===
              item
          );

        setSelectedDivision(
          current?.divisionName ||
          ''
        );
      }

      setShowAdd(
        true
      );
    };

  const openEditGrade =
    (
      grade:
        Grade
    ) => {
      setEditingGrade(
        grade
      );

      setGradeForm({
        name:
          grade.name,
        description:
          grade.description ||
          '',
      });

      setShowAdd(
        true
      );
    };

  const handleDeleteItem =
    async (
      item:
        string
    ) => {
      setDeleting(
        true
      );

      try {
        if (
          tab ===
          'designations'
        ) {
          await deleteDesignation(
            item
          );
        } else if (
          tab ===
          'departments'
        ) {
          await deleteDepartment(
            item
          );
        } else if (
          tab ===
          'divisions'
        ) {
          await deleteRole(
            item
          );
        }

        await Promise.all([
          refreshLookups(),
          loadDepartmentHierarchy(),
        ]);

        showMessage(
          'success',
          'Deleted',
          `${item} has been removed successfully.`
        );
      } catch (
        error
      ) {
        showMessage(
          'error',
          'Delete Failed',
          getApiErrorMessage(
            error,
            'Unable to delete this item.'
          )
        );
      } finally {
        setDeleting(
          false
        );
      }
    };

  const handleDeleteGrade =
    async (
      grade:
        Grade
    ) => {
      setDeleting(
        true
      );

      try {
        await deleteGrade(
          grade.id
        );

        await refreshLookups();

        showMessage(
          'success',
          'Grade Deleted',
          `${grade.name} has been removed successfully.`
        );
      } catch (
        error
      ) {
        showMessage(
          'error',
          'Delete Failed',
          getApiErrorMessage(
            error,
            'Unable to delete this grade.'
          )
        );
      } finally {
        setDeleting(
          false
        );
      }
    };

  const handleAdd =
    async () => {
      if (
        !name.trim()
      ) {
        showMessage(
          'warning',
          'Name Required',
          'Please enter a name.'
        );

        return;
      }

      const trimmedName =
        name.trim();

      if (
        tab ===
        'divisions' &&
        RESERVED_DIVISIONS.has(
          trimmedName.toLowerCase()
        )
      ) {
        showMessage(
          'warning',
          'Invalid Division',
          'Admin, Manager and Employee are Portal Access values, not Divisions.'
        );

        return;
      }

      setSaving(
        true
      );

      try {
        if (
          editingItem
        ) {
          if (
            tab ===
            'designations'
          ) {
            await updateDesignation(
              editingItem,
              trimmedName
            );
          } else if (
            tab ===
            'departments'
          ) {
            await updateDepartment(
              editingItem,
              trimmedName
            );
          } else if (
            tab ===
            'divisions'
          ) {
            await updateRole(
              editingItem,
              trimmedName
            );
          }
        } else {
          if (
            tab ===
            'designations'
          ) {
            await addDesignation(
              trimmedName
            );
          } else if (
            tab ===
            'departments'
          ) {
            await addDepartment(
              trimmedName
            );
          } else if (
            tab ===
            'divisions'
          ) {
            await addRole(
              trimmedName
            );
          }
        }

        if (
          tab ===
          'departments'
        ) {
          await refreshLookups();

          const response =
            await api.get(
              '/departments'
            );

          const currentDepartment:
            DepartmentRow | undefined =
            (
              response.data?.data ||
              []
            ).find(
              (
                department:
                  DepartmentRow
              ) =>
                department.name ===
                trimmedName
            );

          if (
            currentDepartment?._id &&
            (
              currentDepartment.divisionName ||
              ''
            ) !==
              selectedDivision
          ) {
            await api.patch(
              `/departments/${currentDepartment._id}`,
              {
                divisionName:
                  selectedDivision,
              }
            );
          }

          const currentValue =
            departmentSaturdayOff[
              trimmedName
            ] ??
            true;

          if (
            currentValue !==
            saturdayOffValue
          ) {
            await toggleDepartmentSaturday(
              trimmedName
            );
          }
        }

        await Promise.all([
          refreshLookups(),
          loadDepartmentHierarchy(),
        ]);

        resetModalState();

        showMessage(
          'success',
          editingItem
            ? 'Updated'
            : 'Created',
          `${trimmedName} has been saved successfully.`
        );
      } catch (
        error
      ) {
        showMessage(
          'error',
          editingItem
            ? 'Update Failed'
            : 'Create Failed',
          getApiErrorMessage(
            error,
            'Unable to save this item.'
          )
        );
      } finally {
        setSaving(
          false
        );
      }
    };

  const handleAddGrade =
    async () => {
      if (
        !gradeForm.name.trim()
      ) {
        showMessage(
          'warning',
          'Grade Name Required',
          'Please enter a grade name.'
        );

        return;
      }

      setSaving(
        true
      );

      try {
        const payload:
          Grade = {
          id:
            editingGrade?.id ||
            '',
          name:
            gradeForm.name.trim(),
          description:
            gradeForm.description.trim(),
        };

        if (
          editingGrade
        ) {
          await updateGrade(
            payload
          );
        } else {
          await addGrade(
            payload
          );
        }

        await refreshLookups();

        const savedName =
          gradeForm.name.trim();

        resetModalState();

        showMessage(
          'success',
          editingGrade
            ? 'Grade Updated'
            : 'Grade Created',
          `${savedName} has been saved successfully.`
        );
      } catch (
        error
      ) {
        showMessage(
          'error',
          editingGrade
            ? 'Update Failed'
            : 'Create Failed',
          getApiErrorMessage(
            error,
            'Unable to save this grade.'
          )
        );
      } finally {
        setSaving(
          false
        );
      }
    };

  const saveLeaveYearStart =
    async () => {
      setSavingLeaveYear(
        true
      );

      try {
        const settings =
          await updateOrganizationSettings(
            leaveYearDay,
            leaveYearMonth
          );

        setLeaveYearDay(
          settings.leaveYearStartDay
        );

        setLeaveYearMonth(
          settings.leaveYearStartMonth
        );

        setLeaveYearDisplay(
          settings.leaveYearStart
        );

        showMessage(
          'success',
          'Leave Year Updated',
          'Organization Start year date has been saved successfully.'
        );
      } catch (
        error
      ) {
        showMessage(
          'error',
          'Unable to Save Leave Year',
          getApiErrorMessage(
            error,
            'Unable to save Organization Start year date.'
          )
        );
      } finally {
        setSavingLeaveYear(
          false
        );
      }
    };

  const months = [
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
  ];

  const assignDepartmentToDivision =
    async (
      department:
        DepartmentRow,
      divisionName:
        string
    ) => {
      try {
        await api.patch(
          `/departments/${department._id}`,
          {
            divisionName,
          }
        );

        await loadDepartmentHierarchy();

        showMessage(
          'success',
          'Department Updated',
          divisionName
            ? `${department.name} is now under ${divisionName}.`
            : `${department.name} is now unassigned.`
        );
      } catch (
        error
      ) {
        showMessage(
          'error',
          'Update Failed',
          getApiErrorMessage(
            error,
            'Unable to update Department Division.'
          )
        );
      }
    };

  const groupedDepartments =
    useMemo(
      () =>
        Object.fromEntries(
          divisions.map(
            (
              division
            ) => [
              division,
              departmentRows.filter(
                (
                  department
                ) =>
                  department.divisionName ===
                  division
              ),
            ]
          )
        ) as
          Record<
            string,
            DepartmentRow[]
          >,
      [
        divisions,
        departmentRows,
      ]
    );

  const unassignedDepartments =
    useMemo(
      () =>
        departmentRows.filter(
          (
            department
          ) =>
            !department.divisionName ||
            !divisions.includes(
              department.divisionName
            )
        ),
      [
        departmentRows,
        divisions,
      ]
    );

  const tabs = [
    {
      key:
        'designations' as const,
      label:
        'Designations',
      icon:
        Briefcase,
    },
    {
      key:
        'departments' as const,
      label:
        'Departments',
      icon:
        Building2,
    },
    {
      key:
        'grades' as const,
      label:
        'Grades',
      icon:
        GraduationCap,
    },
    {
      key:
        'divisions' as const,
      label:
        'Divisions',
      icon:
        Network,
    },
    {
      key:
        'others' as const,
      label:
        'Others',
      icon:
        Settings2,
    },
  ];

  const renderContent =
    () => {
      if (
        loading
      ) {
        return (
          <div className="rounded-2xl border border-gray-100 bg-white px-5 py-12 text-center text-sm text-gray-500 shadow-sm">
            Loading master data from database...
          </div>
        );
      }

      if (
        tab ===
        'others'
      ) {
        return (
          <div className="max-w-3xl rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-1">
              <h2 className="text-base font-semibold text-gray-900">
                Start year date
              </h2>

              <p className="text-sm leading-6 text-gray-500">
                Set this once for the organization. The system uses this date with each employee&apos;s Date of Joining to calculate prorated leave. Decimal results are always rounded down.
              </p>
            </div>

            <div className="mt-5 grid max-w-lg grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
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
                    leaveYearDay
                  }
                  onChange={
                    (
                      event
                    ) =>
                      setLeaveYearDay(
                        Number(
                          event.target.value
                        )
                      )
                  }
                  className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Month
                </label>

                <select
                  value={
                    leaveYearMonth
                  }
                  onChange={
                    (
                      event
                    ) =>
                      setLeaveYearMonth(
                        Number(
                          event.target.value
                        )
                      )
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  {months.map(
                    (
                      month,
                      index
                    ) => (
                      <option
                        key={
                          month
                        }
                        value={
                          index +
                          1
                        }
                      >
                        {
                          month
                        }
                      </option>
                    )
                  )}
                </select>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-gray-100 pt-5">
              <Button
                disabled={
                  savingLeaveYear
                }
                onClick={() =>
                  void saveLeaveYearStart()
                }
              >
                {savingLeaveYear
                  ? 'Saving...'
                  : 'Save Changes'}
              </Button>

              <span className="text-sm text-gray-500">
                Current Start year date:{' '}
                <strong className="font-semibold text-gray-800">
                  {
                    leaveYearDisplay
                  }
                </strong>
              </span>
            </div>
          </div>
        );
      }

      if (
        tab ===
        'grades'
      ) {
        return (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {grades.length ===
              0 && (
              <div className="lg:col-span-2 rounded-2xl border border-gray-100 bg-white px-5 py-12 text-center text-sm text-gray-400 shadow-sm">
                No grades found in the database.
              </div>
            )}

            {grades.map(
              (
                grade
              ) => (
                <div
                  key={
                    grade.id
                  }
                  className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="text-base font-semibold text-gray-900">
                        {
                          grade.name
                        }
                      </h3>

                      <p className="mt-1 text-sm text-gray-500">
                        {grade.description ||
                          'No description'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          openEditGrade(
                            grade
                          )
                        }
                        className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                        aria-label={`Edit ${grade.name}`}
                      >
                        <Pencil
                          size={
                            14
                          }
                        />
                      </button>

                      <button
                        type="button"
                        disabled={
                          deleting
                        }
                        onClick={() =>
                          void handleDeleteGrade(
                            grade
                          )
                        }
                        className="rounded-lg p-1.5 text-gray-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                        aria-label={`Delete ${grade.name}`}
                      >
                        <Trash2
                          size={
                            14
                          }
                        />
                      </button>
                    </div>
                  </div>

                  <div className="mt-4">
                    <Badge variant="teal">
                      Employee grade
                    </Badge>
                  </div>
                </div>
              )
            )}
          </div>
        );
      }

      if (
        tab ===
        'divisions'
      ) {
        return (
          <div className="space-y-4">
            {divisions.length ===
              0 && (
              <div className="rounded-2xl border border-gray-100 bg-white px-5 py-12 text-center text-sm text-gray-400 shadow-sm">
                No Divisions found in the database.
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {divisions.map(
                (
                  division
                ) => (
                  <div
                    key={
                      division
                    }
                    className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {
                            division
                          }
                        </h3>

                        <p className="mt-1 text-xs text-gray-500">
                          {
                            groupedDepartments[
                              division
                            ]?.length ||
                            0
                          } Department(s)
                        </p>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            openEditItem(
                              division
                            )
                          }
                          className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                          aria-label={`Edit ${division}`}
                        >
                          <Pencil
                            size={
                              13
                            }
                          />
                        </button>

                        <button
                          type="button"
                          disabled={
                            deleting
                          }
                          onClick={() =>
                            void handleDeleteItem(
                              division
                            )
                          }
                          className="rounded-lg p-1.5 text-gray-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                          aria-label={`Delete ${division}`}
                        >
                          <Trash2
                            size={
                              13
                            }
                          />
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 space-y-2">
                      {(
                        groupedDepartments[
                          division
                        ] ||
                        []
                      ).length ===
                        0 && (
                        <p className="text-sm text-gray-400">
                          No Departments assigned yet.
                        </p>
                      )}

                      {(
                        groupedDepartments[
                          division
                        ] ||
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
                            <span className="text-sm text-gray-700">
                              {
                                department.name
                              }
                            </span>

                            <select
                              value={
                                department.divisionName ||
                                ''
                              }
                              onChange={
                                (
                                  event
                                ) =>
                                  void assignDepartmentToDivision(
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
                                      option
                                    }
                                    value={
                                      option
                                    }
                                  >
                                    {
                                      option
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

            {unassignedDepartments.length >
              0 && (
              <div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-5">
                <h3 className="text-sm font-semibold text-amber-900">
                  Unassigned Departments
                </h3>

                <p className="mt-1 text-xs text-amber-700">
                  Assign these Departments to a Division before using them for new employees.
                </p>

                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  {unassignedDepartments.map(
                    (
                      department
                    ) => (
                      <div
                        key={
                          department._id
                        }
                        className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2"
                      >
                        <span className="text-sm text-gray-700">
                          {
                            department.name
                          }
                        </span>

                        <select
                          value=""
                          onChange={
                            (
                              event
                            ) =>
                              void assignDepartmentToDivision(
                                department,
                                event.target.value
                              )
                          }
                          className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs"
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
                                  division
                                }
                                value={
                                  division
                                }
                              >
                                {
                                  division
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
          </div>
        );
      }

      const items =
        tab ===
        'designations'
          ? designations
          : departments;

      return (
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
          {items.length ===
            0 && (
            <div className="px-5 py-12 text-center text-sm text-gray-400">
              No {tab} found in the database.
            </div>
          )}

          <div className="grid grid-cols-1 gap-0 sm:grid-cols-2 lg:grid-cols-3">
            {items.map(
              (
                item
              ) => {
                const department =
                  tab ===
                  'departments'
                    ? departmentRows.find(
                        (
                          row
                        ) =>
                          row.name ===
                          item
                      )
                    : undefined;

                return (
                  <div
                    key={
                      item
                    }
                    className="flex items-center justify-between border-b border-r border-gray-50 px-5 py-3 text-sm text-gray-800"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span>
                          {
                            item
                          }
                        </span>

                        {tab ===
                          'departments' &&
                          (
                            departmentSaturdayOff[
                              item
                            ] ??
                            true
                          ) && (
                            <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
                              Saturday off
                            </span>
                          )}

                        {tab ===
                          'departments' &&
                          !(
                            departmentSaturdayOff[
                              item
                            ] ??
                            true
                          ) && (
                            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                              Saturday on · 6-day week
                            </span>
                          )}
                      </div>

                      {tab ===
                        'departments' && (
                        <p className="mt-1 text-xs text-gray-400">
                          Division:{' '}
                          {department?.divisionName ||
                            'Unassigned'}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() =>
                          openEditItem(
                            item
                          )
                        }
                        className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                      >
                        <Pencil
                          size={
                            13
                          }
                        />
                      </button>

                      <button
                        type="button"
                        disabled={
                          deleting
                        }
                        onClick={() =>
                          void handleDeleteItem(
                            item
                          )
                        }
                        className="rounded-lg p-1.5 text-gray-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                      >
                        <Trash2
                          size={
                            13
                          }
                        />
                      </button>
                    </div>
                  </div>
                );
              }
            )}
          </div>
        </div>
      );
    };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">
          Create
        </h1>

        <p className="mt-1 text-sm text-gray-500">
          Manage database-backed organizational references.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {tabs.map(
            (
              item
            ) => {
              const Icon =
                item.icon;

              return (
                <button
                  key={
                    item.key
                  }
                  type="button"
                  onClick={() =>
                    setTab(
                      item.key
                    )
                  }
                  className={`inline-flex items-center gap-2 rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
                    tab ===
                    item.key
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-600 ring-1 ring-inset ring-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <Icon
                    size={
                      15
                    }
                  />

                  {
                    item.label
                  }
                </button>
              );
            }
          )}
        </div>

        {tab !==
          'others' && (
        <Button
            onClick={
            openAdd
          }
          disabled={
            loading
          }
        >
          <Plus
            size={
              16
            }
          />

          {tab ===
          'designations'
            ? 'Add Designation'
            : tab ===
                'departments'
              ? 'Add Department'
              : tab ===
                  'grades'
                ? 'Add Grade'
                : 'Add Division'}
        </Button>
        )}
      </div>

      {renderContent()}

      <Modal
        open={
          showAdd
        }
        onClose={() => {
          if (
            !saving
          ) {
            resetModalState();
          }
        }}
        title={
          tab ===
          'grades'
            ? editingGrade
              ? 'Edit Grade'
              : 'Add Grade'
            : editingItem
              ? `Edit ${
                  tab ===
                  'designations'
                    ? 'Designation'
                    : tab ===
                        'departments'
                      ? 'Department'
                      : 'Division'
                }`
              : tab ===
                  'designations'
                ? 'Add Designation'
                : tab ===
                    'departments'
                  ? 'Add Department'
                  : 'Add Division'
        }
        footer={
          <>
            <Button
              variant="secondary"
              disabled={
                saving
              }
              onClick={
                resetModalState
              }
            >
              Cancel
            </Button>

            <Button
              disabled={
                saving
              }
              onClick={() =>
                void (
                  tab ===
                  'grades'
                    ? handleAddGrade()
                    : handleAdd()
                )
              }
            >
              {saving
                ? 'Saving...'
                : tab ===
                    'grades'
                  ? editingGrade
                    ? 'Save Changes'
                    : 'Create Grade'
                  : editingItem
                    ? 'Save Changes'
                    : 'Add'}
            </Button>
          </>
        }
      >
        {tab ===
        'grades' ? (
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Grade name
              </label>

              <input
                value={
                  gradeForm.name
                }
                onChange={
                  (
                    event
                  ) =>
                    setGradeForm({
                      ...gradeForm,
                      name:
                        event.target.value,
                    })
                }
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                autoFocus
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Description
              </label>

              <input
                value={
                  gradeForm.description
                }
                onChange={
                  (
                    event
                  ) =>
                    setGradeForm({
                      ...gradeForm,
                      description:
                        event.target.value,
                    })
                }
                placeholder="Optional description"
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-xs leading-5 text-blue-700">
              Leave quotas and carry-forward rules are configured grade-wise inside Leave Policies.
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <input
              value={
                name
              }
              onChange={
                (
                  event
                ) =>
                  setName(
                    event.target.value
                  )
              }
              placeholder={
                tab ===
                'designations'
                  ? 'e.g. Data Scientist'
                  : tab ===
                      'departments'
                    ? 'e.g. Research'
                    : 'e.g. Technology'
              }
              className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              autoFocus
            />

            {tab ===
              'departments' && (
                <>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      Parent Division
                    </label>

                    <select
                      value={
                        selectedDivision
                      }
                      onChange={
                        (
                          event
                        ) =>
                          setSelectedDivision(
                            event.target.value
                          )
                      }
                      className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                      <option value="">
                        Unassigned
                      </option>

                      {divisions.map(
                        (
                          division
                        ) => (
                          <option
                            key={
                              division
                            }
                            value={
                              division
                            }
                          >
                            {
                              division
                            }
                          </option>
                        )
                      )}
                    </select>
                  </div>

                  <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={
                        saturdayOffValue
                      }
                      onChange={
                        (
                          event
                        ) =>
                          setSaturdayOffValue(
                            event.target.checked
                          )
                      }
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />

                    Saturday is a day off for this department
                  </label>
                </>
              )}
          </div>
        )}
      </Modal>

      <Modal
        open={
          message.open
        }
        onClose={() =>
          setMessage(
            (
              previous
            ) => ({
              ...previous,
              open:
                false,
            })
          )
        }
        title={
          message.title
        }
        footer={
          <Button
            onClick={() =>
              setMessage(
                (
                  previous
                ) => ({
                  ...previous,
                  open:
                    false,
                })
              )
            }
          >
            OK
          </Button>
        }
      >
        <div
          className={`rounded-lg px-4 py-3 text-sm ${
            message.type ===
            'error'
              ? 'bg-rose-50 text-rose-700'
              : message.type ===
                  'warning'
                ? 'bg-amber-50 text-amber-700'
                : message.type ===
                    'success'
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-blue-50 text-blue-700'
          }`}
        >
          {
            message.message
          }
        </div>
      </Modal>
    </div>
  );
}
