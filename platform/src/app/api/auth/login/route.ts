import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import crypto from "crypto";

export async function POST(request: Request) {
  const body = await request.json();
  const { email, password } = body;

  if (!email || !password) {
    return Response.json({ error: "Email and password are required" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return Response.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const valid = await bcrypt.compare(password, user.hashedPassword);
  if (!valid) {
    return Response.json({ error: "Invalid credentials" }, { status: 401 });
  }

  // Check for existing API key, or create one
  let apiKey = await prisma.apiKey.findFirst({
    where: { userId: user.id, name: "default" },
  });

  if (!apiKey) {
    apiKey = await prisma.apiKey.create({
      data: {
        key: `dg_${crypto.randomBytes(24).toString("hex")}`,
        name: "default",
        userId: user.id,
      },
    });
  }

  return Response.json({
    apiKey: apiKey.key,
    userId: user.id,
    email: user.email,
  });
}
