import { useState, useEffect, useCallback, useMemo } from "react";
import { AuthContext } from "./authContextInstance.js";
import {
  login as apiLogin,
  register as apiRegister,
  getCurrentUser as apiGetCurrentUser,
  logout as apiLogout,
  isBackendAuthAvailable,
} from "../services/authService.js";
import {
  setAuthToken,
  getAuthToken,
  clearAuthToken,
  setUnauthorizedHandler,
} from "../services/api.js";
import { ROLES } from "../constants/roles.js";

/**
 * React context provider for ParkEase authentication and role-based authorization state.
 * Adapts to either Bearer tokens or HTTP-only cookies without assuming hardcoded localStorage.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => getAuthToken());
  const [isLoading, setIsLoading] = useState(() => Boolean(isBackendAuthAvailable() && getAuthToken()));
  const [error, setError] = useState(null);

  /**
   * Complete logout: cleans up active token and resets in-memory session.
   * Safely handles unconfirmed backend logout endpoints.
   */
  const logout = useCallback(async () => {
    try {
      await apiLogout();
    } catch {
      // Ignore network errors on logout
    } finally {
      clearAuthToken();
      setUser(null);
      setToken(null);
      setError(null);
    }
  }, []);

  /**
   * Registers global 401 Unauthorized interceptor to trigger automated logout and cleanup.
   */
  useEffect(() => {
    setUnauthorizedHandler(() => {
      clearAuthToken();
      setUser(null);
      setToken(null);
    });

    return () => {
      setUnauthorizedHandler(null);
    };
  }, []);

  /**
   * Mount hook: session verification.
   * Only calls getCurrentUser if backend authentication is confirmed ready and an active token exists.
   * Does NOT call unconfirmed endpoints.
   */
  useEffect(() => {
    if (!isBackendAuthAvailable()) {
      return;
    }

    const existingToken = getAuthToken();
    if (!existingToken) {
      return;
    }

    let isMounted = true;
    apiGetCurrentUser()
      .then((userData) => {
        if (isMounted && userData) {
          setUser(userData);
        }
      })
      .catch(() => {
        if (isMounted) {
          clearAuthToken();
          setToken(null);
          setUser(null);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  /**
   * Authenticate user credentials and establish session.
   */
  const login = useCallback(async (credentials) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await apiLogin(credentials);
      if (result.token) {
        setAuthToken(result.token);
        setToken(result.token);
      }
      if (result.user) {
        setUser(result.user);
      }
      return result;
    } catch (err) {
      const message =
        err.status === 404
          ? "Authentication service is currently unavailable. Backend authentication endpoints are pending implementation (Sprint 2)."
          : err.message || "Invalid email or password.";
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Register a new user account.
   */
  const register = useCallback(async (userData) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await apiRegister(userData);
      if (result.token && result.user) {
        setAuthToken(result.token);
        setToken(result.token);
        setUser(result.user);
      }
      return result;
    } catch (err) {
      const message =
        err.status === 404
          ? "Registration service is currently unavailable. Backend registration endpoints are pending implementation (Sprint 2)."
          : err.message || "Registration failed. Please try again.";
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Refetches the current user session profile when backend auth is available.
   */
  const refreshUser = useCallback(async () => {
    if (!isBackendAuthAvailable()) {
      return null;
    }

    try {
      const userData = await apiGetCurrentUser();
      setUser(userData);
      return userData;
    } catch (err) {
      if (err.status === 401) {
        logout();
      }
      throw err;
    }
  }, [logout]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const hasRole = useCallback(
    (role) => Boolean(user && user.role === role),
    [user]
  );

  const hasAnyRole = useCallback(
    (roles) => Boolean(user && Array.isArray(roles) && roles.includes(user.role)),
    [user]
  );

  const contextValue = useMemo(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(user),
      isLoading,
      error,
      login,
      register,
      logout,
      refreshUser,
      clearError,
      hasRole,
      hasAnyRole,
      isDriver: user?.role === ROLES.USER,
      isMallOwner: user?.role === ROLES.MALL_OWNER,
      isGuard: user?.role === ROLES.GUARD,
      isAdmin: user?.role === ROLES.ADMIN,
    }),
    [
      user,
      token,
      isLoading,
      error,
      login,
      register,
      logout,
      refreshUser,
      clearError,
      hasRole,
      hasAnyRole,
    ]
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export default AuthProvider;
