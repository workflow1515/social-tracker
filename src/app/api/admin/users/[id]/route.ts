import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/permissions";

const patchSchema = z.object({
  name:      z.string().min(1).max(100).optional(),
  password:  z.string().min(6).optional(),
  is_active: z.boolean().optional(),
  role:      z.enum(["admin", "user"]).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession();
  if (!session || !isAdmin(session.user))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { password, ...rest } = parsed.data;
  const data: Record<string, unknown> = { ...rest };
  if (password) data.password_hash = await bcrypt.hash(password, 10);

  const user = await prisma.user.update({
    where: { id: params.id },
    data,
    select: { id: true, username: true, name: true, role: true, is_active: true },
  });
  return NextResponse.json({ data: user });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession();
  if (!session || !isAdmin(session.user))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (params.id === session.user.id)
    return NextResponse.json({ error: "Cannot delete yourself" }, { status: 400 });

  await prisma.user.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
