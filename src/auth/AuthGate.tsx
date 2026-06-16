import type { ReactNode } from "react";
import { useAuth } from "./AuthContext";
import LoginPage from "./LoginPage";
import "./auth.css";

/**
 * Gates the entire app behind Google sign-in. While the auth state is
 * resolving we show a lightweight splash; once resolved we show either the
 * full-screen login page (signed out) or the app (signed in).
 */
/**
 * Local-dev escape hatch: set VITE_AUTH_DISABLED=true in .env.local to skip the
 * sign-in gate entirely (e.g. to work on the workspace UI without Firebase).
 * Defaults to off, so production behaviour is unchanged.
 */
const AUTH_DISABLED =
  String(import.meta.env.VITE_AUTH_DISABLED).toLowerCase() === "true";

export default function AuthGate({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  if (AUTH_DISABLED) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="auth-splash">
        <div className="auth-spinner" aria-label="Loading" />
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return <>{children}</>;
}
