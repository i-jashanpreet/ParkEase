import { useEffect, useState, useSyncExternalStore } from "react";
import { AuthContext } from "./authContextInstance.js";
import {
  getSession, restoreSession, signIn, signOut, subscribe, syncProfile,
} from "../services/authService.js";

export function AuthProvider({ children }) {
  const { user, loading, error } = useSyncExternalStore(subscribe, getSession);
  const [logoutError, setLogoutError] = useState("");
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => { restoreSession(); }, []);

  async function logout() {
    setIsSigningOut(true);
    setLogoutError("");
    try {
      await signOut();
    } catch (err) {
      setLogoutError(err.message);
    } finally {
      setIsSigningOut(false);
    }
  }

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: Boolean(user),
      isLoading: loading,
      error,
      isSigningOut,
      logoutError,
      logout,
      login: (credentials) => signIn("login", credentials),
      register: (fields) => signIn("register", fields),
      refreshUser: syncProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export default AuthProvider;
