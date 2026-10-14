import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/auth"
import { isAdmin } from "@/lib/permissions"
import { igApi, InstagramTrackerError } from "@/lib/instagram-tracker"

// ── DELETE /api/instagram/accounts/[id] ────────────────────────────────────
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!isAdmin(session.user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const id = Number(params.id)
  if (!Number.isInteger(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 })

  try {
    return NextResponse.json(await igApi.deleteAccount(id))
  } catch (err) {
    const status = err instanceof InstagramTrackerError ? err.status : 502
    return NextResponse.json({ error: (err as Error).message }, { status })
  }
}
