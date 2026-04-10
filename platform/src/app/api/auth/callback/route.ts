import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import crypto from "crypto";
import { redirect } from "next/navigation";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const callbackUrl = searchParams.get("callback");

  if (!callbackUrl) {
    return Response.json({ error: "callback is required" }, { status: 400 });
  }

  // User must be logged in via session
  const session = await getSession();
  if (!session) {
    // Redirect to login with the callback preserved
    const loginUrl = `/login?callback=${encodeURIComponent(callbackUrl)}`;
    redirect(loginUrl);
  }

  // Generate or reuse API key
  let apiKey = await prisma.apiKey.findFirst({
    where: { userId: session.userId, name: "cli" },
  });

  if (!apiKey) {
    apiKey = await prisma.apiKey.create({
      data: {
        key: `dg_${crypto.randomBytes(24).toString("hex")}`,
        name: "cli",
        userId: session.userId,
      },
    });
  }

  // Redirect to the CLI's local callback server with credentials
  const url = new URL(callbackUrl);
  url.searchParams.set("apiKey", apiKey.key);
  url.searchParams.set("email", session.user.email);
  url.searchParams.set("userId", session.user.id);

  redirect(url.toString());
}
