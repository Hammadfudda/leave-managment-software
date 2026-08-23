import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

import type { User } from '../types';

import api, {
  getAccessToken,
  getApiErrorMessage,
  removeAccessToken,
  setAccessToken,
} from '../services/api';

interface LoginResult {
  success: boolean;
  error?: string;
}

interface GradeObject {
  _id?: string;
  name?: string;
  gradeName?: string;
  title?: string;
  code?: string;
}

interface BackendUser {
  _id: string;
  fullName: string;
  email: string;
  role: 'admin' | 'manager' | 'employee';

  employeeId?: string;
  designation?: string;

  gradeId?: string | GradeObject;
  grade?: string | GradeObject;
  gradeName?: string;

  department?: string;
  dateOfJoining?: string;

  cnic?: string;
  nationalId?: string;
  phone?: string;

  status?: 'active' | 'inactive';
  managerId?: string | null;
  canApproveOtherDepartments?: boolean;
  profilePhotoUrl?: string;
}

interface LoginResponse {
  success: boolean;
  accessToken: string;
  user: BackendUser;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;

  login: (
    email: string,
    password: string
  ) => Promise<LoginResult>;

  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function getGradeName(backendUser: BackendUser): string {
  const gradeId = backendUser.gradeId;
  const grade = backendUser.grade;

  if (gradeId && typeof gradeId === 'object') {
    return (
      gradeId.name ||
      gradeId.gradeName ||
      gradeId.title ||
      gradeId.code ||
      ''
    );
  }

  if (grade && typeof grade === 'object') {
    return (
      grade.name ||
      grade.gradeName ||
      grade.title ||
      grade.code ||
      ''
    );
  }

  if (typeof grade === 'string' && grade.trim()) {
    return grade.trim();
  }

  if (backendUser.gradeName?.trim()) {
    return backendUser.gradeName.trim();
  }

  return '';
}

function mapBackendUser(backendUser: BackendUser): User {
  const grade = getGradeName(backendUser);

  return {
    id: backendUser._id,
    employeeId: backendUser.employeeId || '',
    fullName: backendUser.fullName,
    email: backendUser.email,
    role: backendUser.role,
    designation: backendUser.designation || '',
    grade,
    department: backendUser.department || '',
    dateOfJoining: backendUser.dateOfJoining || '',
    cnic: backendUser.cnic || backendUser.nationalId || '',
    phone: backendUser.phone || '',
    status: backendUser.status || 'active',
    managerId: backendUser.managerId || undefined,
    canApproveOtherDepartments:
      backendUser.canApproveOtherDepartments ?? false,
    profilePhotoUrl: backendUser.profilePhotoUrl,
  };
}

export function AuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getAccessToken();

    if (!token) {
      setLoading(false);
      return;
    }

    const storedUser = localStorage.getItem('authUser');

    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser) as User;
        setUser(parsedUser);
      } catch {
        localStorage.removeItem('authUser');
        removeAccessToken();
      }
    }

    setLoading(false);
  }, []);

  const login = async (
    email: string,
    password: string
  ): Promise<LoginResult> => {
    try {
      const response = await api.post<LoginResponse>('/auth/login', {
        email: email.trim(),
        password,
      });

      if (
        !response.data.success ||
        !response.data.accessToken ||
        !response.data.user
      ) {
        return {
          success: false,
          error: 'Login failed.',
        };
      }

      const mappedUser = mapBackendUser(response.data.user);

      setAccessToken(response.data.accessToken);

      localStorage.setItem('authUser', JSON.stringify(mappedUser));

      setUser(mappedUser);

      return {
        success: true,
      };
    } catch (error) {
      removeAccessToken();
      localStorage.removeItem('authUser');
      setUser(null);

      return {
        success: false,
        error: getApiErrorMessage(
          error,
          'Invalid email or password.'
        ),
      };
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Even if backend logout fails, local authentication must be cleared.
    } finally {
      removeAccessToken();
      localStorage.removeItem('authUser');
      setUser(null);
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: Boolean(user),
    loading,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);

  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return ctx;
}
