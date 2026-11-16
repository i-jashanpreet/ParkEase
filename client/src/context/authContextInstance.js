import { createContext } from "react";

/**
 * Shared React Context instance for ParkEase authentication.
 * Defined separately to preserve Vite Fast Refresh HMR on the AuthProvider component.
 */
export const AuthContext = createContext(null);

export default AuthContext;
