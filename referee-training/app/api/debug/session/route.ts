import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";

function normalizeEmail(email: string) {
  return email.trim().replace(/^["']|["']$/g, "").toLowerCase();
}

function parseEmailList(list: string | undefined): string[] {
  if (!list) return [];
  return list.split(",").map(normalizeEmail).filter(Boolean);
}

/**
 * GET /api/debug/session
 * Debug endpoint to check current session and database role
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ 
        error: "Not authenticated",
        session: null 
      });
    }

    const dbUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        email: true,
        role: true,
        name: true,
        profileComplete: true,
        isActive: true,
      },
    });

    const superAdminEmails = parseEmailList(env.SUPER_ADMIN_EMAILS);
    const normalizedEmail = normalizeEmail(session.user.email);
    const isSuperAdminMatch = superAdminEmails.includes(normalizedEmail);

    return NextResponse.json({
      session: {
        user: {
          id: session.user.id,
          email: session.user.email,
          name: session.user.name,
          role: session.user.role,
          profileComplete: session.user.profileComplete,
          isActive: session.user.isActive,
        },
      },
      database: dbUser,
      match: dbUser?.role === session.user.role,
      debug: {
        superAdminEmailsConfigured: superAdminEmails.length > 0,
        superAdminEmails,
        superAdminMatch: isSuperAdminMatch,
        normalizedEmail,
        nextAuthSecretPresent: Boolean(env.NEXTAUTH_SECRET),
      },
    });
  } catch (error) {
    console.error("Debug session error:", error);
    return NextResponse.json(
      { error: "Failed to debug session", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
