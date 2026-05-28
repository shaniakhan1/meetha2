import { useCallback, useEffect, useState } from "react";
import { useLocation } from "wouter";

export type AuthUser = {
  id: number;
  openId: string;
  name: string | null;
  email: string | null;
  loginMethod: string | null;
  role: "user" | "admin";
  createdAt: string;
  updatedAt: string;
  lastSignedIn: string;
};

type AuthState = {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
};

let _cachedUser: AuthUser | null = null;
let _fetched = false;

/** Exported so AuthCallback can bust the cache after a fresh login. */
export function _resetCache() {
  _cachedUser = null;
  _fetched = false;
}

export function useAuth(options?: { requireAuth?: boolean }) {
  const [, navigate] = useLocation();
  const [state, setState] = useState<AuthState>({
    user: _cachedUser,
    loading: !_fetched,
    error: null,
    isAuthenticated: _cachedUser !== null,
  });

  useEffect(() => {
    if (_fetched) {
      setState({
        user: _cachedUser,
        loading: false,
        error: null,
        isAuthenticated: _cachedUser !== null,
      });
      return;
    }

    let cancelled = false;

    const fetchUser = async () => {
      try {
        const res = await fetch("/api/auth/me", { credentials: "include" });
        if (cancelled) return;

        if (res.status === 401) {
          _cachedUser = null;
          _fetched = true;
          setState({ user: null, loading: false, error: null, isAuthenticated: false });
          return;
        }

        const data = await res.json();
        _cachedUser = data.user ?? null;
        _fetched = true;
        setState({
          user: _cachedUser,
          loading: false,
          error: null,
          isAuthenticated: _cachedUser !== null,
        });
      } catch {
        if (cancelled) return;
        _fetched = true;
        setState({ user: null, loading: false, error: "Failed to load session", isAuthenticated: false });
      }
    };

    fetchUser();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!state.loading && options?.requireAuth && !state.isAuthenticated) {
      navigate("/sign-in");
    }
  }, [state.loading, state.isAuthenticated, options?.requireAuth, navigate]);

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } finally {
      _cachedUser = null;
      _fetched = false;
      setState({ user: null, loading: false, error: null, isAuthenticated: false });
      navigate("/");
    }
  }, [navigate]);

  return {
    user: state.user,
    loading: state.loading,
    error: state.error,
    isAuthenticated: state.isAuthenticated,
    logout,
    /** Force a re-fetch of /api/auth/me on next render cycle. */
    refresh: () => { _fetched = false; },
  };
}
