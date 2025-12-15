import { ReactNode } from "react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import Link from "next/link";

export default async function SuperAdminLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions);

  if (session?.user?.role !== "SUPER_ADMIN") {
    redirect("/auth/login");
  }

  return (
    <div className="min-h-screen relative">
      {/* Animated Video Background */}
      <div className="fixed inset-0 z-0 overflow-hidden">
        <video 
          autoPlay 
          loop 
          muted 
          playsInline
          className="absolute inset-0 w-full h-full object-cover opacity-80"
        >
          <source src="/admin-bg.mp4" type="video/mp4" />
        </video>
        {/* Light overlay for text readability only */}
        <div className="absolute inset-0 bg-dark-900/30" />
      </div>

      {/* Content with glass effect */}
      <div className="relative z-10">
        <header className="relative border-b border-accent/20 backdrop-blur-sm bg-dark-900/50 overflow-hidden">
          <div className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-2">
            <h1 className="text-xl font-semibold text-white drop-shadow-lg">Control Panel</h1>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
      </div>
    </div>
  );
}
