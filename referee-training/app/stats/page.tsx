import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function MyTrainingPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/auth/login?callbackUrl=/stats");
  }

  const userId = session.user.id;

  const categories = await prisma.category.findMany({
    include: {
      testSessions: {
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      trainingAssignments: {
        where: { userId },
      },
    },
    orderBy: { order: "asc" },
  });

  const history = await prisma.testSession.findMany({
    where: { userId },
    include: { category: true },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  const totalTests = history.length;
  const average =
    history.filter((h) => h.score !== null).reduce((sum, h) => sum + (h.score ?? 0), 0) /
    (history.filter((h) => h.score !== null).length || 1);

  return (
    <div className="mx-auto max-w-screen-xl px-6 py-10 space-y-8">
      {/* Header */}
      <div>
        <div className="w-12 h-1 bg-gradient-to-r from-warm to-cyan-500 rounded-full mb-4" />
        <h1 className="text-3xl font-bold text-premium">Stats</h1>
        <p className="mt-2 text-text-secondary">Track your progress and performance</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="space-y-1">
          <p className="text-sm text-text-secondary">Total tests completed</p>
          <p className="text-3xl font-bold text-cyan-500">{totalTests}</p>
        </Card>
        <Card className="space-y-1">
          <p className="text-sm text-text-secondary">Average score</p>
          <p className="text-3xl font-bold text-cyan-500">
            {Number.isFinite(average) ? average.toFixed(1) : "0.0"}
          </p>
        </Card>
        <Card className="space-y-1">
          <p className="text-sm text-text-secondary">Assignments pending</p>
          <p className="text-3xl font-bold text-cyan-500">
            {categories.reduce(
              (sum, c) =>
                sum + c.trainingAssignments.filter((a) => a.status !== "COMPLETED").length,
              0
            )}
          </p>
        </Card>
      </div>

      {/* Category Performance */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-text-primary">
          Category performance
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => {
            const lastSession = category.testSessions[0];
            const pending = category.trainingAssignments.filter((a) => a.status !== "COMPLETED").length;
            return (
              <Card key={category.id} hoverable className="space-y-3">
                <p className="text-xs uppercase tracking-widest text-cyan-500">
                  {category.type}
                </p>
                <h3 className="text-lg font-semibold text-text-primary">
                  {category.name}
                </h3>
                <div className="space-y-1">
                  <p className="text-sm text-text-secondary">
                    Last score: <span className="text-text-primary font-medium">{lastSession?.score ?? "—"}</span>
                  </p>
                  <p className="text-sm text-text-secondary">
                    Pending: <span className="text-text-primary font-medium">{pending}</span>
                  </p>
                </div>
                <Button variant="ghost" size="sm" asChild>
                  <Link href={category.type === "CHALLENGE" ? `/practice/${category.slug}` : category.type === "VAR" ? "/practice/var" : category.type === "AR" ? "/practice/ar" : "/laws/test"}>
                    Practice now →
                  </Link>
                </Button>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Recent History */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-text-primary">
          Recent history
        </h2>
        <Card padded={false}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-dark-700 text-left text-text-secondary border-b border-dark-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Score</th>
                </tr>
              </thead>
              <tbody>
                {history.map((item) => (
                  <tr key={item.id} className="border-t border-dark-600 hover:bg-dark-700/50 transition-colors">
                    <td className="px-4 py-3 text-text-primary">{new Date(item.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-text-primary">{item.category?.name ?? "Category"}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex px-2 py-0.5 text-xs rounded-full bg-cyan-500/20 text-cyan-500">
                        {item.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-cyan-500">{item.score ?? "—"}</td>
                  </tr>
                ))}
                {history.length === 0 && (
                  <tr>
                    <td className="px-4 py-8 text-center text-text-muted" colSpan={4}>
                      No test history yet. Start training to see your progress!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
