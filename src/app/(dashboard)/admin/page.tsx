import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth";
import { isAdmin } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { AdminUsers } from "@/components/admin/AdminUsers";

export const metadata = { title: "Admin — Social Tracker" };

export default async function AdminPage() {
  const session = await getServerSession();
  if (!session || !isAdmin(session.user)) redirect("/youtube");

  const [users, creators] = await Promise.all([
    prisma.user.findMany({
      orderBy: { created_at: "asc" },
      select: {
        id: true, username: true, name: true, role: true, is_active: true, created_at: true,
        access_grants: { include: { creator: { select: { id: true, name: true } } } },
      },
    }),
    prisma.creator.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <AdminUsers users={users as any} creators={creators} currentUserId={session.user.id} />
  );
}
