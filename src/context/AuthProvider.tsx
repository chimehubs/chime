import React, { createContext, useContext, useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { setCredentials, clearCredentials } from '../store/slices/authSlice';
import { UserProfile } from '../types';
import { onAuthStateChangeSupabase, signOutFromSupabase } from '../services/supabaseAuthService';
import { supabaseDbService } from '../services/supabaseDbService';

type AuthContextValue = {
  isAuthenticated: boolean;
  user?: UserProfile | null;
  login: (token: string, user: UserProfile) => void;
  updateUser: (updates: Partial<UserProfile>) => void;
  logout: () => void;
  isLoading: boolean;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const dispatch = useDispatch();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Listen to Supabase auth state changes
    const unsubscribe = onAuthStateChangeSupabase(async (session) => {
      try {
        if (session?.user) {
          // User is authenticated in Supabase
          setIsAuthenticated(true);
          
          // Fetch full user profile from Supabase database
          let userProfile = await supabaseDbService.getProfile(session.user.id);
          if (!userProfile) {
            userProfile = {
              id: session.user.id,
              email: session.user.email || '',
              name: session.user.user_metadata?.name || 'User',
              status: 'UNREGISTERED',
              role: 'user',
            } as any;
          }

          const mappedUser: UserProfile = {
            id: session.user.id,
            email: session.user.email || userProfile?.email || '',
            name: userProfile?.name || 'User',
            role: (userProfile?.role as any) || 'user',
            status: (userProfile?.status as any) || 'UNREGISTERED',
            currency: userProfile?.currency || 'USD',
            avatar: userProfile?.avatar_url || undefined,
            preferences: userProfile?.preferences || {},
            accountNumber: (userProfile as any)?.account_number,
            createdAt: userProfile?.created_at || undefined,
            updatedAt: userProfile?.updated_at || undefined,
          };

          setUser(mappedUser);
          dispatch(setCredentials({
            token: session.access_token,
            user: mappedUser,
          }));
        } else {
          // User is logged out
          setIsAuthenticated(false);
          setUser(null);
          dispatch(clearCredentials());
        }
      } catch (error) {
        console.error('Error processing auth state change:', error);
        setIsAuthenticated(false);
        setUser(null);
        dispatch(clearCredentials());
      } finally {
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, [dispatch]);

  const login = (token: string, user: UserProfile) => {
    // This method is kept for backward compatibility
    // When called, it updates the local state
    // In production, use signUpWithSupabase/signInWithSupabase instead
    setIsAuthenticated(true);
    setUser(user);
    dispatch(setCredentials({ token, user }));
  };

  const updateUser = (updates: Partial<UserProfile>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...updates };
      dispatch(setCredentials({ token: '', user: next }));
      return next;
    });
  };

  const logout = async () => {
    try {
      // Sign out from Supabase
      await signOutFromSupabase();
      
      // Clear local state
      setIsAuthenticated(false);
      setUser(null);
      dispatch(clearCredentials());
      
    } catch (error) {
      console.error('Error during logout:', error);
      // Still clear local state even if Supabase logout fails
      setIsAuthenticated(false);
      setUser(null);
      dispatch(clearCredentials());
    }
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, updateUser, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};


