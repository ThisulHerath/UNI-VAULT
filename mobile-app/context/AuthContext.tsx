import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';

interface User {
  _id: string;
  name: string;
  email: string;
  avatar: string | null;
  role: string;
  university: string | null;
  batch: string | null;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: object) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (userData: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser]         = useState<User | null>(null);
  const [token, setToken]       = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load persisted session on app launch
  useEffect(() => {
    const loadSession = async () => {
      try {
        const [storedToken, storedUser] = await Promise.all([
          authService.getStoredToken(),
          authService.getStoredUser(),
        ]);
        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(storedUser);
        }
      } catch (e) {
        console.warn('Session load failed:', e);
      } finally {
        setIsLoading(false);
      }
    };
    loadSession();
  }, []);

  const login = async (email: string, password: string) => {
    const data = await authService.login({ email, password });
    setToken(data.token);
    setUser(data.data);
  };

  const register = async (formData: object) => {
    const data = await authService.register(formData as any);
    setToken(data.token);
    setUser(data.data);
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
    setToken(null);
  };

  const updateUser = (userData: User) => {
    setUser(userData);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!token,
        login,
        register,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
};
