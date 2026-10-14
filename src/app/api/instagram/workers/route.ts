import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/auth"
import { isAdmin } from "@/lib/permissions"
import { igApi, InstagramTrackerError } from "@/lib/instagram-tracker"

// ── GET /api/instagram/workers ─────────────────────────────────────────────
export async function GET() {
  const session = await getServerSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!isAdmin(session.user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  try {
    return NextResponse.json(await igApi.listWorkers())
  } catch (err) {
    const status = err instanceof InstagramTrackerError ? err.status : 502
    return NextResponse.json({ error: (err as Error).message }, { status })
  }
}

// ── POST /api/instagram/workers ────────────────────────────────────────────
// Body: { username: string, password: string, proxy?: string }
export async function POST(req: NextRequest) {
  const session = await getServerSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!isAdmin(session.user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  let body: { username?: string; password?: string; proxy?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const username = body.username?.trim()
  const password = body.password ?? ""
  if (!username || !password) {
    return NextResponse.json({ error: "Username and password are required." }, { status: 400 })
  }

  try {
    return NextResponse.json(await igApi.addWorker(username, password, body.proxy?.trim()), { status: 201 })
  } catch (err) {
    const status = err instanceof InstagramTrackerError ? err.status : 502
    return NextResponse.json({ error: (err as Error).message }, { status })
  }
}
