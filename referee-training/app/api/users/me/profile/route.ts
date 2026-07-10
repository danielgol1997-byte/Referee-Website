import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const PROFILE_SELECT = {
  email: true,
  name: true,
  country: true,
  image: true,
  associationId: true,
  dateOfBirth: true,
  heightCm: true,
  weightKg: true,
  profileComplete: true,
  association: { select: { id: true, name: true, countryCode: true } },
  rank: { select: { id: true, name: true } },
  internationalAssociation: { select: { id: true, name: true, countryCode: true } },
  internationalRank: { select: { id: true, name: true } },
} as const;

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: PROFILE_SELECT,
  });

  return NextResponse.json({ user });
}

function parseDate(value: unknown): Date | null | undefined {
  if (value === null || value === "") return null;
  if (typeof value !== "string") return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function parseNumber(value: unknown): number | null | undefined {
  if (value === null || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) return Math.round(value);
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    return Number.isFinite(n) ? Math.round(n) : undefined;
  }
  return undefined;
}

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const country = typeof body?.country === "string" ? body.country.trim() : "";
  const image = typeof body?.image === "string" && body.image.trim() ? body.image.trim() : undefined;

  if (!name || !country) {
    return NextResponse.json({ error: "Name and country are required." }, { status: 400 });
  }

  const current = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, associationId: true },
  });
  if (!current) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  // A referee may only choose their association while it is still unset
  // (onboarding). After that, only an admin can move them between FAs.
  let associationId: string | undefined;
  if (!current.associationId) {
    const requested =
      typeof body?.associationId === "string" && body.associationId.trim()
        ? body.associationId.trim()
        : null;
    if (requested) {
      const assoc = await prisma.association.findFirst({
        where: { id: requested, isActive: true },
        select: { id: true },
      });
      if (!assoc) {
        return NextResponse.json({ error: "Selected association is not available." }, { status: 400 });
      }
      associationId = assoc.id;
    }
  }

  const dateOfBirth = parseDate(body?.dateOfBirth);
  const heightCm = parseNumber(body?.heightCm);
  const weightKg = parseNumber(body?.weightKg);

  const user = await prisma.user.update({
    where: { email: session.user.email },
    data: {
      name,
      country,
      profileComplete: true,
      ...(image !== undefined && { image }),
      ...(associationId !== undefined && { associationId }),
      ...(dateOfBirth !== undefined && { dateOfBirth }),
      ...(heightCm !== undefined && { heightCm }),
      ...(weightKg !== undefined && { weightKg }),
    },
    select: PROFILE_SELECT,
  });

  return NextResponse.json({ user });
}
