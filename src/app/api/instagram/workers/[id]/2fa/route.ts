import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/auth"
import { isAdmin } from "@/lib/permissions"
import { igApi, InstagramTrackerError } from "@/lib/instagram-tracker"

// ── POST /api/instagram/workers/[id]/2fa ───────────────────────────────────
// Body: { code: string }
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!isAdmin(session.user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const id = Number(params.id)
  if (!Number.isInteger(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 })

  let body: { code?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const code = body.code?.trim()
  if (!code) return NextResponse.json({ error: "2FA code is required." }, { status: 400 })

  try {
    return NextResponse.json(await igApi.submit2fa(id, code))
  } catch (err) {
    const status = err instanceof InstagramTrackerError ? err.status : 502
    return NextResponse.json({ error: (err as Error).message }, { status })
  }
}
