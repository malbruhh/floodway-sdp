import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  loginDemo: () => void;
  login: (email: string, name: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('floodway_user');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    // Signing out sticks across a reload; a first visit still opens as the demo user for instant reviewer access.
    if (localStorage.getItem('floodway_signed_out') === '1') return null;
    return {
      id: 'usr-01',
      name: 'Luqman Nurhakim',
      email: 'luqman@floodway.my',
      phone: '+60 12-345 6789',
      isDemo: true
    };
  });

  const [loading, setLoading] = useState(false);

  const loginDemo = () => {
    const demoUser: User = {
      id: 'usr-01',
      name: 'Luqman Nurhakim',
      email: 'luqman@floodway.my',
      phone: '+60 12-345 6789',
      isDemo: true
    };
    setUser(demoUser);
    localStorage.removeItem('floodway_signed_out');
    localStorage.setItem('floodway_user', JSON.stringify(demoUser));
  };

  const login = (email: string, name: string) => {
    const u: User = {
      id: `usr-${Date.now()}`,
      name: name || 'Resident',
      email,
      phone: '+60 11-234 5678',
      isDemo: false
    };
    setUser(u);
    localStorage.removeItem('floodway_signed_out');
    localStorage.setItem('floodway_user', JSON.stringify(u));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('floodway_user');
    localStorage.setItem('floodway_signed_out', '1');
  };

  return (
    <AuthContext.Provider value={{ user, loading, loginDemo, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
