import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { api } from '../shared/api-client';

interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  timezone: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const data = await api.get<{ user: User }>('/auth/me');
      setUser(data.user);
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    api.setOnUnauthorized(() => setUser(null));
    return () => api.setOnUnauthorized(null);
  }, []);

  useEffect(() => {
    // Restore session via refresh cookie — access token may be missing or expired.
    // The cookie is valid for the 7-day idle window, so this keeps the user logged in.
    refreshUser().finally(() => setIsLoading(false));
  }, [refreshUser]);

  const login = async (email: string, password: string) => {
    const data = await api.post<{ user: User; accessToken: string }>('/auth/login', {
      email,
      password,
    });
    api.setToken(data.accessToken);
    setUser(data.user);
  };

  const register = async (name: string, email: string, password: string) => {
    const data = await api.post<{ user: User; accessToken: string }>('/auth/register', {
      name,
      email,
      password,
    });
    api.setToken(data.accessToken);
    setUser(data.user);
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      api.setToken(null);
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
