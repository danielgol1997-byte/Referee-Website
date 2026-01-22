"use client";

import { Suspense, useState } from "react";
import { getSession, signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";

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

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    await signIn("google", { callbackUrl });
    // Redirect handled by NextAuth; fallback if it returns without redirect.
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

          {error && (
            <div className="p-3 rounded-lg bg-status-danger/10 border border-status-danger/20">
              <p className="text-sm text-status-danger">{error}</p>
            </div>
          )}

          <Button type="button" className="w-full" size="lg" disabled={loading} onClick={handleGoogleSignIn}>
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Connecting...
              </>
            ) : (
              "Continue with Google"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
