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
  role:
    | 'admin'
    | 'manager'
    | 'employee';

  employeeId?: string;
  designation?: string;

  gradeId?:
    | string
    | GradeObject;

  grade?:
    | string
    | GradeObject;

  gradeName?: string;

  department?: string;
  dateOfJoining?: string;

  cnic?: string;
  nationalId?: string;

  phone?: string;

  status?:
    | 'active'
    | 'inactive';

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

const AuthContext =
  createContext<
    AuthContextType | undefined
  >(undefined);

function getGradeName(
  backendUser: BackendUser
): string {
  if (
    backendUser.gradeId &&
    typeof backendUser.gradeId ===
      'object'
  ) {
    return (
      backendUser.gradeId.name ||
      backendUser.gradeId
        .gradeName ||
      backendUser.gradeId.title ||
      backendUser.gradeId.code ||
      ''
    );
  }

  if (
    backendUser.grade &&
    typeof backendUser.grade ===
      'object'
  ) {
    return (
      backendUser.grade.name ||
      backendUser.grade
        .gradeName ||
      backendUser.grade.title ||
      backendUser.grade.code ||
      ''
    );
  }

  if (
    typeof backendUser.grade ===
      'string' &&
    backendUser.grade.trim()
  ) {
    return backendUser.grade.trim();
  }

  return (
    backendUser.gradeName?.trim() ||
    ''
  );
}

function mapBackendUser(
  backendUser: BackendUser
): User {
  return {
    id: backendUser._id,

    employeeId:
      backendUser.employeeId || '',

    fullName:
      backendUser.fullName,

    email:
      backendUser.email,

    role:
      backendUser.role,

    designation:
      backendUser.designation || '',

    grade:
      getGradeName(
        backendUser
      ),

    department:
      backendUser.department || '',

    dateOfJoining:
      backendUser.dateOfJoining || '',

    cnic:
      backendUser.cnic ||
      backendUser.nationalId ||
      '',

    phone:
      backendUser.phone || '',

    status:
      backendUser.status ||
      'active',

    managerId:
      backendUser.managerId ||
      undefined,

    canApproveOtherDepartments:
      backendUser
        .canApproveOtherDepartments ??
      false,

    profilePhotoUrl:
      backendUser.profilePhotoUrl,
  };
}

export function AuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [user, setUser] =
    useState<User | null>(null);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    const restoreSession =
      async () => {
        const token =
          getAccessToken();

        if (!token) {
          setLoading(false);
          return;
        }

        /*
         * First restore cached user so
         * the UI can render immediately.
         */
        const storedUser =
          localStorage.getItem(
            'authUser'
          );

        if (storedUser) {
          try {
            setUser(
              JSON.parse(
                storedUser
              ) as User
            );
          } catch {
            localStorage.removeItem(
              'authUser'
            );
          }
        }

        /*
         * Then refresh the current user
         * from the real backend.
         *
         * /employees/me populates gradeId,
         * so grade name stays correct after
         * login and after page refresh.
         */
        try {
          const response =
            await api.get(
              '/employees/me'
            );

          const backendUser =
            response.data
              ?.data as BackendUser;

          if (
            backendUser?._id
          ) {
            const mappedUser =
              mapBackendUser(
                backendUser
              );

            localStorage.setItem(
              'authUser',
              JSON.stringify(
                mappedUser
              )
            );

            setUser(
              mappedUser
            );
          }
        } catch {
          /*
           * Keep the cached user if the
           * profile refresh fails.
           */
        } finally {
          setLoading(false);
        }
      };

    restoreSession();
  }, []);

  const login = async (
    email: string,
    password: string
  ): Promise<LoginResult> => {
    try {
      const response =
        await api.post<LoginResponse>(
          '/auth/login',
          {
            email:
              email.trim(),
            password,
          }
        );

      if (
        !response.data.success ||
        !response.data.accessToken ||
        !response.data.user
      ) {
        return {
          success: false,
          error:
            'Login failed.',
        };
      }

      setAccessToken(
        response.data.accessToken
      );

      /*
       * The login response may contain only
       * a raw gradeId. After storing the token,
       * call /employees/me because that endpoint
       * returns populated grade data.
       */
      let mappedUser =
        mapBackendUser(
          response.data.user
        );

      try {
        const meResponse =
          await api.get(
            '/employees/me'
          );

        if (
          meResponse.data
            ?.data?._id
        ) {
          mappedUser =
            mapBackendUser(
              meResponse.data
                .data
            );
        }
      } catch {
        /*
         * Login should still succeed even if
         * the profile refresh temporarily fails.
         */
      }

      localStorage.setItem(
        'authUser',
        JSON.stringify(
          mappedUser
        )
      );

      setUser(mappedUser);

      return {
        success: true,
      };
    } catch (error) {
      removeAccessToken();

      localStorage.removeItem(
        'authUser'
      );

      setUser(null);

      return {
        success: false,
        error:
          getApiErrorMessage(
            error,
            'Invalid email or password.'
          ),
      };
    }
  };

  const logout =
    async (): Promise<void> => {
      try {
        await api.post(
          '/auth/logout'
        );
      } catch {
        // Always clear local auth.
      } finally {
        removeAccessToken();

        localStorage.removeItem(
          'authUser'
        );

        setUser(null);
      }
    };

  const value: AuthContextType =
    {
      user,
      isAuthenticated:
        Boolean(user),
      loading,
      login,
      logout,
    };

  return (
    <AuthContext.Provider
      value={value}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx =
    useContext(AuthContext);

  if (!ctx) {
    throw new Error(
      'useAuth must be used within AuthProvider'
    );
  }

  return ctx;
}
