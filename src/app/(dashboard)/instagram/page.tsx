import { getServerSession } from "@/lib/auth"
import { isAdmin } from "@/lib/permissions"
import { igApi, InstagramTrackerError } from "@/lib/instagram-tracker"
import { InstagramPageClient } from "@/components/instagram/InstagramPageClient"

// ─── Delta calculation (same approach as the YouTube page) ────────────────────

interface SnapshotRow {
  followers:      number | null
  avg_reel_views: number | null
  taken_at:       number // unix seconds, from the Flask API
}

function getDelta(snapshots: SnapshotRow[], latestFollowers: number | null, days: number): number | null {
  if (snapshots.length < 2) return null
  const cutoff = Date.now() / 1000 - days * 24 * 60 * 60
  const older = snapshots.filter((s) => s.taken_at <= cutoff).sort((a, b) => b.taken_at - a.taken_at)[0]
  if (!older) return null
  if (latestFollowers == null || older.followers == null) return null
  return latestFollowers - older.followers
}

export interface IgAccountRow {
  id:            number
  username:      string
  displayName:   string | null
  avatarUrl:     string | null
  followers:     number | null
  postsCount:    number | null
  avgLikes:      number | null
  avgComments:   number | null
  avgReelViews:  number | null
  delta7d:       number | null
  delta14d:      number | null
  delta30d:      number | null
}

export default async function InstagramPage() {
  const session = await getServerSession()
  if (!session) return null // layout handles redirect

  const admin = isAdmin(session.user)
  // Per-creator sharing (like YouTube's UserAccess) isn't wired up for
  // Instagram yet — everyone who can reach this page sees everything, so for
  // now it's admin-only. Extend this the same way YouTube does if that's needed.
  if (!admin) return null

  let rows: IgAccountRow[] = []
  let serviceError: string | null = null

  try {
    const accounts = await igApi.listAccounts()
    const histories = await Promise.all(accounts.map((a) => igApi.accountHistory(a.id)))

    rows = accounts.map((acc, i) => {
      const history = histories[i]
      return {
        id:           acc.id,
        username:     acc.username,
        displayName:  acc.display_name,
        avatarUrl:    acc.avatar_url,
        followers:    acc.followers,
        postsCount:   acc.posts_count,
        avgLikes:     acc.avg_likes,
        avgComments:  acc.avg_comments,
        avgReelViews: acc.avg_reel_views,
        delta7d:      getDelta(history, acc.followers, 7),
        delta14d:     getDelta(history, acc.followers, 14),
        delta30d:     getDelta(history, acc.followers, 30),
      }
    })
  } catch (err) {
    serviceError = err instanceof InstagramTrackerError ? err.message : "Failed to load Instagram data."
  }

  return <InstagramPageClient accounts={rows} serviceError={serviceError} />
}
