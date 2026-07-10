import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProfileForm } from "@/components/account/ProfileForm";
import { RefereeIdentityCard } from "@/components/account/RefereeIdentityCard";

export default async function AccountPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    redirect("/auth/login");
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      name: true,
      country: true,
      image: true,
      dateOfBirth: true,
      heightCm: true,
      weightKg: true,
      association: { select: { id: true, name: true, countryCode: true } },
      rank: { select: { name: true } },
      internationalAssociation: { select: { name: true } },
      internationalRank: { select: { name: true } },
    },
  });

  if (!user) {
    redirect("/auth/login");
  }

  return (
    <div className="min-h-screen bg-dark-900 text-white px-6 py-12">
      <div className="mx-auto w-full max-w-xl space-y-8">
        <RefereeIdentityCard
          associationName={user.association?.name ?? null}
          associationCountryCode={user.association?.countryCode ?? null}
          rankName={user.rank?.name ?? null}
          internationalName={user.internationalAssociation?.name ?? null}
          internationalCategoryName={user.internationalRank?.name ?? null}
        />
        <ProfileForm
          title="Your profile"
          description="Update your account information."
          submitLabel="Save changes"
          initialValues={{
            name: user.name ?? "",
            country: user.country ?? "",
            associationId: user.association?.id ?? null,
            associationName: user.association?.name ?? null,
            associationCountryCode: user.association?.countryCode ?? null,
            dateOfBirth: user.dateOfBirth ? user.dateOfBirth.toISOString() : null,
            heightCm: user.heightCm ?? null,
            weightKg: user.weightKg ?? null,
            image: user.image ?? null,
          }}
        />
      </div>
    </div>
  );
}
