import { prisma } from "@/lib/prisma";
import { authenticateApiKey } from "@/lib/api-auth";

export async function POST(request: Request) {
  const apiKey = await authenticateApiKey(request);
  if (!apiKey) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { projectName, entry } = body;

  if (!projectName || !entry) {
    return Response.json({ error: "projectName and entry are required" }, { status: 400 });
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

  // Upsert the diary entry (dedup by project + date + branch + commit)
  const entryDate = new Date(entry.date);
  const diaryEntry = await prisma.diaryEntry.upsert({
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
      source: entry.source || "sync",
      projectId: project.id,
    },
  });

  return Response.json({ id: diaryEntry.id, projectId: project.id });
}
