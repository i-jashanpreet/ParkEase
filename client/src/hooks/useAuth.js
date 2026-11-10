import { useContext } from "react";
import { AuthContext } from "../context/authContextInstance.js";

/**
 * Custom React hook for accessing the active ParkEase authentication context.
 * Throws a descriptive error if invoked outside of an AuthProvider.
 */
export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}

export default useAuth;
