import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

async function createRuleAction(formData: FormData) {
  "use server";
  const session = await getSession();
  if (!session) redirect("/login");

  const title = formData.get("title") as string;
  const content = formData.get("content") as string;
  if (!title || !content) return;

  await prisma.rule.create({
    data: { title, content, userId: session.userId },
  });

  redirect("/rules");
}

async function deleteRuleAction(formData: FormData) {
  "use server";
  const session = await getSession();
  if (!session) redirect("/login");

  const id = formData.get("id") as string;
  const rule = await prisma.rule.findUnique({ where: { id } });
  if (rule && rule.userId === session.userId) {
    await prisma.rule.delete({ where: { id } });
  }

  redirect("/rules");
}

export default async function RulesPage() {
  const session = await requireAuth();

  const rules = await prisma.rule.findMany({
    where: { userId: session.userId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="text-gray-400 hover:text-white transition"
          >
            &larr; Dashboard
          </Link>
          <h1 className="text-xl font-bold">Rules</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">
        <p className="text-gray-400 mb-8">
          Rules are instructions that get loaded into your AI assistant&apos;s
          context. Use them to define coding standards, project conventions, or
          anything you want the AI to always follow.
        </p>

        {/* Create new rule */}
        <form action={createRuleAction} className="mb-10">
          <div className="space-y-4 bg-gray-900 border border-gray-800 rounded-lg p-6">
            <input
              name="title"
              type="text"
              placeholder="Rule title (e.g., 'Always use TypeScript strict mode')"
              required
              className="w-full px-4 py-2 bg-gray-950 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-gray-500"
            />
            <textarea
              name="content"
              placeholder="Rule content — what should the AI do or avoid?"
              required
              rows={4}
              className="w-full px-4 py-2 bg-gray-950 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-gray-500 resize-y"
            />
            <button
              type="submit"
              className="px-5 py-2 bg-white text-black font-semibold rounded-lg hover:bg-gray-200 transition"
            >
              Add Rule
            </button>
          </div>
        </form>

        {/* Existing rules */}
        {rules.length === 0 ? (
          <p className="text-gray-500">
            No rules yet. Add one above to get started.
          </p>
        ) : (
          <div className="space-y-4">
            {rules.map((rule) => (
              <div
                key={rule.id}
                className="bg-gray-900 border border-gray-800 rounded-lg p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="font-medium text-lg">{rule.title}</h3>
                    <pre className="text-gray-400 text-sm mt-2 whitespace-pre-wrap font-sans">
                      {rule.content}
                    </pre>
                    <p className="text-xs text-gray-600 mt-3">
                      Added {rule.createdAt.toLocaleDateString()}
                    </p>
                  </div>
                  <form action={deleteRuleAction}>
                    <input type="hidden" name="id" value={rule.id} />
                    <button className="text-sm text-red-400 hover:text-red-300 transition">
                      Delete
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
