import { useState } from "react";
import { useAuth } from "./AuthContext";
import { GoogleIcon } from "./icons";

/**
 * Baseline full-screen login page. UI variants live in separate worktrees —
 * this is the shared, functional starting point.
 */
export default function LoginPage() {
  const { signInWithGoogle, error } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  async function handleSignIn() {
    setSubmitting(true);
    await signInWithGoogle();
    setSubmitting(false);
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand">Jano Pad</div>
        <p className="login-subtitle">Sign in to access your clinical workspace</p>

        <button
          className="login-google-btn"
          onClick={handleSignIn}
          disabled={submitting}
        >
          <GoogleIcon />
          <span>{submitting ? "Signing in…" : "Continue with Google"}</span>
        </button>

        {error && <p className="login-error">{error}</p>}
      </div>
    </div>
  );
}
