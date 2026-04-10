"use server";

import { prisma } from "./prisma";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { getSession } from "./auth";

export async function registerAction(_prev: { error: string } | null, formData: FormData) {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Email and password are required" };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "Email already registered" };
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { name, email, hashedPassword },
  });

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await prisma.session.create({
    data: { userId: user.id, token, expiresAt },
  });

  const cookieStore = await cookies();
  cookieStore.set("session_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: expiresAt,
    path: "/",
  });

  redirect("/dashboard");
}

export async function loginAction(_prev: { error: string } | null, formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Email and password are required" };
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return { error: "Invalid credentials" };
  }

  const valid = await bcrypt.compare(password, user.hashedPassword);
  if (!valid) {
    return { error: "Invalid credentials" };
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await prisma.session.create({
    data: { userId: user.id, token, expiresAt },
  });

  const cookieStore = await cookies();
  cookieStore.set("session_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: expiresAt,
    path: "/",
  });

  // If there's a callback (CLI login flow), redirect to the callback handler
  const callbackUrl = formData.get("callback") as string;
  if (callbackUrl) {
    redirect(`/api/auth/callback?callback=${encodeURIComponent(callbackUrl)}`);
  }

  redirect("/dashboard");
}

export async function logoutAction() {
  const cookieStore = await cookies();
  const token = cookieStore.get("session_token")?.value;
  if (token) {
    await prisma.session.delete({ where: { token } }).catch(() => {});
  }
  cookieStore.delete("session_token");
  redirect("/login");
}

export async function createProjectAction(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");

  const name = formData.get("name") as string;
  if (!name) return;

  const project = await prisma.project.create({
    data: { name, userId: session.userId },
  });

  redirect(`/projects/${project.id}`);
}

export async function createWikiPageAction(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");

  const projectId = formData.get("projectId") as string;
  const title = formData.get("title") as string;
  if (!title) return;

  await prisma.wikiPage.create({
    data: { title, projectId },
  });

  redirect(`/projects/${projectId}`);
}

export async function createNoteAction(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");

  const projectId = formData.get("projectId") as string;
  const title = formData.get("title") as string;
  if (!title) return;

  await prisma.note.create({
    data: { title, projectId },
  });

  redirect(`/projects/${projectId}`);
}

export async function updateWikiPageAction(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");

  const id = formData.get("id") as string;
  const title = formData.get("title") as string;
  const content = formData.get("content") as string;

  await prisma.wikiPage.update({
    where: { id },
    data: { title, content },
  });

  const page = await prisma.wikiPage.findUnique({ where: { id } });
  redirect(`/projects/${page?.projectId}`);
}

export async function updateNoteAction(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");

  const id = formData.get("id") as string;
  const title = formData.get("title") as string;
  const content = formData.get("content") as string;

  await prisma.note.update({
    where: { id },
    data: { title, content },
  });

  const note = await prisma.note.findUnique({ where: { id } });
  redirect(`/projects/${note?.projectId}`);
}

export async function deleteProjectAction(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");

  const id = formData.get("id") as string;
  await prisma.project.delete({ where: { id } });

  redirect("/dashboard");
}
