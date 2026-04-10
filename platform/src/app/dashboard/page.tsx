import { requireAuth, isTrialActive, trialDaysRemaining } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createProjectAction, logoutAction } from "@/lib/actions";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await requireAuth();
  const user = session.user;
  const active = isTrialActive(user);
  const daysLeft = trialDaysRemaining(user);

  const projects = await prisma.project.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { pages: true, notes: true } },
    },
  });

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">Dev Diary</h1>
        <div className="flex items-center gap-4">
          <Link
            href="/rules"
            className="text-sm text-gray-400 hover:text-white transition"
          >
            Rules
          </Link>
          {!user.isPaid && active && (
            <span className="text-sm text-yellow-400">
              {daysLeft} days left in trial
            </span>
          )}
          {!active && (
            <span className="text-sm text-red-400">
              Trial expired — upgrade to continue
            </span>
          )}
          <span className="text-sm text-gray-400">{user.email}</span>
          <form action={logoutAction}>
            <button className="text-sm text-gray-500 hover:text-white transition">
              Log out
            </button>
          </form>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-semibold">Projects</h2>
        </div>

        {active ? (
          <>
            <form action={createProjectAction} className="flex gap-3 mb-8">
              <input
                name="name"
                type="text"
                placeholder="New project name"
                required
                className="flex-1 px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-gray-500"
              />
              <button
                type="submit"
                className="px-5 py-2 bg-white text-black font-semibold rounded-lg hover:bg-gray-200 transition"
              >
                Create
              </button>
            </form>

            {projects.length === 0 ? (
              <p className="text-gray-500">
                No projects yet. Create one above to get started.
              </p>
            ) : (
              <div className="grid gap-4">
                {projects.map((project) => (
                  <Link
                    key={project.id}
                    href={`/projects/${project.id}`}
                    className="block p-5 bg-gray-900 border border-gray-800 rounded-lg hover:border-gray-600 transition"
                  >
                    <h3 className="text-lg font-medium">{project.name}</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {project._count.pages} wiki pages &middot;{" "}
                      {project._count.notes} notes
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-20">
            <p className="text-gray-400 mb-4">
              Your trial has expired. Upgrade to continue using Dev Diary.
            </p>
            <button className="px-6 py-3 bg-white text-black font-semibold rounded-lg hover:bg-gray-200 transition">
              Upgrade Now
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
