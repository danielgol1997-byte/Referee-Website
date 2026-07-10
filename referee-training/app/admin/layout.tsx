import { ReactNode } from "react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { isAdmin } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { flagEmoji } from "@/lib/countries";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions);

  if (!isAdmin(session?.user?.role)) {
    // Middleware normally handles this; this is a safety net.
    redirect("/");
  }

  const me = session?.user?.id
    ? await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { association: { select: { name: true, countryCode: true } } },
      })
    : null;

  const fa = me?.association;

  return (
    <div className="min-h-screen relative">
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
        <div className="absolute inset-0 bg-dark-900/30" />
      </div>

      <div className="relative z-10">
        <header className="relative border-b border-accent/20 backdrop-blur-sm bg-dark-900/50 overflow-hidden">
          <div className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-2">
            <h1 className="text-xl font-semibold text-white drop-shadow-lg">FA Admin</h1>
            {fa && (
              <span className="flex items-center gap-2 text-sm font-medium text-white/90">
                <span className="text-base leading-none">{flagEmoji(fa.countryCode) || "🏳️"}</span>
                {fa.name}
              </span>
            )}
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
      </div>
    </div>
  );
}
