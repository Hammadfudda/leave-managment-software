import api from './api';

export interface YearlyLeaveSnapshot {
  leaveYear: number;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  division: string;
  department: string;
  designation: string;
  grade: string;
  leaveType: string;
  granted: number;
  used: number;
  remaining: number;
  employeeStatus?: string;
  detailsStatus?: string;
}

export async function getYearlyLeaveReport(
  year: number
): Promise<YearlyLeaveSnapshot[]> {
  const response =
    await api.get(
      '/audit-logs/yearly',
      {
        params: {
          year,
        },
        timeout:
          30000,
      }
    );

  return response.data?.data || [];
}

export async function exportYearlyLeaveReport(
  year: number
) {
  const response =
    await api.get(
      '/audit-logs/yearly/export.csv',
      {
        params: {
          year,
        },
        responseType:
          'blob',
        timeout:
          30000,
      }
    );

  const blob =
    new Blob(
      [
        response.data,
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
    `yearly-leave-report-${year}.csv`;

  document.body.appendChild(
    link
  );

  link.click();
  link.remove();

  window.URL.revokeObjectURL(
    url
  );
}
