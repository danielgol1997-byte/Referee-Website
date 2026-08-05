import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-800 px-6">
      <div className="mx-auto w-full max-w-md text-center">
        <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-cyan-500/10">
          <svg className="h-8 w-8 text-cyan-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          </svg>
        </div>

        <h2 className="text-2xl font-bold text-text-primary mb-3">
          Password reset is not available yet
        </h2>

        <p className="text-text-secondary mb-6">
          Self-service password reset has not been configured for this platform. Please contact your administrator for help regaining access.
        </p>

        <Button asChild className="w-full">
          <Link href="/auth/login">Return to login</Link>
        </Button>
      </div>
    </div>
  );
}
