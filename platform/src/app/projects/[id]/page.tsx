import { requireAuth, isTrialActive } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  createWikiPageAction,
  createNoteAction,
  deleteProjectAction,
} from "@/lib/actions";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireAuth();
  const { id } = await params;

  if (!isTrialActive(session.user)) redirect("/dashboard");

  const project = await prisma.project.findUnique({
    where: { id, userId: session.userId },
    include: {
      pages: { orderBy: { updatedAt: "desc" } },
      notes: { orderBy: { updatedAt: "desc" } },
      entries: { orderBy: { date: "desc" }, take: 20 },
    },
  });

  if (!project) notFound();

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-gray-400 hover:text-white transition">
            &larr; Back
          </Link>
          <h1 className="text-xl font-bold">{project.name}</h1>
        </div>
        <form action={deleteProjectAction}>
          <input type="hidden" name="id" value={project.id} />
          <button className="text-sm text-red-400 hover:text-red-300 transition">
            Delete Project
          </button>
        </form>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="grid md:grid-cols-2 gap-10">
          {/* Wiki Pages */}
          <section>
            <h2 className="text-lg font-semibold mb-4">Wiki Pages</h2>
            <form action={createWikiPageAction} className="flex gap-2 mb-4">
              <input type="hidden" name="projectId" value={project.id} />
              <input
                name="title"
                type="text"
                placeholder="New page title"
                required
                className="flex-1 px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-gray-500"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-white text-black text-sm font-semibold rounded-lg hover:bg-gray-200 transition"
              >
                Add
              </button>
            </form>
            {project.pages.length === 0 ? (
              <p className="text-gray-500 text-sm">No wiki pages yet.</p>
            ) : (
              <ul className="space-y-2">
                {project.pages.map((page) => (
                  <li key={page.id}>
                    <Link
                      href={`/projects/${project.id}/wiki/${page.id}`}
                      className="block p-3 bg-gray-900 border border-gray-800 rounded-lg hover:border-gray-600 transition"
                    >
                      <span className="text-sm font-medium">{page.title}</span>
                      <span className="text-xs text-gray-500 ml-2">
                        {page.updatedAt.toLocaleDateString()}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Notes */}
          <section>
            <h2 className="text-lg font-semibold mb-4">Notes</h2>
            <form action={createNoteAction} className="flex gap-2 mb-4">
              <input type="hidden" name="projectId" value={project.id} />
              <input
                name="title"
                type="text"
                placeholder="New note title"
                required
                className="flex-1 px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-gray-500"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-white text-black text-sm font-semibold rounded-lg hover:bg-gray-200 transition"
              >
                Add
              </button>
            </form>
            {project.notes.length === 0 ? (
              <p className="text-gray-500 text-sm">No notes yet.</p>
            ) : (
              <ul className="space-y-2">
                {project.notes.map((note) => (
                  <li key={note.id}>
                    <Link
                      href={`/projects/${project.id}/notes/${note.id}`}
                      className="block p-3 bg-gray-900 border border-gray-800 rounded-lg hover:border-gray-600 transition"
                    >
                      <span className="text-sm font-medium">{note.title}</span>
                      <span className="text-xs text-gray-500 ml-2">
                        {note.updatedAt.toLocaleDateString()}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* Diary Entries */}
        {project.entries.length > 0 && (
          <section className="mt-10">
            <h2 className="text-lg font-semibold mb-4">Diary Entries</h2>
            <div className="space-y-3">
              {project.entries.map((entry) => (
                <div
                  key={entry.id}
                  className="bg-gray-900 border border-gray-800 rounded-lg p-4"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-xs font-mono text-gray-500">
                      {entry.date.toLocaleDateString()}
                    </span>
                    <span className="text-xs px-2 py-0.5 bg-gray-800 rounded text-gray-400">
                      {entry.branch}
                    </span>
                    {entry.commit && (
                      <span className="text-xs font-mono text-gray-600">
                        {entry.commit.slice(0, 7)}
                      </span>
                    )}
                    <span className="text-xs text-gray-700">
                      {entry.source}
                    </span>
                  </div>
                  <h3 className="font-medium">{entry.summary}</h3>
                  <details className="mt-2">
                    <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-300 transition">
                      Show full entry
                    </summary>
                    <pre className="text-sm text-gray-400 mt-2 whitespace-pre-wrap font-sans leading-relaxed">
                      {entry.content}
                    </pre>
                  </details>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
