import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseClientConfigured } from '../services/supabase';
import { 
  getAuthToken, 
  setAuthToken, 
  authLogin, 
  authRegister, 
  authLogout, 
  authGetMe, 
  authUpdateProfile, 
  authChangePassword, 
  authForgotPassword, 
  authDeleteAccount 
} from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [token, setToken] = useState(getAuthToken());
  const [usage, setUsage] = useState({
    totalChatbots: 0,
    totalKnowledgeSources: 0,
    totalConversations: 0,
    totalMessages: 0,
    planTier: 'free'
  });
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Refreshes user profile and tenant usage metrics from backend
   */
  const refreshProfile = useCallback(async (activeToken = null) => {
    const t = activeToken || token || getAuthToken();
    if (!t) {
      setUser(null);
      setProfile(null);
      setIsLoading(false);
      return;
    }

    try {
      const data = await authGetMe(t);
      if (data && data.profile) {
        setProfile(data.profile);
        setUser({
          id: data.profile.id,
          email: data.profile.email,
          full_name: data.profile.full_name,
          business_name: data.profile.business_name,
          plan_tier: data.profile.plan_tier || 'free',
          created_at: data.profile.created_at
        });
        if (data.usage) {
          setUsage(data.usage);
        }
      }
    } catch (err) {
      console.warn('Session invalid or expired:', err.message);
      // Clean up invalid session
      setAuthToken(null);
      setToken(null);
      setUser(null);
      setProfile(null);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  // Initial load: check for stored token or Supabase session
  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      // 1. If Supabase client is configured, check its session
      if (isSupabaseClientConfigured() && supabase) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session && session.access_token) {
            setAuthToken(session.access_token);
            setToken(session.access_token);
            if (mounted) await refreshProfile(session.access_token);
            return;
          }
        } catch (sbErr) {
          console.warn('Supabase session fetch warning:', sbErr.message);
        }
      }

      // 2. Check local stored token
      const stored = getAuthToken();
      if (stored) {
        setToken(stored);
        if (mounted) await refreshProfile(stored);
      } else {
        if (mounted) setIsLoading(false);
      }
    }

    initAuth();

    // Listen to Supabase auth state changes if configured
    let subscription = null;
    if (isSupabaseClientConfigured() && supabase) {
      const { data } = supabase.auth.onAuthStateChange(async (_event, session) => {
        if (session && session.access_token) {
          setAuthToken(session.access_token);
          setToken(session.access_token);
          await refreshProfile(session.access_token);
        } else if (_event === 'SIGNED_OUT') {
          setAuthToken(null);
          setToken(null);
          setUser(null);
          setProfile(null);
        }
      });
      subscription = data.subscription;
    }

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, [refreshProfile]);

  /**
   * Log in user
   */
  const login = async (email, password) => {
    setIsLoading(true);
    try {
      // If Supabase client configured, try it first
      if (isSupabaseClientConfigured() && supabase) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (data.session) {
          setAuthToken(data.session.access_token);
          setToken(data.session.access_token);
          await refreshProfile(data.session.access_token);
          return { success: true, user: data.user };
        }
      }

      // Backend API auth
      const res = await authLogin({ email, password });
      setAuthToken(res.token);
      setToken(res.token);
      setUser(res.user);
      setProfile(res.user);
      await refreshProfile(res.token);
      return { success: true, user: res.user };
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Register new user
   */
  const register = async ({ email, password, fullName, businessName }) => {
    setIsLoading(true);
    try {
      if (isSupabaseClientConfigured() && supabase) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              business_name: businessName
            }
          }
        });
        if (error) throw error;
        if (data.session) {
          setAuthToken(data.session.access_token);
          setToken(data.session.access_token);
          await refreshProfile(data.session.access_token);
          return { success: true, user: data.user };
        }
      }

      const res = await authRegister({ email, password, fullName, businessName });
      setAuthToken(res.token);
      setToken(res.token);
      setUser(res.user);
      setProfile(res.user);
      await refreshProfile(res.token);
      return { success: true, user: res.user, emailConfirmationRequired: res.emailConfirmationRequired };
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Logout user
   */
  const logout = async () => {
    try {
      if (isSupabaseClientConfigured() && supabase) {
        await supabase.auth.signOut();
      }
      await authLogout(token);
    } catch (err) {
      console.warn('Logout error:', err.message);
    } finally {
      setAuthToken(null);
      setToken(null);
      setUser(null);
      setProfile(null);
      setUsage({
        totalChatbots: 0,
        totalKnowledgeSources: 0,
        totalConversations: 0,
        totalMessages: 0,
        planTier: 'free'
      });
    }
  };

  /**
   * Updates user profile
   */
  const updateProfile = async ({ fullName, businessName }) => {
    const updated = await authUpdateProfile({ fullName, businessName }, token);
    await refreshProfile();
    return updated;
  };

  /**
   * Changes password
   */
  const changePassword = async (newPassword) => {
    if (isSupabaseClientConfigured() && supabase) {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
    }
    return await authChangePassword(newPassword, token);
  };

  /**
   * Forgot password dispatch
   */
  const forgotPassword = async (email) => {
    if (isSupabaseClientConfigured() && supabase) {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
      return { sent: true };
    }
    return await authForgotPassword(email);
  };

  /**
   * Delete account permanently
   */
  const deleteAccount = async () => {
    const res = await authDeleteAccount(token);
    setAuthToken(null);
    setToken(null);
    setUser(null);
    setProfile(null);
    return res;
  };

  const value = {
    user,
    profile,
    token,
    usage,
    isAuthenticated: Boolean(user && token),
    isLoading,
    login,
    register,
    logout,
    updateProfile,
    changePassword,
    forgotPassword,
    deleteAccount,
    refreshProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
