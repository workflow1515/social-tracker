import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/permissions";

const schema = z.object({ name: z.string().min(1).max(100) });

export async function GET() {
  const session = await getServerSession();
  if (!session || !isAdmin(session.user))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const creators = await prisma.creator.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json({ data: creators });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session || !isAdmin(session.user))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const creator = await prisma.creator.create({ data: { name: parsed.data.name } });
  return NextResponse.json({ data: creator }, { status: 201 });
}
