import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/permissions";
import { YoutubePageClient } from "@/components/youtube/YoutubePageClient";

// ─── Delta calculation ────────────────────────────────────────────────────────
// Find the snapshot taken closest to (but before) N days ago, then subtract
// from the most recent snapshot.

interface SnapshotRow {
  followers: number | null;
  views:     bigint | null;
  taken_at:  Date;
}

function getDelta(
  snapshots: SnapshotRow[],
  latestFollowers: number | null,
  latestViews: bigint | null,
  days: number
): { followersDelta: number | null; viewsDelta: bigint | null } {
  if (snapshots.length < 2) return { followersDelta: null, viewsDelta: null };

  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  // Find the snapshot taken closest to (but before or at) `cutoff`
  const older = snapshots
    .filter((s) => s.taken_at <= cutoff)
    .sort((a, b) => b.taken_at.getTime() - a.taken_at.getTime())[0];

  if (!older) return { followersDelta: null, viewsDelta: null };

  const followersDelta =
    latestFollowers != null && older.followers != null
      ? latestFollowers - older.followers
      : null;

  const viewsDelta =
    latestViews != null && older.views != null
      ? latestViews - older.views
      : null;

  return { followersDelta, viewsDelta };
}

export interface AccountRow {
  id:          string;
  name:        string;
  avatarUrl:   string | null;
  externalId:  string;
  addedById:   string;
  creatorName: string;
  followers:   number | null;
  views:       string | null; // serialized bigint → string
  delta7d:     { followers: number | null; views: string | null };
  delta14d:    { followers: number | null; views: string | null };
  delta30d:    { followers: number | null; views: string | null };
}

export default async function YouTubePage() {
  const session = await getServerSession();
  if (!session) return null; // layout handles redirect

  const user = session.user;
  const admin = isAdmin(user);

  // ── Fetch accounts visible to this user ──────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let accounts: any[];

  if (admin) {
    accounts = await prisma.socialAccount.findMany({
      where: { network: "youtube" },
      include: {
        creator:   { select: { name: true } },
        snapshots: {
          orderBy: { taken_at: "asc" },
          select:  { followers: true, views: true, taken_at: true },
        },
      },
      orderBy: { created_at: "asc" },
    });
  } else {
    // Find all creator+network access grants for this user
    const grants = await prisma.userAccess.findMany({
      where: { user_id: user.id, network: "youtube" },
      select: { creator_id: true, see_all: true },
    });

    if (grants.length === 0) {
      accounts = [];
    } else {
      const seeAllCreatorIds = grants.filter((g) => g.see_all).map((g) => g.creator_id);
      const ownOnlyCreatorIds = grants.filter((g) => !g.see_all).map((g) => g.creator_id);

      accounts = await prisma.socialAccount.findMany({
        where: {
          network: "youtube",
          OR: [
            ...(seeAllCreatorIds.length > 0
              ? [{ creator_id: { in: seeAllCreatorIds } }]
              : []),
            ...(ownOnlyCreatorIds.length > 0
              ? [{ creator_id: { in: ownOnlyCreatorIds }, added_by_id: user.id }]
              : []),
          ],
        },
        include: {
          creator:   { select: { name: true } },
          snapshots: {
            orderBy: { taken_at: "asc" },
            select:  { followers: true, views: true, taken_at: true },
          },
        },
        orderBy: { created_at: "asc" },
      });
    }
  }

  // ── Build serializable rows ───────────────────────────────────────────────
  const rows: AccountRow[] = accounts.map((acc) => {
    const snaps = acc.snapshots;
    const latest = snaps.length > 0 ? snaps[snaps.length - 1] : null;

    const latestFollowers = latest?.followers ?? null;
    const latestViews     = latest?.views     ?? null;

    const d7  = getDelta(snaps, latestFollowers, latestViews, 7);
    const d14 = getDelta(snaps, latestFollowers, latestViews, 14);
    const d30 = getDelta(snaps, latestFollowers, latestViews, 30);

    return {
      id:          acc.id,
      name:        acc.name,
      avatarUrl:   acc.avatar_url,
      externalId:  acc.external_id,
      addedById:   acc.added_by_id,
      creatorName: acc.creator.name,
      followers:   latestFollowers,
      views:       latestViews != null ? latestViews.toString() : null,
      delta7d:  { followers: d7.followersDelta,  views: d7.viewsDelta  != null ? d7.viewsDelta.toString()  : null },
      delta14d: { followers: d14.followersDelta, views: d14.viewsDelta != null ? d14.viewsDelta.toString() : null },
      delta30d: { followers: d30.followersDelta, views: d30.viewsDelta != null ? d30.viewsDelta.toString() : null },
    };
  });

  return (
    <YoutubePageClient
      accounts={rows}
      currentUserId={user.id}
      isAdmin={admin}
    />
  );
}
