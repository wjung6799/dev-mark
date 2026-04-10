import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const adapter = new PrismaLibSql({ url: process.env.DATABASE_URL || "file:./dev.db" });
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = "admin@devdiary.dev";
  const password = "password";

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Seed user already exists: ${email}`);
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      name: "Admin",
      email,
      hashedPassword,
    },
  });

  // Create a default API key
  await prisma.apiKey.create({
    data: {
      key: `dg_${crypto.randomBytes(24).toString("hex")}`,
      name: "default",
      userId: user.id,
    },
  });

  // Create a sample project
  await prisma.project.create({
    data: {
      name: "devDiary",
      userId: user.id,
    },
  });

  console.log(`Seed user created: ${email} / ${password}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
