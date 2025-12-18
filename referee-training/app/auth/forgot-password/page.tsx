"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // TODO: Implement password reset logic
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setLoading(false);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-800 px-6">
        <div className="mx-auto w-full max-w-md text-center">
          <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-cyan-500/10">
            <svg className="h-8 w-8 text-cyan-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76" />
            </svg>
          </div>
          
          <h2 className="text-2xl font-bold text-text-primary mb-3">
            Check your email
          </h2>
          
          <p className="text-text-secondary mb-6">
            If an account exists for {email}, you will receive a password reset link shortly.
          </p>
          
          <Link href="/auth/login">
            <Button className="w-full">
              Return to login
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-800 px-6">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-text-primary">
            Reset your password
          </h2>
          <p className="mt-2 text-text-secondary">
            Enter your email address and we&apos;ll send you a link to reset your password.
          </p>
        </div>

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

          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Sending...
              </>
            ) : (
              "Send reset link"
            )}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-text-secondary">
          Remember your password?{" "}
          <Link href="/auth/login" className="font-semibold text-cyan-500 hover:text-cyan-400">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
