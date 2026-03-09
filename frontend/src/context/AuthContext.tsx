import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { authService } from '../services/api';
import type { AuthTokens, User } from '../types';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const applyAuth = async (_tokens?: AuthTokens) => {
    try {
      const me = await authService.me();
      setUser(me);
    } catch {
      authService.logout();
      setUser(null);
    }
  };

  useEffect(() => {
    const boot = async () => {
      if (!authService.isAuthenticated()) {
        setLoading(false);
        return;
      }
      await applyAuth();
      setLoading(false);
    };
    void boot();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      isAuthenticated: !!user,
      login: async (email, password) => {
        const tokens = await authService.login(email, password);
        await applyAuth(tokens);
      },
      signup: async (email, password) => {
        const tokens = await authService.signup(email, password);
        await applyAuth(tokens);
      },
      logout: () => {
        authService.logout();
        setUser(null);
      },
      refreshUser: async () => {
        await applyAuth();
      },
    }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider.');
  }
  return context;
}
