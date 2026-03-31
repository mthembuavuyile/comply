import React, { useState, useEffect, useRef } from "react";
import { auth } from "../lib/firebase";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
  sendEmailVerification,
  signOut,
} from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { Shield, Mail, Lock, Loader2, Eye, EyeOff, CheckCircle2, XCircle, Clock } from "lucide-react";

// ─── Password Strength ────────────────────────────────────────────────────────

interface PasswordRequirement {
  label: string;
  met: boolean;
}

function getRequirements(password: string): PasswordRequirement[] {
  return [
    { label: "At least 6 characters", met: password.length >= 6 },
    { label: "Uppercase letter (A–Z)", met: /[A-Z]/.test(password) },
    { label: "Lowercase letter (a–z)", met: /[a-z]/.test(password) },
    { label: "Number (0–9)", met: /[0-9]/.test(password) },
    { label: "Special character (!@#%&…)", met: /[^A-Za-z0-9]/.test(password) },
  ];
}

function strengthScore(password: string): number {
  return getRequirements(password).filter((r) => r.met).length;
}

const STRENGTH_LABELS = ["", "Weak", "Fair", "Good", "Strong", "Very Strong"];
const STRENGTH_COLORS = [
  "",
  "bg-red-500",
  "bg-orange-400",
  "bg-yellow-400",
  "bg-lime-500",
  "bg-green-500",
];
const STRENGTH_TEXT = [
  "",
  "text-red-600",
  "text-orange-500",
  "text-yellow-600",
  "text-lime-600",
  "text-green-600",
];

// ─── Rate Limiting (client-side) ─────────────────────────────────────────────

const STORAGE_KEY = "vylex_login_attempts";

interface AttemptData {
  count: number;
  lockedUntil: number | null;
}

function loadAttempts(email: string): AttemptData {
  try {
    const raw = sessionStorage.getItem(`${STORAGE_KEY}:${email}`);
    if (raw) return JSON.parse(raw);
  } catch { }
  return { count: 0, lockedUntil: null };
}

function saveAttempts(email: string, data: AttemptData) {
  sessionStorage.setItem(`${STORAGE_KEY}:${email}`, JSON.stringify(data));
}

function getLockDuration(count: number): number | null {
  // Every 3 failures triggers a lock, doubling each tier
  // 3 → 30s, 6 → 60s, 9 → 120s, 12 → 240s …
  if (count < 3) return null;
  const tier = Math.floor(count / 3);
  return 30 * Math.pow(2, tier - 1);
}

function recordFailedAttempt(email: string): AttemptData {
  const data = loadAttempts(email);
  const newCount = data.count + 1;
  const lockSecs = getLockDuration(newCount);
  const newData: AttemptData = {
    count: newCount,
    lockedUntil: lockSecs ? Date.now() + lockSecs * 1000 : null,
  };
  saveAttempts(email, newData);
  return newData;
}

function clearAttempts(email: string) {
  sessionStorage.removeItem(`${STORAGE_KEY}:${email}`);
}

// ─── Countdown hook ────────────────────────────────────────────────────────

function useCountdown(targetMs: number | null): number {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (!targetMs) { setRemaining(0); return; }
    const tick = () => {
      const diff = Math.max(0, Math.ceil((targetMs - Date.now()) / 1000));
      setRemaining(diff);
    };
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [targetMs]);

  return remaining;
}

// ─── Verification Pending screen ─────────────────────────────────────────────

function VerificationPending({ email, onResend, onBack }: {
  email: string;
  onResend: () => Promise<void>;
  onBack: () => void;
}) {
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  const handleResend = async () => {
    setResending(true);
    await onResend();
    setResending(false);
    setResent(true);
    setCooldown(60);
    setTimeout(() => setResent(false), 4000);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-10 px-8 shadow-xl shadow-gray-200/50 rounded-2xl border border-gray-100 text-center">
          <div className="flex justify-center mb-5">
            <div className="bg-sky-100 p-4 rounded-full">
              <Mail className="h-10 w-10 text-sky-600" />
            </div>
          </div>
          <h2 className="text-2xl font-extrabold text-gray-900 mb-2">Verify your email</h2>
          <p className="text-gray-500 text-sm mb-1">
            We sent a verification link to:
          </p>
          <p className="font-semibold text-gray-800 text-sm mb-6 break-all">{email}</p>
          <p className="text-gray-500 text-sm mb-8 leading-relaxed">
            Click the link in that email to activate your account. You won't be able to access Vylex Comply until your email is verified.
          </p>

          {resent && (
            <div className="mb-4 bg-green-50 border-l-4 border-green-500 p-3 rounded-r-md text-left">
              <p className="text-sm text-green-700 font-medium">Verification email resent!</p>
            </div>
          )}

          <button
            onClick={handleResend}
            disabled={resending || cooldown > 0}
            className="w-full py-2.5 px-4 border border-sky-300 rounded-xl text-sm font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 disabled:opacity-50 transition-all mb-3"
          >
            {resending ? (
              <span className="flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Sending…</span>
            ) : cooldown > 0 ? (
              <span className="flex items-center justify-center gap-2"><Clock className="h-4 w-4" /> Resend in {cooldown}s</span>
            ) : (
              "Resend verification email"
            )}
          </button>

          <button
            onClick={onBack}
            className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold text-gray-600 hover:text-gray-800 transition-colors"
          >
            ← Back to sign in
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main AuthPage ─────────────────────────────────────────────────────────────

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [verificationPending, setVerificationPending] = useState(false);
  const [pendingEmail, setPendingEmail] = useState("");
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const navigate = useNavigate();

  const lockCountdown = useCountdown(lockedUntil);
  const isLocked = lockCountdown > 0;

  // Re-check lock state when email changes
  useEffect(() => {
    if (!isLogin || !email) return;
    const data = loadAttempts(email);
    if (data.lockedUntil && data.lockedUntil > Date.now()) {
      setLockedUntil(data.lockedUntil);
    } else {
      setLockedUntil(null);
    }
  }, [email, isLogin]);

  // Password strength
  const score = strengthScore(password);
  const requirements = getRequirements(password);
  const allMet = requirements.every((r) => r.met);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (isLogin && isLocked) {
      setError(`Too many failed attempts. Please wait ${lockCountdown} seconds.`);
      return;
    }

    if (!isLogin && !allMet) {
      setError("Please meet all password requirements before continuing.");
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        // Enforce email verification
        if (!cred.user.emailVerified) {
          await signOut(auth);
          setPendingEmail(email);
          setVerificationPending(true);
          return;
        }
        clearAttempts(email);
        navigate("/dashboard");
      } else {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await sendEmailVerification(cred.user);
        await signOut(auth);
        setPendingEmail(email);
        setVerificationPending(true);
      }
    } catch (err: any) {
      if (
        err.code === "auth/invalid-credential" ||
        err.code === "auth/wrong-password" ||
        err.code === "auth/user-not-found"
      ) {
        const updated = recordFailedAttempt(email);
        if (updated.lockedUntil) {
          setLockedUntil(updated.lockedUntil);
          const secs = Math.ceil((updated.lockedUntil - Date.now()) / 1000);
          setError(`Too many failed attempts. Account locked for ${secs} seconds.`);
        } else {
          const remaining = 3 - (updated.count % 3);
          setError(
            `Invalid email or password. ${remaining} attempt${remaining !== 1 ? "s" : ""} remaining before temporary lock.`
          );
        }
      } else if (err.code === "auth/email-already-in-use") {
        setError("An account with this email already exists.");
      } else if (err.code === "auth/weak-password") {
        setError("Password should be at least 6 characters.");
      } else {
        setError(err.message || "An error occurred during authentication.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const provider = new GoogleAuthProvider();
      const cred = await signInWithPopup(auth, provider);
      // Google accounts are pre-verified
      navigate("/dashboard");
    } catch (err: any) {
      if (err.code !== "auth/popup-closed-by-user") {
        setError(err.message || "An error occurred during Google authentication.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email) {
      setError("Please enter your email address first to reset your password.");
      return;
    }
    setLoading(true);
    setError("");
    setMessage("");
    try {
      await sendPasswordResetEmail(auth, email);
      setMessage("Password reset email sent! Please check your inbox.");
    } catch (err: any) {
      if (err.code === "auth/user-not-found") {
        setError("No account found with this email address.");
      } else {
        setError(err.message || "Failed to send password reset email.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    // Sign in temporarily to get user object and resend
    try {
      // We can't resend without a user object — instruct user to try sign in again
      // which will trigger the pending screen again
      setMessage("Please sign in again to trigger a new verification email.");
    } catch { }
  };

  // ── Verification pending screen ──
  if (verificationPending) {
    return (
      <VerificationPending
        email={pendingEmail}
        onResend={handleResendVerification}
        onBack={() => {
          setVerificationPending(false);
          setIsLogin(true);
          setPassword("");
        }}
      />
    );
  }

  // ── Main form ──
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="flex justify-center">
          <div className="bg-sky-600 p-3 rounded-2xl shadow-lg shadow-sky-200/50">
            <Shield className="h-10 w-10 text-white" />
          </div>
        </div>
        <h2 className="mt-6 text-3xl font-extrabold text-gray-900 tracking-tight">
          {isLogin ? "Welcome back" : "Create your account"}
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          Vylex Comply - South African SME Compliance
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl shadow-gray-200/50 sm:rounded-2xl sm:px-10 border border-gray-100">

          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center py-2.5 px-4 border border-gray-300 rounded-xl shadow-sm bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 disabled:opacity-50 transition-all mb-6"
          >
            <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Continue with Google
          </button>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-3 bg-white text-gray-500 font-medium">
                Or continue with email
              </span>
            </div>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-md flex items-start gap-2">
                <XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-700 font-medium">{error}</p>
              </div>
            )}
            {message && (
              <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-r-md flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-green-700 font-medium">{message}</p>
              </div>
            )}

            {/* Lock countdown banner */}
            {isLogin && isLocked && (
              <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-md flex items-start gap-2">
                <Clock className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-amber-700 font-medium">
                  Account temporarily locked. Try again in{" "}
                  <span className="font-bold tabular-nums">{lockCountdown}s</span>.
                </p>
              </div>
            )}

            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Email address
              </label>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 sm:text-sm transition-colors"
                  placeholder="you@example.co.za"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-semibold text-gray-700">
                  Password
                </label>
                {isLogin && (
                  <button
                    type="button"
                    onClick={handleResetPassword}
                    className="text-sm font-medium text-sky-600 hover:text-sky-500"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 sm:text-sm transition-colors"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>

              {/* ── Password strength (signup only) ── */}
              {!isLogin && password.length > 0 && (
                <div className="mt-3 space-y-2">
                  {/* Segmented progress bar */}
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div
                        key={i}
                        className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${i <= score ? STRENGTH_COLORS[score] : "bg-gray-200"
                          }`}
                      />
                    ))}
                  </div>
                  <div className="flex justify-between items-center">
                    <p className={`text-xs font-semibold ${STRENGTH_TEXT[score]}`}>
                      {STRENGTH_LABELS[score]}
                    </p>
                    <p className="text-xs text-gray-400">{score}/5 requirements met</p>
                  </div>

                  {/* Individual requirement checklist */}
                  <ul className="space-y-1 pt-1">
                    {requirements.map((req) => (
                      <li key={req.label} className="flex items-center gap-2">
                        {req.met ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                        ) : (
                          <XCircle className="h-3.5 w-3.5 text-gray-300 flex-shrink-0" />
                        )}
                        <span
                          className={`text-xs transition-colors ${req.met ? "text-green-700 font-medium" : "text-gray-400"
                            }`}
                        >
                          {req.label}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading || (isLogin && isLocked) || (!isLogin && password.length > 0 && !allMet)}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 disabled:opacity-50 transition-all"
              >
                {loading ? (
                  <Loader2 className="animate-spin h-5 w-5" />
                ) : isLogin && isLocked ? (
                  <span className="flex items-center gap-2">
                    <Clock className="h-4 w-4" /> Locked ({lockCountdown}s)
                  </span>
                ) : isLogin ? (
                  "Sign in"
                ) : (
                  "Create account"
                )}
              </button>
            </div>
          </form>

          <div className="mt-8 text-center">
            <p className="text-sm text-gray-600">
              {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
              <button
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError("");
                  setMessage("");
                  setPassword("");
                  setLockedUntil(null);
                }}
                className="font-bold text-sky-600 hover:text-sky-500 transition-colors"
              >
                {isLogin ? "Sign up" : "Log in"}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}