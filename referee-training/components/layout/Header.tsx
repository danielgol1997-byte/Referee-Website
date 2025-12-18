"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { 
  DropdownMenu, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuLabel 
} from "@/components/ui/dropdown-menu";

const navItems = [
  { href: "/laws", label: "Laws of the game" },
  { href: "/practice", label: "Referees practice" },
  { href: "/practice/var", label: "VAR practice" },
  { href: "/practice/ar", label: "A.R. practice" },
  { href: "/library", label: "Video Library" },
  { href: "/stats", label: "Stats" },
];

export function Header() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [displaySession, setDisplaySession] = useState(session);

  // Set logo based on current page
  const activeLogo = pathname.startsWith('/laws')
    ? "/logo/whistle-laws.webp"
    : pathname.startsWith('/library')
    ? "/logo/whistle-library-liquid.gif"
    : pathname.startsWith('/stats')
    ? "/logo/whistle-training-liquid.gif"
    : pathname.startsWith('/practice/var')
    ? "/logo/whistle-var-liquid.gif"
    : pathname.startsWith('/practice/ar')
    ? "/logo/whistle-ar-liquid.gif"
    : pathname.startsWith('/practice')
    ? "/logo/whistle-practice-new.gif"
    : "/logo/whistle-chrome-liquid.gif";

  // Keep session stable during loading/navigation to prevent flash
  useEffect(() => {
    if (status === "authenticated" && session) {
      // Update display session when authenticated
      setDisplaySession(session);
    } else if (status === "unauthenticated") {
      // Only clear when explicitly unauthenticated
      setDisplaySession(null);
    }
    // Don't update during "loading" status - keep previous session visible
  }, [session, status]);

  return (
    <header className="sticky top-0 z-40 backdrop-blur-xl bg-dark-900/75 border-b border-white/5 shadow-lg shadow-black/20 supports-[backdrop-filter]:bg-dark-900/60">
      {/* Glass sheen effect */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
      
      {/* Top accent glow */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-accent/50 to-transparent shadow-[0_0_10px_rgba(232,224,154,0.5)]" />
      
      {/* Bottom accent glow - subtle */}
      <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-accent/20 to-transparent" />
      
      <div className="relative mx-auto flex max-w-screen-xl items-center px-6 py-4 gap-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-4 group">
          <div className="w-[88px] h-[88px] flex items-center justify-center relative -my-4">
            <Image
              src={activeLogo}
              alt="Referee Whistle"
              width={88}
              height={88}
              className="h-full w-full object-contain transition-all duration-300 ease-in-out"
              unoptimized
              priority
            />
          </div>
          <span className="text-lg font-bold text-white group-hover:text-accent transition-colors">
            Referee Training
          </span>
        </Link>

        {/* Navigation - Centered between logo and user */}
        <nav className="hidden items-center justify-center gap-10 lg:flex flex-1">
          {navItems.map((item) => {
            // Check if current path matches this nav item
            // For exact match on /practice (but not /practice/var or /practice/ar)
            const isActive = item.href === "/practice" 
              ? pathname === "/practice" || (pathname.startsWith("/practice/") && !pathname.startsWith("/practice/var") && !pathname.startsWith("/practice/ar"))
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group relative pb-1 text-sm font-medium transition-all duration-300",
                  "text-text-secondary hover:text-accent",
                  isActive && "text-accent"
                )}
              >
                {item.label}
                {/* Active underline with gradient - positioned directly below text */}
                <span 
                  className={cn(
                    "absolute bottom-0 left-0 right-0 h-[2px] rounded-full transition-all duration-300",
                    isActive 
                      ? "bg-accent opacity-100" 
                      : "bg-accent/30 opacity-0 scale-x-0 group-hover:opacity-40 group-hover:scale-x-100"
                  )}
                />
              </Link>
            );
          })}
        </nav>

        {/* Auth section */}
        <div className="flex items-center min-w-[98px]">
          {displaySession?.user ? (
            <DropdownMenu
              align="right"
              trigger={
                <div className="group cursor-pointer flex items-center gap-2 px-4 py-2.5 rounded-lg bg-dark-700/50 border border-accent/10 hover:bg-dark-600/60 hover:border-accent/20 transition-all shadow-md">
                  <span className="text-sm font-medium text-text-secondary group-hover:text-accent transition-colors">
                    {displaySession.user.name?.split(' ')[0] ?? "Referee"}
                  </span>
                  <svg 
                    className="w-4 h-4 text-text-muted group-hover:text-accent transition-all group-hover:translate-y-0.5" 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              }
            >
              <DropdownMenuLabel>Account</DropdownMenuLabel>
              <DropdownMenuItem>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                {displaySession.user.name ?? "Referee"}
              </DropdownMenuItem>
              <DropdownMenuItem>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                {displaySession.user.email ?? "email@example.com"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {displaySession.user.role === "SUPER_ADMIN" && (
                <>
                  <Link 
                    href="/super-admin"
                    onClick={() => {
                      // Remove focus to prevent yellow outline flash
                      if (document.activeElement instanceof HTMLElement) {
                        (document.activeElement as HTMLElement).blur();
                      }
                    }}
                  >
                    <DropdownMenuItem>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Super Admin
                    </DropdownMenuItem>
                  </Link>
                  <DropdownMenuSeparator />
                </>
              )}

              <DropdownMenuItem
                variant="danger"
                onClick={() => signOut({ callbackUrl: "/" })}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Sign out
              </DropdownMenuItem>
            </DropdownMenu>
          ) : status === "unauthenticated" ? (
            <Button asChild size="sm" className="bg-accent text-dark-900 hover:bg-accent-dark hover:text-dark-900 hover:scale-105 transition-all duration-300">
              <Link href="/auth/login" className="text-dark-900">Log in</Link>
            </Button>
          ) : (
            // Loading placeholder to prevent layout shift
            <div className="h-[42px] w-[98px] rounded-lg bg-dark-700/30 border border-accent/5 animate-pulse" />
          )}
        </div>
      </div>
    </header>
  );
}
