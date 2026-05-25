/**
 * PUT /api/admin/users/[id]/access
 * Replaces all access grants for a user.
 * Body: { grants: [{ creator_id, network, see_all }] }
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/permissions";

const schema = z.object({
  grants: z.array(z.object({
    creator_id: z.string(),
    network:    z.enum(["youtube", "instagram", "twitter"]),
    see_all:    z.boolean(),
  })),
});

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession();
  if (!session || !isAdmin(session.user))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  await prisma.userAccess.deleteMany({ where: { user_id: params.id } });

  if (parsed.data.grants.length > 0) {
    await prisma.userAccess.createMany({
      data: parsed.data.grants.map((g) => ({
        user_id:    params.id,
        creator_id: g.creator_id,
        network:    g.network,
        see_all:    g.see_all,
      })),
      skipDuplicates: true,
    });
  }

  return NextResponse.json({ ok: true });
}
