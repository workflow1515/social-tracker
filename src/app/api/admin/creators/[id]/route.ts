import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/permissions";

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession();
  if (!session || !isAdmin(session.user))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.creator.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
