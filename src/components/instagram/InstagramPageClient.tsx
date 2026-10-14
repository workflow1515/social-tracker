"use client"

import { useState, useCallback, useTransition } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import type { IgAccountRow } from "@/app/(dashboard)/instagram/page"

interface Props {
  accounts:     IgAccountRow[]
  serviceError: string | null
}

function fmt(n: number | null): string {
  if (n == null) return "—"
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M"
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + "K"
  return n.toLocaleString()
}

function DeltaCell({ value }: { value: number | null }) {
  if (value == null) return <span className="text-ink-faint">—</span>
  if (value === 0) return <span className="text-ink-muted">0</span>
  const positive = value > 0
  return (
    <span className={positive ? "text-emerald-600 font-medium" : "text-red-500 font-medium"}>
      {positive ? `+${fmt(value)}` : `−${fmt(Math.abs(value))}`}
    </span>
  )
}

function IGBadge() {
  return (
    <div className="w-5 h-5 rounded-sm bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
      <svg viewBox="0 0 24 24" className="w-3 h-3 fill-white" aria-hidden>
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/>
      </svg>
    </div>
  )
}

export function InstagramPageClient({ accounts, serviceError }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [showAdd, setShowAdd] = useState(false)
  const [newUsername, setNewUsername] = useState("")
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<number | null>(null)
  const [collecting, setCollecting] = useState<number | null>(null)
  const [collectingAll, setCollectingAll] = useState(false)

  const refresh = useCallback(() => startTransition(() => router.refresh()), [router])

  async function addAccount() {
    const username = newUsername.trim().replace(/^@/, "")
    if (!username) return
    setAdding(true)
    setError(null)
    try {
      const res = await fetch("/api/instagram/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? "Failed to add account."); return }
      setShowAdd(false)
      setNewUsername("")
      refresh()
    } finally {
      setAdding(false)
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Stop tracking this account and delete its history?")) return
    setDeleting(id)
    try {
      const res = await fetch(`/api/instagram/accounts/${id}`, { method: "DELETE" })
      if (res.ok) refresh()
      else setError((await res.json()).error ?? "Failed to delete.")
    } finally {
      setDeleting(null)
    }
  }

  async function handleCollect(id: number) {
    setCollecting(id)
    setError(null)
    try {
      const res = await fetch(`/api/instagram/accounts/${id}/collect`, { method: "POST" })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? "Collection failed."); return }
      refresh()
    } finally {
      setCollecting(null)
    }
  }

  async function handleCollectAll() {
    setCollectingAll(true)
    setError(null)
    try {
      const res = await fetch("/api/instagram/collect-all", { method: "POST" })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? "Collection failed."); return }
      const failed = (data.results ?? []).filter((r: { ok: boolean }) => !r.ok)
      if (failed.length) {
        setError(failed.map((f: { username: string; error: string }) => `@${f.username}: ${f.error}`).join(" · "))
      }
      refresh()
    } finally {
      setCollectingAll(false)
    }
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-ink flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white" aria-hidden>
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/>
              </svg>
            </div>
            Instagram
          </h1>
          <p className="text-sm text-ink-muted mt-0.5">
            {accounts.length === 0 ? "No accounts tracked yet" : `${accounts.length} account${accounts.length !== 1 ? "s" : ""} tracked`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/instagram/workers"
            className="text-sm text-ink-muted hover:text-ink underline-offset-2 hover:underline px-2"
          >
            Worker accounts
          </Link>
          <button
            onClick={handleCollectAll}
            disabled={collectingAll || accounts.length === 0}
            className="flex items-center gap-2 border border-warm-border text-sm font-medium px-4 py-2.5 rounded-xl transition hover:bg-warm-hover disabled:opacity-50"
          >
            {collectingAll ? "Collecting…" : "Collect all"}
          </button>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 bg-pink-primary hover:bg-pink-hover text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition shadow-sm"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current stroke-2" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Add Account
          </button>
        </div>
      </div>

      {serviceError && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
          {serviceError}
        </div>
      )}
      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}

      {showAdd && (
        <div className="mb-4 flex items-center gap-2 bg-warm-card border border-warm-border rounded-xl p-3">
          <input
            autoFocus
            value={newUsername}
            onChange={(e) => setNewUsername(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") addAccount() }}
            placeholder="instagram_username"
            className="flex-1 px-3 py-2 text-sm rounded-lg border border-warm-border bg-transparent focus:outline-none"
          />
          <button
            onClick={addAccount}
            disabled={adding}
            className="bg-pink-primary text-white text-sm font-medium px-4 py-2 rounded-lg disabled:opacity-50"
          >
            {adding ? "Adding…" : "Add"}
          </button>
          <button onClick={() => setShowAdd(false)} className="text-sm text-ink-muted px-2">Cancel</button>
        </div>
      )}

      {accounts.length === 0 ? (
        <div className="bg-warm-card border border-warm-border rounded-2xl p-16 text-center shadow-card">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-pink-50 flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-8 h-8 fill-pink-primary" aria-hidden>
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/>
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-ink mb-1">No accounts yet</h2>
          <p className="text-ink-muted text-sm mb-6">Add an Instagram account to start tracking its growth.</p>
          <p className="text-ink-faint text-xs">
            Needs at least one logged-in <Link href="/instagram/workers" className="underline">worker account</Link> to actually collect data.
          </p>
        </div>
      ) : (
        <div className="bg-warm-card border border-warm-border rounded-2xl shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-warm-divide">
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-ink-muted uppercase tracking-wide w-[260px]">Account</th>
                  <th className="px-4 py-3.5 text-right text-xs font-semibold text-ink-muted uppercase tracking-wide">Followers</th>
                  <th className="px-4 py-3.5 text-right text-xs font-semibold text-ink-muted uppercase tracking-wide">Posts</th>
                  <th className="px-4 py-3.5 text-right text-xs font-semibold text-ink-muted uppercase tracking-wide">Total likes</th>
                  <th className="px-4 py-3.5 text-right text-xs font-semibold text-ink-muted uppercase tracking-wide">Total reel views</th>
                  <th className="px-4 py-3.5 text-right text-xs font-semibold text-ink-muted uppercase tracking-wide">+7d</th>
                  <th className="px-4 py-3.5 text-right text-xs font-semibold text-ink-muted uppercase tracking-wide">+14d</th>
                  <th className="px-4 py-3.5 text-right text-xs font-semibold text-ink-muted uppercase tracking-wide">+30d</th>
                  <th className="px-3 py-3.5 w-20"/>
                </tr>
              </thead>
              <tbody className="divide-y divide-warm-divide">
                {accounts.map((acc) => (
                  <tr key={acc.id} className="hover:bg-warm-hover/40 transition-colors group">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        {acc.avatarUrl ? (
                          <Image src={acc.avatarUrl} alt={acc.username} width={36} height={36}
                                 className="rounded-full flex-shrink-0 ring-1 ring-warm-border" />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-pink-50 flex items-center justify-center flex-shrink-0 text-pink-primary font-bold text-sm">
                            {(acc.displayName ?? acc.username).charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <IGBadge />
                            <span className="font-medium text-ink truncate">{acc.displayName ?? acc.username}</span>
                          </div>
                          <div className="text-xs text-ink-muted truncate mt-0.5">@{acc.username}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-right font-medium text-ink tabular-nums">{fmt(acc.followers)}</td>
                    <td className="px-4 py-3.5 text-right text-ink-secondary tabular-nums">{fmt(acc.postsCount)}</td>
                    <td className="px-4 py-3.5 text-right text-ink-secondary tabular-nums">{fmt(acc.totalLikes)}</td>
                    <td className="px-4 py-3.5 text-right text-ink-secondary tabular-nums">{fmt(acc.totalReelViews)}</td>
                    <td className="px-4 py-3.5 text-right tabular-nums"><DeltaCell value={acc.delta7d} /></td>
                    <td className="px-4 py-3.5 text-right tabular-nums"><DeltaCell value={acc.delta14d} /></td>
                    <td className="px-4 py-3.5 text-right tabular-nums"><DeltaCell value={acc.delta30d} /></td>
                    <td className="px-3 py-3.5 text-right whitespace-nowrap">
                      <button
                        onClick={() => handleCollect(acc.id)}
                        disabled={collecting === acc.id}
                        className="p-1.5 rounded-lg text-ink-faint hover:text-pink-primary hover:bg-pink-50 transition opacity-0 group-hover:opacity-100 disabled:opacity-50"
                        title="Collect now"
                      >
                        {collecting === acc.id ? "…" : (
                          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current stroke-2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="23 4 23 10 17 10"/><path d="M1 20v-6h6"/>
                            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                          </svg>
                        )}
                      </button>
                      <button
                        onClick={() => handleDelete(acc.id)}
                        disabled={deleting === acc.id}
                        className="p-1.5 rounded-lg text-ink-faint hover:text-red-500 hover:bg-red-50 transition opacity-0 group-hover:opacity-100 disabled:opacity-50"
                        title="Delete account"
                      >
                        {deleting === acc.id ? "…" : (
                          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current stroke-2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                            <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                          </svg>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
