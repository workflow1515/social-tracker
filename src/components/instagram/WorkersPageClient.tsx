"use client"

import { useState, useCallback, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import type { IgWorker } from "@/lib/instagram-tracker"

interface Props {
  workers:      IgWorker[]
  serviceError: string | null
}

export function WorkersPageClient({ workers, serviceError }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [proxy, setProxy]       = useState("")
  const [adding, setAdding]     = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [busyId, setBusyId]     = useState<number | null>(null)
  const [twoFaFor, setTwoFaFor] = useState<number | null>(null)
  const [twoFaCode, setTwoFaCode] = useState("")

  const refresh = useCallback(() => startTransition(() => router.refresh()), [router])

  async function addWorker() {
    if (!username.trim() || !password) { setError("Username and password are required."); return }
    setAdding(true)
    setError(null)
    try {
      const res = await fetch("/api/instagram/workers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password, proxy: proxy.trim() || undefined }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? "Failed to add worker."); return }
      setUsername(""); setPassword(""); setProxy("")
      refresh()
    } finally {
      setAdding(false)
    }
  }

  async function removeWorker(id: number) {
    if (!confirm("Delete this worker account?")) return
    setBusyId(id)
    try {
      await fetch(`/api/instagram/workers/${id}`, { method: "DELETE" })
      refresh()
    } finally {
      setBusyId(null)
    }
  }

  async function login(id: number) {
    setBusyId(id)
    setError(null)
    try {
      const res = await fetch(`/api/instagram/workers/${id}/login`, { method: "POST" })
      const data = await res.json()
      if (data.status === "two_factor_required") { setTwoFaFor(id); return }
      if (data.status === "error") { setError(data.error); return }
      refresh()
    } finally {
      setBusyId(null)
    }
  }

  async function submit2fa(id: number) {
    if (!twoFaCode.trim()) return
    setBusyId(id)
    setError(null)
    try {
      const res = await fetch(`/api/instagram/workers/${id}/2fa`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: twoFaCode.trim() }),
      })
      const data = await res.json()
      if (data.status === "error") { setError(data.error); return }
      setTwoFaFor(null)
      setTwoFaCode("")
      refresh()
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="p-6 lg:p-8 max-w-4xl">
      <div className="mb-6">
        <Link href="/instagram" className="text-sm text-ink-muted hover:text-ink underline-offset-2 hover:underline">← Accounts</Link>
        <h1 className="text-2xl font-bold text-ink mt-2">Worker accounts</h1>
        <p className="text-sm text-ink-muted mt-1 max-w-2xl">
          These are the Instagram accounts used to do the scraping, not the accounts being tracked.
          Add one, hit Login, and enter a 2FA code if Instagram asks for one. Once logged in, the
          session is reused — no password prompt again unless it expires.
        </p>
      </div>

      {serviceError && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">{serviceError}</div>
      )}
      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>
      )}

      <div className="flex flex-wrap items-center gap-2 mb-5 bg-warm-card border border-warm-border rounded-xl p-3">
        <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="worker username"
               className="px-3 py-2 text-sm rounded-lg border border-warm-border bg-transparent focus:outline-none" />
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="password"
               className="px-3 py-2 text-sm rounded-lg border border-warm-border bg-transparent focus:outline-none" />
        <input value={proxy} onChange={(e) => setProxy(e.target.value)} placeholder="proxy (optional) http://user:pass@host:port"
               className="flex-1 min-w-[260px] px-3 py-2 text-sm rounded-lg border border-warm-border bg-transparent focus:outline-none" />
        <button onClick={addWorker} disabled={adding}
                className="bg-pink-primary text-white text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-50">
          {adding ? "Adding…" : "Add worker"}
        </button>
      </div>

      <div className="bg-warm-card border border-warm-border rounded-2xl shadow-card overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-warm-divide">
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-ink-muted uppercase tracking-wide">Username</th>
              <th className="px-4 py-3.5 text-left text-xs font-semibold text-ink-muted uppercase tracking-wide">Proxy</th>
              <th className="px-4 py-3.5 text-left text-xs font-semibold text-ink-muted uppercase tracking-wide">Status</th>
              <th className="px-3 py-3.5"/>
            </tr>
          </thead>
          <tbody className="divide-y divide-warm-divide">
            {workers.length === 0 && (
              <tr><td colSpan={4} className="px-5 py-8 text-center text-ink-muted">No worker accounts yet.</td></tr>
            )}
            {workers.map((w) => (
              <tr key={w.id}>
                <td className="px-5 py-3.5 font-medium text-ink">@{w.username}</td>
                <td className="px-4 py-3.5 text-ink-muted">{w.proxy || "—"}</td>
                <td className="px-4 py-3.5">
                  {w.is_logged_in ? (
                    <span className="text-emerald-600 font-medium">logged in</span>
                  ) : w.last_error ? (
                    <span className="text-red-500" title={w.last_error}>error</span>
                  ) : (
                    <span className="text-ink-muted">not logged in</span>
                  )}
                </td>
                <td className="px-3 py-3.5 text-right whitespace-nowrap">
                  {twoFaFor === w.id ? (
                    <span className="flex items-center gap-1.5 justify-end">
                      <input
                        autoFocus
                        value={twoFaCode}
                        onChange={(e) => setTwoFaCode(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") submit2fa(w.id) }}
                        placeholder="2FA code"
                        className="w-24 px-2 py-1.5 text-sm rounded-lg border border-warm-border bg-transparent focus:outline-none"
                      />
                      <button onClick={() => submit2fa(w.id)} disabled={busyId === w.id}
                              className="text-sm px-3 py-1.5 rounded-lg bg-pink-primary text-white disabled:opacity-50 whitespace-nowrap">
                        Submit
                      </button>
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 justify-end">
                      <button onClick={() => login(w.id)} disabled={busyId === w.id}
                              className="text-sm px-3 py-1.5 rounded-lg border border-warm-border hover:bg-warm-hover disabled:opacity-50 whitespace-nowrap">
                        {busyId === w.id ? "…" : "Login"}
                      </button>
                      <button onClick={() => removeWorker(w.id)} disabled={busyId === w.id}
                              className="text-sm px-3 py-1.5 rounded-lg border border-warm-border hover:bg-warm-hover disabled:opacity-50 whitespace-nowrap">
                        Delete
                      </button>
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  )
}
