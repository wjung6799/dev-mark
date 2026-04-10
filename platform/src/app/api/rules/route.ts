import { prisma } from "@/lib/prisma";
import { authenticateApiKey } from "@/lib/api-auth";
import { getSession } from "@/lib/auth";

async function getUserId(request: Request): Promise<string | null> {
  // Try API key first (CLI), then session (browser)
  const apiKey = await authenticateApiKey(request);
  if (apiKey) return apiKey.userId;

  const session = await getSession();
  if (session) return session.userId;

  return null;
}

export async function GET(request: Request) {
  const userId = await getUserId(request);
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rules = await prisma.rule.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  return Response.json({ rules });
}

export async function POST(request: Request) {
  const userId = await getUserId(request);
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { title, content } = body;

  if (!title || !content) {
    return Response.json({ error: "title and content are required" }, { status: 400 });
  }

  const rule = await prisma.rule.create({
    data: { title, content, userId },
  });

  return Response.json({ rule });
}

export async function DELETE(request: Request) {
  const userId = await getUserId(request);
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return Response.json({ error: "id is required" }, { status: 400 });
  }

  // Verify ownership
  const rule = await prisma.rule.findUnique({ where: { id } });
  if (!rule || rule.userId !== userId) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.rule.delete({ where: { id } });
  return Response.json({ deleted: true });
}

export async function PUT(request: Request) {
  const userId = await getUserId(request);
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { id, title, content } = body;

  if (!id || !title || !content) {
    return Response.json({ error: "id, title, and content are required" }, { status: 400 });
  }

  const rule = await prisma.rule.findUnique({ where: { id } });
  if (!rule || rule.userId !== userId) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await prisma.rule.update({
    where: { id },
    data: { title, content },
  });

  return Response.json({ rule: updated });
}
