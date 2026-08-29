import api from './api';

export interface OrganizationSettings {
  leaveYearStartDay: number;
  leaveYearStartMonth: number;
  leaveYearStart: string;
}

export async function getOrganizationSettings():
Promise<OrganizationSettings> {
  const response = await api.get(
    '/organization-settings'
  );

  return response.data.data;
}

export async function updateOrganizationSettings(
  leaveYearStartDay: number,
  leaveYearStartMonth: number
): Promise<OrganizationSettings> {
  const response = await api.patch(
    '/organization-settings',
    {
      leaveYearStartDay,
      leaveYearStartMonth,
    }
  );

  return response.data.data;
}
