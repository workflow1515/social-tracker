import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { isAdmin } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

// ── DELETE /api/youtube/accounts/[id] ────────────────────────────────────────
// Admin can delete any account; user can only delete accounts they added.

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = params;
  const user   = session.user;
  const admin  = isAdmin(user);

  const account = await prisma.socialAccount.findUnique({
    where: { id },
  });

  if (!account) {
    return NextResponse.json({ error: "Account not found." }, { status: 404 });
  }

  if (!admin && account.added_by_id !== user.id) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  // Snapshots are cascade-deleted via Prisma schema
  await prisma.socialAccount.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
