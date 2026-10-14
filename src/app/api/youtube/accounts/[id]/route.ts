import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { isAdmin } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

// ── DELETE /api/youtube/accounts/[id] ────────────────────────────────────────
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = params;
  const user   = session.user;
  const admin  = isAdmin(user);

  const account = await prisma.socialAccount.findUnique({ where: { id } });
  if (!account) return NextResponse.json({ error: "Account not found." }, { status: 404 });

  if (!admin && account.added_by_id !== user.id)
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  await prisma.socialAccount.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

// ── PATCH /api/youtube/accounts/[id] ─────────────────────────────────────────
// Updates notes. Any authenticated user can edit notes on any account.
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body  = await req.json().catch(() => ({}));
  const notes = typeof body.notes === "string" ? body.notes : null;

  const account = await prisma.socialAccount.findUnique({ where: { id: params.id } });
  if (!account) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const updated = await prisma.socialAccount.update({
    where: { id: params.id },
    data:  { notes },
  });

  return NextResponse.json({ ok: true, notes: updated.notes });
}
