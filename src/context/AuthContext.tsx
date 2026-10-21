import React, { createContext, useContext, useState, useEffect } from 'react';
import { AuthUser, RoleCode, StorageStatsData } from '../types/client.js';
import { apiFetch, getStoredToken, setStoredToken } from '../lib/api.js';

interface AuthContextType {
  user: AuthUser | null;
  activeRole: RoleCode | null;
  isLoading: boolean;
  storageStats: StorageStatsData | null;
  login: (identifier: string, pass: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  setActiveRole: (role: RoleCode) => void;
  refreshStorageStats: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [activeRole, setActiveRoleState] = useState<RoleCode | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [storageStats, setStorageStats] = useState<StorageStatsData | null>(null);

  const fetchCurrentUser = async () => {
    const token = getStoredToken();
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      const userData: AuthUser = await apiFetch('/auth/me');
      setUser(userData);
      const defaultRole = userData.roles[0] || 'MAHASISWA';
      setActiveRoleState(defaultRole);
    } catch {
      setStoredToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshStorageStats = async () => {
    try {
      const stats = await apiFetch('/storage/stats');
      setStorageStats(stats);
    } catch {
      // Storage stats endpoint may be restricted to admin; fallback to health check
      try {
        const health = await fetch('/api/health').then(r => r.json());
        if (health?.storage) {
          setStorageStats(health.storage);
        }
      } catch {}
    }
  };

  useEffect(() => {
    fetchCurrentUser();
    refreshStorageStats();
    const interval = setInterval(refreshStorageStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const login = async (identifier: string, pass: string): Promise<AuthUser> => {
    const res = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password: pass }),
    });

    const token = res.token;
    const userData = res.user;
    setStoredToken(token);
    setUser(userData);
    const primaryRole = userData.roles[0] || 'MAHASISWA';
    setActiveRoleState(primaryRole);
    await refreshStorageStats();
    return userData;
  };

  const logout = async () => {
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
    } catch {}
    setStoredToken(null);
    setUser(null);
    setActiveRoleState(null);
  };

  const setActiveRole = (role: RoleCode) => {
    if (user?.roles.includes(role)) {
      setActiveRoleState(role);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        activeRole,
        isLoading,
        storageStats,
        login,
        logout,
        setActiveRole,
        refreshStorageStats,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
