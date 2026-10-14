import { NextResponse } from "next/server"
import { getServerSession } from "@/lib/auth"
import { isAdmin } from "@/lib/permissions"
import { igApi, InstagramTrackerError } from "@/lib/instagram-tracker"

// ── POST /api/instagram/collect-all ────────────────────────────────────────
export async function POST() {
  const session = await getServerSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!isAdmin(session.user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  try {
    return NextResponse.json(await igApi.collectAll())
  } catch (err) {
    const status = err instanceof InstagramTrackerError ? err.status : 502
    return NextResponse.json({ error: (err as Error).message }, { status })
  }
}
