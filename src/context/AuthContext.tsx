import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import type { JudgeIdentity, UserProfile } from '../types';
import {
  getCurrentSession,
  subscribeToAuthChanges,
  ensureUserProfile,
  checkIsActiveAdmin,
  checkIsActiveJudge,
  signInWithGoogle as googleSignIn,
  signOutSession,
} from '../services/authService';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  isAdmin: boolean;
  judge: JudgeIdentity | null;
  isLoading: boolean;
  signInWithGoogle: () => Promise<{ error: string | null }>;
  signOut: () => Promise<boolean>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  profile: null,
  isAdmin: false,
  judge: null,
  isLoading: true,
  signInWithGoogle: async () => ({ error: 'AuthContext not initialized' }),
  signOut: async () => true,
  refreshAuth: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [judge, setJudge] = useState<JudgeIdentity | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadUserData = useCallback(async (currentSession: Session | null) => {
    if (!currentSession?.user) {
      setUser(null);
      setSession(null);
      setProfile(null);
      setIsAdmin(false);
      setJudge(null);
      setIsLoading(false);
      return;
    }

    const currentUser = currentSession.user;
    setUser(currentUser);
    setSession(currentSession);

    // Parallelize role & profile checks for optimal performance
    const [userProfile, adminStatus, judgeIdentity] = await Promise.all([
      ensureUserProfile(currentUser),
      checkIsActiveAdmin(currentUser.id),
      checkIsActiveJudge(currentUser.id),
    ]);

    setProfile(userProfile);
    setIsAdmin(adminStatus);
    setJudge(judgeIdentity);
    setIsLoading(false);
  }, []);

  const refreshAuth = useCallback(async () => {
    setIsLoading(true);
    const activeSession = await getCurrentSession();
    await loadUserData(activeSession);
  }, [loadUserData]);

  useEffect(() => {
    let isMounted = true;

    // Initial session load
    getCurrentSession().then((activeSession) => {
      if (isMounted) {
        loadUserData(activeSession);
      }
    });

    // Subscribe to session state changes (e.g. OAuth callback completion, token refresh, logout)
    const unsubscribe = subscribeToAuthChanges((newSession) => {
      if (isMounted) {
        loadUserData(newSession);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [loadUserData]);

  const signInWithGoogle = async (): Promise<{ error: string | null }> => {
    return googleSignIn();
  };

  const signOut = async (): Promise<boolean> => {
    const success = await signOutSession();
    if (success) {
      setUser(null);
      setSession(null);
      setProfile(null);
      setIsAdmin(false);
      setJudge(null);
    }
    return success;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        isAdmin,
        judge,
        isLoading,
        signInWithGoogle,
        signOut,
        refreshAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => useContext(AuthContext);
