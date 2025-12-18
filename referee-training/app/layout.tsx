import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthSessionProvider } from "@/components/providers/session-provider";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { SlidingBackground } from "@/components/layout/SlidingBackground";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Referee Training Platform",
  description: "Professional training platform for football referees. Master the Laws of the Game, practice with video challenges, and track your progress.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Server-provide the initial session so the header can render "Log in" instantly
  // (instead of waiting for client-side session fetch / hydration).
  const session = await getServerSession(authOptions);

  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} ${geistMono.variable} antialiased bg-dark-900 text-text-primary`}
      >
        <AuthSessionProvider session={session}>
          <SlidingBackground />
          <Header />
          <main className="relative z-10 min-h-screen">{children}</main>
          <Footer />
        </AuthSessionProvider>
      </body>
    </html>
  );
}
