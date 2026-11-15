"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import {
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Sparkles,
} from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/inbox";

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const redirectTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
    };
  }, []);

  const handleQuickFillDemo = () => {
    setMode("signin");
    setEmail("admin@mail.systemdevify.com");
    setPassword("AdminPassword2026!");
    setErrorMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      if (mode === "signin") {
        const res = await authClient.signIn.email({
          email: email.trim(),
          password,
        });

        if (res.error) {
          setErrorMessage(
            res.error.message || "Invalid email or password. Please try again."
          );
          setIsLoading(false);
          return;
        }

        setSuccessMessage("Authenticated successfully. Redirecting...");
        if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
        redirectTimerRef.current = setTimeout(() => {
          router.push(callbackUrl);
          router.refresh();
        }, 400);
      } else {
        if (!name.trim()) {
          setErrorMessage("Please enter your full name.");
          setIsLoading(false);
          return;
        }
        if (password.length < 8) {
          setErrorMessage("Password must be at least 8 characters long.");
          setIsLoading(false);
          return;
        }

        const res = await authClient.signUp.email({
          email: email.trim(),
          password,
          name: name.trim(),
        });

        if (res.error) {
          setErrorMessage(
            res.error.message || "Registration failed. Please try again."
          );
          setIsLoading(false);
          return;
        }

        setSuccessMessage("Account created successfully. Redirecting...");
        if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
        redirectTimerRef.current = setTimeout(() => {
          router.push(callbackUrl);
          router.refresh();
        }, 500);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An unexpected error occurred.";
      setErrorMessage(msg);
      setIsLoading(false);
    }
  };

  return (
    <div className="sm:mx-auto sm:w-full sm:max-w-md">
      {/* Brand Header */}
      <div className="text-center mb-8">
        <div className="mx-auto h-12 w-12 rounded-xl bg-black dark:bg-white text-white dark:text-black flex items-center justify-center shadow-md mb-4">
          <Mail className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Internal Mail
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          SystemDevify Email Application Layer
        </p>
      </div>

      {/* Main Card */}
      <div className="bg-white dark:bg-zinc-900 py-8 px-6 shadow-xl shadow-zinc-200/50 dark:shadow-none border border-zinc-200 dark:border-zinc-800 rounded-2xl sm:px-10">
        {/* Tab Toggle */}
        <div className="flex rounded-lg bg-zinc-100 dark:bg-zinc-800 p-1 mb-6">
          <button
            type="button"
            onClick={() => {
              setMode("signin");
              setErrorMessage(null);
            }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
              mode === "signin"
                ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 shadow-sm"
                : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("signup");
              setErrorMessage(null);
            }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
              mode === "signup"
                ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 shadow-sm"
                : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Status Alerts */}
        {errorMessage && (
          <div className="mb-5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 p-3 flex items-start gap-2.5 text-xs text-red-700 dark:text-red-300">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 p-3 flex items-start gap-2.5 text-xs text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "signup" && (
            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Forhad Hossain"
                  className="w-full pl-9 pr-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Work Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@mail.systemdevify.com"
                className="w-full pl-9 pr-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-9 pr-10 py-2 text-sm bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-2.5 px-4 rounded-lg bg-black text-white dark:bg-white dark:text-black text-sm font-semibold hover:bg-zinc-800 dark:hover:bg-zinc-100 transition shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Processing...</span>
              </>
            ) : mode === "signin" ? (
              "Sign In to Inbox"
            ) : (
              "Create Account"
            )}
          </button>
        </form>

        {/* Demo Quick-Fill Button */}
        <div className="mt-6 pt-5 border-t border-zinc-200 dark:border-zinc-800 text-center">
          <button
            type="button"
            onClick={handleQuickFillDemo}
            className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium rounded-lg text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800/60 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition border border-zinc-200 dark:border-zinc-700/60"
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            <span>Use Demo Admin Credentials</span>
          </button>
          <p className="text-[11px] text-zinc-400 mt-2">
            Default credentials for testing in local / staging
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}

