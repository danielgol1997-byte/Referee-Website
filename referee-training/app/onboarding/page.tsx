import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProfileForm } from "@/components/account/ProfileForm";

export default async function OnboardingPage() {
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
      profileComplete: true,
      association: { select: { id: true, name: true, countryCode: true } },
    },
  });

  if (user?.profileComplete) {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-dark-900 text-white flex items-center justify-center px-6 py-12">
      <ProfileForm
        title="Complete your profile"
        description="Tell us where you officiate. Your association's admin sets your rank."
        submitLabel="Finish setup"
        redirectTo="/"
        initialValues={{
          name: user?.name ?? "",
          country: user?.country ?? "",
          associationId: user?.association?.id ?? null,
          associationName: user?.association?.name ?? null,
          associationCountryCode: user?.association?.countryCode ?? null,
          dateOfBirth: user?.dateOfBirth ? user.dateOfBirth.toISOString() : null,
          heightCm: user?.heightCm ?? null,
          weightKg: user?.weightKg ?? null,
          image: user?.image ?? null,
        }}
      />
    </div>
  );
}
