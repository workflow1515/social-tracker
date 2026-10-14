/**
 * Thin client for the instagram-tracker Flask service (separate process,
 * binds to 127.0.0.1 only — see /var/www/instagram-tracker on the server).
 * It does the actual Instaloader scraping; this app only reads/writes its
 * JSON API, same relationship as this app has with Postgres.
 */

const BASE_URL = process.env.INSTAGRAM_TRACKER_URL ?? "http://127.0.0.1:5050"
const SECRET   = process.env.INSTAGRAM_TRACKER_SECRET ?? ""

export type IgAccount = {
  id: number
  username: string
  display_name: string | null
  avatar_url: string | null
  created_at: number
  followers: number | null
  posts_count: number | null
  avg_likes: number | null
  avg_comments: number | null
  avg_reel_views: number | null
  taken_at: number | null
}

export type IgMetricSnapshot = {
  id: number
  account_id: number
  followers: number | null
  posts_count: number | null
  avg_likes: number | null
  avg_comments: number | null
  avg_reel_views: number | null
  taken_at: number
}

export type IgWorker = {
  id: number
  username: string
  proxy: string | null
  is_logged_in: number
  last_error: string | null
  created_at: number
}

export class InstagramTrackerError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

async function request(path: string, init?: RequestInit): Promise<{ data: Record<string, unknown>; ok: boolean; status: number }> {
  let res: Response
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: {
        ...(init?.headers ?? {}),
        Authorization: `Bearer ${SECRET}`,
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
      },
      cache: "no-store",
    })
  } catch {
    throw new InstagramTrackerError("The Instagram tracker service isn't reachable.", 503)
  }
  const data = await res.json().catch(() => ({}))
  return { data, ok: res.ok, status: res.status }
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const { data, ok, status } = await request(path, init)
  if (!ok) {
    throw new InstagramTrackerError((data.error as string) ?? `Request failed (${status})`, status)
  }
  return data as T
}

/**
 * For the login/2FA steps, a 400 ({"status": "error", ...}) is an expected
 * outcome the caller handles directly — not a service failure — so unlike
 * call() this returns Flask's body regardless of status instead of throwing.
 */
async function callLoginStep(path: string, init?: RequestInit): Promise<{ status: string; error?: string }> {
  const { data } = await request(path, init)
  return data as { status: string; error?: string }
}

export const igApi = {
  listAccounts:    () => call<IgAccount[]>("/api/accounts"),
  addAccount:      (username: string) => call<{ id: number; username: string }>("/api/accounts", { method: "POST", body: JSON.stringify({ username }) }),
  deleteAccount:   (id: number) => call<{ ok: true }>(`/api/accounts/${id}`, { method: "DELETE" }),
  collectAccount:  (id: number) => call<{ ok: true; metrics: unknown }>(`/api/accounts/${id}/collect`, { method: "POST" }),
  collectAll:      () => call<{ results: { username: string; ok: boolean; error?: string }[] }>("/api/collect-all", { method: "POST" }),
  accountHistory:  (id: number) => call<IgMetricSnapshot[]>(`/api/accounts/${id}/history`),

  listWorkers:     () => call<IgWorker[]>("/api/workers"),
  addWorker:       (username: string, password: string, proxy?: string) =>
    call<IgWorker>("/api/workers", { method: "POST", body: JSON.stringify({ username, password, proxy }) }),
  deleteWorker:    (id: number) => call<{ ok: true }>(`/api/workers/${id}`, { method: "DELETE" }),
  loginWorker:     (id: number) => callLoginStep(`/api/workers/${id}/login`, { method: "POST" }),
  submit2fa:       (id: number, code: string) => callLoginStep(`/api/workers/${id}/2fa`, { method: "POST", body: JSON.stringify({ code }) }),
}
