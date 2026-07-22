import { createContext, useContext, useState, type ReactNode } from 'react';
import type { User } from '../types';
import { loginCredentials } from '../data/mockData';
import { useAppData } from './AppDataContext';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => { success: boolean; error?: string };
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { users } = useAppData();
  const [user, setUser] = useState<User | null>(null);

  const login = (email: string, password: string) => {
    const cred = loginCredentials[email.toLowerCase()];
    if (!cred || cred.password !== password) {
      return { success: false, error: 'Invalid email or password' };
    }
    const foundUser = users.find((u) => u.id === cred.userId);
    if (!foundUser) return { success: false, error: 'User not found' };
    if (foundUser.status === 'inactive') return { success: false, error: 'Account deactivated' };
    setUser(foundUser);
    return { success: true };
  };

  const logout = () => setUser(null);

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
