import { prisma } from "@/lib/prisma";
import { authenticateApiKey } from "@/lib/api-auth";

interface ImportEntry {
  date: string;
  branch: string;
  commit: string;
  summary: string;
  content: string;
}

export async function POST(request: Request) {
  const apiKey = await authenticateApiKey(request);
  if (!apiKey) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { projectName, entries } = body as { projectName: string; entries: ImportEntry[] };

  if (!projectName || !entries || !Array.isArray(entries)) {
    return Response.json({ error: "projectName and entries[] are required" }, { status: 400 });
  }

  // Find or create project
  let project = await prisma.project.findFirst({
    where: { name: projectName, userId: apiKey.userId },
  });

  if (!project) {
    project = await prisma.project.create({
      data: { name: projectName, userId: apiKey.userId },
    });
  }

  let imported = 0;
  let skipped = 0;

  for (const entry of entries) {
    try {
      const entryDate = new Date(entry.date);
      await prisma.diaryEntry.upsert({
        where: {
          projectId_date_branch_commit: {
            projectId: project.id,
            date: entryDate,
            branch: entry.branch || "main",
            commit: entry.commit || "",
          },
        },
        update: {
          summary: entry.summary,
          content: entry.content,
        },
        create: {
          date: entryDate,
          branch: entry.branch || "main",
          commit: entry.commit || "",
          summary: entry.summary,
          content: entry.content,
          source: "import",
          projectId: project.id,
        },
      });
      imported++;
    } catch {
      skipped++;
    }
  }

  return Response.json({ projectId: project.id, imported, skipped });
}
