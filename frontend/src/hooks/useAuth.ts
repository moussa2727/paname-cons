import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import type { AuthContextType } from "../types/auth.types";

/**
 * Hook d'accès au contexte d'authentification.
 * Doit être utilisé à l'intérieur de <AuthProvider>.
 */
export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (ctx === undefined) {
    throw new Error(
      "useAuth doit être utilisé à l'intérieur de <AuthProvider>",
    );
  }
  return ctx;
}
