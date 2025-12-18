"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { getSession, signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-dark-800" />}>
      <LoginPageInner />
    </Suspense>
  );
}

function LoginPageInner() {
  const router = useRouter();
  const params = useSearchParams();
  // Default to home page "/" instead of "/stats" to allow users to access any page
  const callbackUrl = params.get("callbackUrl") ?? "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const waitForSession = async (timeoutMs = 2500) => {
    const start = Date.now();
    // Poll until the session cookie is fully established/visible to middleware.
    // This prevents the "click a tab -> redirected back to login" flash right after sign-in.
    while (Date.now() - start < timeoutMs) {
      const s = await getSession();
      if (s?.user) return true;
      await new Promise((r) => setTimeout(r, 120));
    }
    return false;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl,
    });

    if (res?.error) {
      setLoading(false);
      setError("Invalid credentials. Please try again.");
      return;
    }

    // Make navigation deterministic: ensure the session exists before leaving this page.
    await waitForSession();
    setLoading(false);
    router.replace(callbackUrl);
    router.refresh();
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        {/* Background with gradient and pattern */}
        <div className="absolute inset-0 bg-dark-900">
          {/* Stadium-inspired gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-dark-800 via-dark-900 to-dark-800" />
          
          {/* Pitch pattern at bottom */}
          <div className="absolute bottom-0 left-0 right-0 h-1/2">
            <div className="absolute inset-0 bg-gradient-to-t from-[#1A3A2E]/30 to-transparent" />
            {/* Pitch lines */}
            <svg className="absolute bottom-0 left-0 right-0 h-64 opacity-20" viewBox="0 0 100 50" preserveAspectRatio="none">
              <line x1="50" y1="0" x2="50" y2="50" stroke="#00E8F8" strokeWidth="0.5" />
              <circle cx="50" cy="25" r="10" fill="none" stroke="#00E8F8" strokeWidth="0.5" />
              <rect x="0" y="10" width="15" height="30" fill="none" stroke="#00E8F8" strokeWidth="0.5" />
              <rect x="85" y="10" width="15" height="30" fill="none" stroke="#00E8F8" strokeWidth="0.5" />
            </svg>
          </div>
          
          {/* Glow effects */}
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-warm/10 rounded-full blur-3xl" />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center px-12 lg:px-16">
          {/* Accent line */}
          <div className="w-24 h-1 bg-gradient-to-r from-warm to-cyan-500 rounded-full mb-8" />
          
          <p className="text-sm font-medium text-cyan-500 uppercase tracking-[0.15em] mb-4">
            Professional Training Platform
          </p>
          
          <h1 className="text-4xl lg:text-5xl font-bold text-premium leading-tight mb-6">
            Master the Art of
            <span className="block text-premium-accent">Match Officiating</span>
          </h1>
          
          <ul className="space-y-4 text-text-secondary">
            <li className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-3.5 h-3.5 text-cyan-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span>Laws of the Game tests with instant explanations</span>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-3.5 h-3.5 text-cyan-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span>Video challenges for Offside, Handball, DOGSO/SPA</span>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-3.5 h-3.5 text-cyan-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span>VAR and Assistant Referee specific training</span>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-3.5 h-3.5 text-cyan-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span>Personal dashboard to track your progress</span>
            </li>
          </ul>

          {/* Stats */}
          <div className="mt-12 pt-8 border-t border-dark-600 grid grid-cols-3 gap-8">
            <div>
              <div className="text-2xl font-bold text-cyan-500">500+</div>
              <div className="text-sm text-text-muted">Video clips</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-cyan-500">17</div>
              <div className="text-sm text-text-muted">Laws covered</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-cyan-500">24/7</div>
              <div className="text-sm text-text-muted">Access</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex flex-col justify-center bg-dark-800 px-6 py-12 lg:px-16">
        <div className="mx-auto w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-cyan-700 flex items-center justify-center">
              <svg className="w-6 h-6 text-dark-900" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-5.5-2.5l7.51-3.49L17.5 6.5 9.99 9.99 6.5 17.5zm5.5-6.6c.61 0 1.1.49 1.1 1.1s-.49 1.1-1.1 1.1-1.1-.49-1.1-1.1.49-1.1 1.1-1.1z"/>
              </svg>
            </div>
            <span className="text-xl font-bold text-text-primary">Referee Training</span>
          </div>

          {/* Header */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-text-primary">
              Welcome back
            </h2>
            <p className="mt-2 text-text-secondary">
              Sign in to continue your training
            </p>
          </div>

          {/* Form */}
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-primary">
                Email
              </label>
              <Input
                name="email"
                type="email"
                autoComplete="email"
                placeholder="referee@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-text-primary">
                  Password
                </label>
                <Link href="/auth/forgot-password" className="text-sm text-cyan-500 hover:text-cyan-400">
                  Forgot password?
                </Link>
              </div>
              <Input
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-status-danger/10 border border-status-danger/20">
                <p className="text-sm text-status-danger">{error}</p>
              </div>
            )}

            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Signing in...
                </>
              ) : (
                "Sign in"
              )}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-dark-600" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-dark-800 text-text-muted">
                or continue with
              </span>
            </div>
          </div>

          {/* Social login */}
          <div className="grid grid-cols-3 gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => signIn("google", { callbackUrl })}
              className="h-11"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => signIn("apple", { callbackUrl })}
              className="h-11"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
              </svg>
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => signIn("facebook", { callbackUrl })}
              className="h-11"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
            </Button>
          </div>

          {/* Register link */}
          <p className="mt-8 text-center text-sm text-text-secondary">
            Don&apos;t have an account?{" "}
            <Link href="/auth/register" className="font-semibold text-cyan-500 hover:text-cyan-400">
              Create one now
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
