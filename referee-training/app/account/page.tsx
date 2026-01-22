import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProfileForm } from "@/components/account/ProfileForm";

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
      level: true,
    },
  });

  if (!user) {
    redirect("/auth/login");
  }

  return (
    <div className="min-h-screen bg-dark-900 text-white px-6 py-12">
      <ProfileForm
        title="Your profile"
        description="Update your basic account information."
        submitLabel="Save changes"
        initialValues={{
          name: user.name ?? "",
          country: user.country ?? "",
          level: user.level ?? "",
        }}
      />
    </div>
  );
}
