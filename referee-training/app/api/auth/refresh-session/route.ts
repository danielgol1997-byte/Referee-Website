import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/auth/refresh-session
 * Forces a session refresh by updating the user's lastLoginAt
 * This triggers NextAuth to refresh the JWT token
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ 
        error: "Not authenticated"
      }, { status: 401 });
    }

    // Update lastLoginAt to trigger a refresh
    await prisma.user.update({
      where: { email: session.user.email },
      data: { lastLoginAt: new Date() },
    });

    return NextResponse.json({ 
      success: true,
      message: "Session refresh triggered. Please refresh your browser page."
    });
  } catch (error) {
    console.error("Refresh session error:", error);
    return NextResponse.json(
      { error: "Failed to refresh session", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
