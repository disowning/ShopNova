import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { getSessionUser, logout as logoutService, refreshSessionUser, type AuthUser } from '../lib/authService';

interface AuthState {
  user: AuthUser | null;
  setUser: (u: AuthUser | null) => void;
  logout: () => void;
  isAdmin: boolean;
  isLoggedIn: boolean;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<AuthUser | null>(() => getSessionUser());

  useEffect(() => {
    let active = true;
    refreshSessionUser()
      .then((sessionUser) => {
        if (active) setUserState(sessionUser);
      })
      .catch(() => {
        if (active) setUserState(getSessionUser());
      });
    return () => {
      active = false;
    };
  }, []);

  const setUser = useCallback((u: AuthUser | null) => {
    setUserState(u);
  }, []);

  const logout = useCallback(() => {
    logoutService();
    setUserState(null);
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      setUser,
      logout,
      isAdmin: user?.role === 'admin',
      isLoggedIn: user !== null,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
