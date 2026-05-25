import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/permissions";

const createSchema = z.object({
  username: z.string().min(2).max(32).regex(/^[a-z0-9_]+$/),
  name:     z.string().min(1).max(100),
  password: z.string().min(6),
  role:     z.enum(["admin", "user"]),
});

export async function GET() {
  const session = await getServerSession();
  if (!session || !isAdmin(session.user))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const users = await prisma.user.findMany({
    orderBy: { created_at: "asc" },
    select: {
      id: true, username: true, name: true, role: true, is_active: true, created_at: true,
      access_grants: {
        include: { creator: { select: { id: true, name: true } } },
      },
    },
  });
  return NextResponse.json({ data: users });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session || !isAdmin(session.user))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const existing = await prisma.user.findUnique({ where: { username: parsed.data.username } });
  if (existing) return NextResponse.json({ error: "Username already taken" }, { status: 409 });

  const password_hash = await bcrypt.hash(parsed.data.password, 10);
  const user = await prisma.user.create({
    data: {
      username:      parsed.data.username,
      name:          parsed.data.name,
      password_hash,
      role:          parsed.data.role,
    },
    select: { id: true, username: true, name: true, role: true, is_active: true, created_at: true },
  });
  return NextResponse.json({ data: user }, { status: 201 });
}
