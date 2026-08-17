import axios, {
  AxiosError,
  InternalAxiosRequestConfig,
} from 'axios';

const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const getAccessToken = (): string | null => {
  return localStorage.getItem('accessToken');
};

export const setAccessToken = (token: string): void => {
  localStorage.setItem('accessToken', token);
};

export const removeAccessToken = (): void => {
  localStorage.removeItem('accessToken');
};

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getAccessToken();

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      removeAccessToken();
    }

    return Promise.reject(error);
  }
);

export function getApiErrorMessage(
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

export default api;