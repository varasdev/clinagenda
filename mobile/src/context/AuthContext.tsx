import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authStorage, authApi } from '@/services/api';
import { AppNavigation } from '@/navigation/types';

interface User {
  id: string;
  nome: string;
  email: string;
  perfil: string;
  pacienteId?: string;
  profissionalId?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, senha: string) => Promise<void>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<void>;
  navigationRef: React.RefObject<AppNavigation> | null;
  setNavigationRef: (ref: React.RefObject<AppNavigation>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [navigationRef, setNavigationRefState] = useState<React.RefObject<AppNavigation> | null>(null);

  const restoreSession = async () => {
    try {
      const savedToken = await authStorage.getToken();
      const savedUser = await authStorage.getUser();

      if (savedToken && savedUser) {
        setToken(savedToken);
        setUser(savedUser);
        // Optionally validate token with /auth/me
        try {
          const { usuario } = await authApi.me();
          setUser(usuario);
          await authStorage.saveUser(usuario);
        } catch {
          // Token invalid, clear storage
          await authStorage.clear();
          setToken(null);
          setUser(null);
        }
      }
    } catch (error) {
      console.error('Erro ao restaurar sessão:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, senha: string) => {
    const { token: newToken, usuario } = await authApi.login(email, senha);
    await authStorage.saveToken(newToken);
    await authStorage.saveUser(usuario);
    setToken(newToken);
    setUser(usuario);

    // Navigate to main tabs
    if (navigationRef?.current) {
      navigationRef.current.reset({
        index: 0,
        routes: [{ name: 'Main' }],
      });
    }
  };

  const logout = async () => {
    await authStorage.clear();
    setToken(null);
    setUser(null);

    if (navigationRef?.current) {
      navigationRef.current.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    }
  };

  useEffect(() => {
    restoreSession();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        logout,
        restoreSession,
        navigationRef,
        setNavigationRef: setNavigationRefState,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider');
  }
  return context;
};