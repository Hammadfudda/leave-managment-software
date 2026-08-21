import axios, {
  AxiosError,
  InternalAxiosRequestConfig,
} from 'axios';

const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const TOKEN_KEY = 'superAdminAccessToken';

const superAdminApi = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const getSuperAdminToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY);
};

export const setSuperAdminToken = (token: string): void => {
  localStorage.setItem(TOKEN_KEY, token);
};

export const clearSuperAdminToken = (): void => {
  localStorage.removeItem(TOKEN_KEY);
};

superAdminApi.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getSuperAdminToken();

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

superAdminApi.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => Promise.reject(error)
);

export function getSuperAdminError(
  error: unknown,
  fallback = 'Something went wrong.'
): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as
      | { message?: string; error?: string }
      | undefined;

    return data?.message || data?.error || error.message || fallback;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}

export default superAdminApi;
