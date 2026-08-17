import { useEffect, useState } from 'react';
import { useAppData } from '../context/AppDataContext';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Badge from '../components/ui/Badge';
import {
  Plus,
  Briefcase,
  Building2,
  GraduationCap,
  ShieldCheck,
  Pencil,
  Trash2,
} from 'lucide-react';
import type { Grade } from '../types';
import { getApiErrorMessage } from '../services/api';

type Tab =
  | 'designations'
  | 'departments'
  | 'grades'
  | 'roles';

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

const emptyGradeForm = {
  name: '',
  annualLeaveQuota: 14,
  sickLeaveQuota: 7,
  casualLeaveQuota: 5,
  carryForwardAllowed: false,
  maxCarryForwardDays: 0,
  description: '',
};

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

  const [tab, setTab] =
    useState<Tab>('roles');

  const [showAdd, setShowAdd] =
    useState(false);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [deleting, setDeleting] =
    useState(false);

  const [name, setName] =
    useState('');

  const [
    saturdayOffValue,
    setSaturdayOffValue,
  ] = useState(true);

  const [
    editingItem,
    setEditingItem,
  ] = useState<string | null>(
    null
  );

  const [
    editingGrade,
    setEditingGrade,
  ] = useState<Grade | null>(
    null
  );

  const [
    gradeForm,
    setGradeForm,
  ] = useState(
    emptyGradeForm
  );

  const [message, setMessage] =
    useState<MessageState>({
      open: false,
      type: 'info',
      title: '',
      message: '',
    });

  const showMessage = (
    type: MessageType,
    title: string,
    messageText: string
  ) => {
    setMessage({
      open: true,
      type,
      title,
      message: messageText,
    });
  };

  useEffect(() => {
    const loadMasterData =
      async () => {
        setLoading(true);

        try {
          await refreshLookups();
        } catch (error) {
          showMessage(
            'error',
            'Unable to Load Data',
            getApiErrorMessage(
              error,
              'Master data could not be loaded from the database.'
            )
          );
        } finally {
          setLoading(false);
        }
      };

    void loadMasterData();
  }, [refreshLookups]);

  const resetGradeForm = () =>
    setGradeForm(
      emptyGradeForm
    );

  const resetModalState = () => {
    setShowAdd(false);
    setName('');
    setEditingItem(null);
    setEditingGrade(null);
    setSaturdayOffValue(true);
    resetGradeForm();
  };

  const openAdd = () => {
    setName('');
    setEditingItem(null);
    setEditingGrade(null);
    setSaturdayOffValue(true);
    resetGradeForm();
    setShowAdd(true);
  };

  const openEditItem = (
    item: string
  ) => {
    setName(item);
    setEditingItem(item);

    if (tab === 'departments') {
      setSaturdayOffValue(
        departmentSaturdayOff[
          item
        ] ?? true
      );
    }

    setShowAdd(true);
  };

  const openEditGrade = (
    grade: Grade
  ) => {
    setEditingGrade(grade);

    setGradeForm({
      name: grade.name,
      annualLeaveQuota:
        grade.annualLeaveQuota,
      sickLeaveQuota:
        grade.sickLeaveQuota,
      casualLeaveQuota:
        grade.casualLeaveQuota,
      carryForwardAllowed:
        grade.carryForwardAllowed,
      maxCarryForwardDays:
        grade.maxCarryForwardDays,
      description:
        grade.description || '',
    });

    setShowAdd(true);
  };

  const handleDeleteItem =
    async (
      item: string
    ) => {
      setDeleting(true);

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
          tab === 'roles'
        ) {
          await deleteRole(item);
        }

        await refreshLookups();

        showMessage(
          'success',
          'Deleted',
          `${item} has been removed successfully.`
        );
      } catch (error) {
        showMessage(
          'error',
          'Delete Failed',
          getApiErrorMessage(
            error,
            'Unable to delete this item.'
          )
        );
      } finally {
        setDeleting(false);
      }
    };

  const handleDeleteGrade =
    async (
      grade: Grade
    ) => {
      setDeleting(true);

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
      } catch (error) {
        showMessage(
          'error',
          'Delete Failed',
          getApiErrorMessage(
            error,
            'Unable to delete this grade.'
          )
        );
      } finally {
        setDeleting(false);
      }
    };

  const handleAdd =
    async () => {
      if (!name.trim()) {
        showMessage(
          'warning',
          'Name Required',
          'Please enter a name.'
        );

        return;
      }

      const trimmedName =
        name.trim();

      setSaving(true);

      try {
        if (editingItem) {
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
            tab === 'roles'
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
            tab === 'roles'
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

          const currentValue =
            departmentSaturdayOff[
              trimmedName
            ] ?? true;

          if (
            currentValue !==
            saturdayOffValue
          ) {
            await toggleDepartmentSaturday(
              trimmedName
            );
          }
        }

        await refreshLookups();

        resetModalState();

        showMessage(
          'success',
          editingItem
            ? 'Updated'
            : 'Created',
          `${trimmedName} has been saved successfully.`
        );
      } catch (error) {
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
        setSaving(false);
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

      if (
        gradeForm.annualLeaveQuota <
          0 ||
        gradeForm.sickLeaveQuota <
          0 ||
        gradeForm.casualLeaveQuota <
          0 ||
        gradeForm.maxCarryForwardDays <
          0
      ) {
        showMessage(
          'warning',
          'Invalid Balance',
          'Leave balances cannot be negative.'
        );

        return;
      }

      setSaving(true);

      try {
        if (editingGrade) {
          await updateGrade({
            id:
              editingGrade.id,
            ...gradeForm,
            name:
              gradeForm.name.trim(),
          });
        } else {
          await addGrade({
            id: '',
            ...gradeForm,
            name:
              gradeForm.name.trim(),
          });
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
      } catch (error) {
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
        setSaving(false);
      }
    };

  const tabs = [
    {
      key:
        'designations' as const,
      label:
        'Designations',
      icon: Briefcase,
    },
    {
      key:
        'departments' as const,
      label:
        'Departments',
      icon: Building2,
    },
    {
      key: 'grades' as const,
      label: 'Grades',
      icon:
        GraduationCap,
    },
    {
      key: 'roles' as const,
      label: 'Roles',
      icon: ShieldCheck,
    },
  ];

  const renderContent =
    () => {
      if (loading) {
        return (
          <div className="rounded-2xl border border-gray-100 bg-white px-5 py-12 text-center text-sm text-gray-500 shadow-sm">
            Loading master data
            from database...
          </div>
        );
      }

      if (tab === 'grades') {
        return (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {grades.length ===
              0 && (
              <div className="lg:col-span-2 rounded-2xl border border-gray-100 bg-white px-5 py-12 text-center text-sm text-gray-400 shadow-sm">
                No grades found
                in the database.
              </div>
            )}

            {grades.map(
              (grade) => (
                <div
                  key={
                    grade.id
                  }
                  className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-base font-semibold text-gray-900">
                      {
                        grade.name
                      }
                    </h3>

                    <div className="flex items-center gap-2">
                      <Badge variant="teal">
                        {grade.description ||
                          'Grade policy'}
                      </Badge>

                      <button
                        type="button"
                        onClick={() =>
                          openEditGrade(
                            grade
                          )
                        }
                        className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
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
                      >
                        <Trash2
                          size={
                            14
                          }
                        />
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">
                        Annual balance
                      </span>
                      <span className="font-medium text-gray-900">
                        {
                          grade.annualLeaveQuota
                        }{' '}
                        days
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-gray-500">
                        Sick balance
                      </span>
                      <span className="font-medium text-gray-900">
                        {
                          grade.sickLeaveQuota
                        }{' '}
                        days
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-gray-500">
                        Casual balance
                      </span>
                      <span className="font-medium text-gray-900">
                        {
                          grade.casualLeaveQuota
                        }{' '}
                        days
                      </span>
                    </div>
                  </div>
                </div>
              )
            )}
          </div>
        );
      }

      const items =
        tab === 'designations'
          ? designations
          : tab ===
              'departments'
            ? departments
            : roles;

      return (
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
          {items.length ===
            0 && (
            <div className="px-5 py-12 text-center text-sm text-gray-400">
              No {tab} found
              in the database.
            </div>
          )}

          <div className="grid grid-cols-1 gap-0 sm:grid-cols-2 lg:grid-cols-3">
            {items.map(
              (item) => (
                <div
                  key={item}
                  className="flex items-center justify-between border-b border-r border-gray-50 px-5 py-3 text-sm text-gray-800"
                >
                  <div className="flex items-center gap-2">
                    <span>
                      {item}
                    </span>

                    {tab ===
                      'departments' &&
                      (
                        departmentSaturdayOff[
                          item
                        ] ?? true
                      ) && (
                        <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
                          Saturday
                          off
                        </span>
                      )}

                    {tab ===
                      'departments' &&
                      !(
                        departmentSaturdayOff[
                          item
                        ] ?? true
                      ) && (
                        <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                          Saturday
                          on ·
                          6-day week
                        </span>
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
              )
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
          Manage database-backed
          HR references and system
          roles.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {tabs.map(
            (item) => {
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
                    size={15}
                  />
                  {item.label}
                </button>
              );
            }
          )}
        </div>

        <Button
          onClick={openAdd}
          disabled={loading}
        >
          <Plus size={16} />

          {tab ===
          'designations'
            ? 'Add Designation'
            : tab ===
                'departments'
              ? 'Add Department'
              : tab ===
                  'grades'
                ? 'Add Grade'
                : 'Add Role'}
        </Button>
      </div>

      {renderContent()}

      <Modal
        open={showAdd}
        onClose={() => {
          if (!saving) {
            resetModalState();
          }
        }}
        title={
          tab === 'grades'
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
                      : 'Role'
                }`
              : tab ===
                  'designations'
                ? 'Add Designation'
                : tab ===
                    'departments'
                  ? 'Add Department'
                  : 'Add Role'
        }
        footer={
          <>
            <Button
              variant="secondary"
              disabled={saving}
              onClick={
                resetModalState
              }
            >
              Cancel
            </Button>

            <Button
              disabled={saving}
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
        {tab === 'grades' ? (
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Grade name
              </label>

              <input
                value={
                  gradeForm.name
                }
                onChange={(
                  event
                ) =>
                  setGradeForm({
                    ...gradeForm,
                    name:
                      event
                        .target
                        .value,
                  })
                }
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Annual balance
                </label>

                <input
                  type="number"
                  min="0"
                  value={
                    gradeForm.annualLeaveQuota
                  }
                  onChange={(
                    event
                  ) =>
                    setGradeForm({
                      ...gradeForm,
                      annualLeaveQuota:
                        Number(
                          event
                            .target
                            .value
                        ),
                    })
                  }
                  className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Sick balance
                </label>

                <input
                  type="number"
                  min="0"
                  value={
                    gradeForm.sickLeaveQuota
                  }
                  onChange={(
                    event
                  ) =>
                    setGradeForm({
                      ...gradeForm,
                      sickLeaveQuota:
                        Number(
                          event
                            .target
                            .value
                        ),
                    })
                  }
                  className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Casual balance
                </label>

                <input
                  type="number"
                  min="0"
                  value={
                    gradeForm.casualLeaveQuota
                  }
                  onChange={(
                    event
                  ) =>
                    setGradeForm({
                      ...gradeForm,
                      casualLeaveQuota:
                        Number(
                          event
                            .target
                            .value
                        ),
                    })
                  }
                  className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={
                  gradeForm.carryForwardAllowed
                }
                onChange={(
                  event
                ) =>
                  setGradeForm({
                    ...gradeForm,
                    carryForwardAllowed:
                      event
                        .target
                        .checked,
                  })
                }
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />

              Carry forward
              allowed
            </label>

            {gradeForm.carryForwardAllowed && (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Maximum carry
                  forward days
                </label>

                <input
                  type="number"
                  min="0"
                  value={
                    gradeForm.maxCarryForwardDays
                  }
                  onChange={(
                    event
                  ) =>
                    setGradeForm({
                      ...gradeForm,
                      maxCarryForwardDays:
                        Number(
                          event
                            .target
                            .value
                        ),
                    })
                  }
                  className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Description
              </label>

              <input
                value={
                  gradeForm.description
                }
                onChange={(
                  event
                ) =>
                  setGradeForm({
                    ...gradeForm,
                    description:
                      event
                        .target
                        .value,
                  })
                }
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <input
              value={name}
              onChange={(
                event
              ) =>
                setName(
                  event
                    .target
                    .value
                )
              }
              placeholder={
                tab ===
                'designations'
                  ? 'e.g. Data Scientist'
                  : tab ===
                      'departments'
                    ? 'e.g. Research'
                    : 'e.g. Team Lead'
              }
              className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              autoFocus
            />

            {tab ===
              'departments' && (
              <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={
                    saturdayOffValue
                  }
                  onChange={(
                    event
                  ) =>
                    setSaturdayOffValue(
                      event
                        .target
                        .checked
                    )
                  }
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />

                Saturday is a
                day off for this
                department
              </label>
            )}
          </div>
        )}
      </Modal>

      <Modal
        open={message.open}
        onClose={() =>
          setMessage(
            (previous) => ({
              ...previous,
              open: false,
            })
          )
        }
        title={message.title}
        footer={
          <Button
            onClick={() =>
              setMessage(
                (
                  previous
                ) => ({
                  ...previous,
                  open: false,
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
          {message.message}
        </div>
      </Modal>
    </div>
  );
}
