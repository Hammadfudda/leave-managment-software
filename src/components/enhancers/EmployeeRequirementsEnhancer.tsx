import {
  useEffect,
  useState,
} from 'react';

import { createPortal } from 'react-dom';

import {
  getOrganizationSettings,
} from '../../services/organizationSettings';

export default function EmployeeRequirementsEnhancer() {
  const [leaveYearStart, setLeaveYearStart] =
    useState('');

  const [mount, setMount] =
    useState<HTMLElement | null>(null);

  useEffect(() => {
    void getOrganizationSettings()
      .then((settings) => {
        setLeaveYearStart(
          settings.leaveYearStart
        );
      })
      .catch(() => {
        setLeaveYearStart('');
      });
  }, []);

  useEffect(() => {
    if (
      window.location.pathname !==
      '/employees'
    ) {
      return;
    }

    let inserted: HTMLDivElement | null =
      null;

    const enhance = () => {
      const candidates = Array.from(
        document.querySelectorAll(
          'th,label,p,input'
        )
      );

      for (const element of candidates) {
        const text =
          element.textContent?.trim();

        if (
          element instanceof HTMLInputElement &&
          element.placeholder?.includes(
            'role'
          )
        ) {
          element.placeholder =
            element.placeholder.replace(
              /role/gi,
              'division'
            );
        }

        if (
          element.childElementCount === 0 &&
          text === 'Role'
        ) {
          element.textContent =
            'Division';
        }

        if (
          element.childElementCount === 0 &&
          text ===
            'Role, Grade, Designation and Department'
        ) {
          element.textContent =
            'Division, Grade, Designation and Department';
        }
      }

      const roleSelect =
        Array.from(
          document.querySelectorAll(
            'select'
          )
        ).find((select) =>
          Array.from(select.options).some(
            (option) =>
              option.text ===
              'Select role'
          )
        );

      if (roleSelect) {
        const first =
          roleSelect.options[0];

        if (
          first &&
          first.value === ''
        ) {
          first.text =
            'Select division';
        }
      }

      if (
        inserted?.isConnected ||
        !leaveYearStart
      ) {
        return;
      }

      const joiningInput =
        document.querySelector(
          'input[type="date"]'
        );

      const field =
        joiningInput?.parentElement;

      const grid =
        field?.parentElement;

      if (!grid) {
        return;
      }

      inserted =
        document.createElement('div');

      inserted.setAttribute(
        'data-leave-year-start',
        'true'
      );

      grid.insertBefore(
        inserted,
        field?.nextSibling || null
      );

      setMount(inserted);
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
      inserted?.remove();
      setMount(null);
    };
  }, [leaveYearStart]);

  if (
    !mount ||
    !leaveYearStart
  ) {
    return null;
  }

  return createPortal(
    <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2">
      <p className="text-xs font-medium text-blue-900">
        Leave Year Start
      </p>

      <p className="mt-1 text-sm text-blue-800">
        {leaveYearStart}
      </p>

      <p className="mt-1 text-xs text-blue-700">
        Used automatically with Date of Joining for floor-rounded pro-rating.
      </p>
    </div>,
    mount
  );
}
