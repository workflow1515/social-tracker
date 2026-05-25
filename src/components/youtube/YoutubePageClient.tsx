"use client";

import { useState, useCallback, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { AddChannelModal } from "./AddChannelModal";
import type { AccountRow } from "@/app/(dashboard)/youtube/page";

interface Props {
  accounts:      AccountRow[];
  currentUserId: string;
  isAdmin:       boolean;
}

// ── Format helpers ────────────────────────────────────────────────────────────

function fmt(n: number | null): string {
  if (n == null) return "—";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString();
}

function fmtBig(s: string | null): string {
  if (s == null) return "—";
  const n = Number(s);
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + "B";
  if (n >= 1_000_000)     return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000)         return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString();
}

function DeltaCell({ value }: { value: number | string | null }) {
  if (value == null) return <span className="text-ink-faint">—</span>;
  const n = typeof value === "string" ? Number(value) : value;
  if (n === 0) return <span className="text-ink-muted">0</span>;
  const positive = n > 0;
  const abs = Math.abs(n);
  const label = positive ? `+${fmtBig(abs.toString())}` : `−${fmtBig(abs.toString())}`;
  return (
    <span className={positive ? "text-emerald-600 font-medium" : "text-red-500 font-medium"}>
      {label}
    </span>
  );
}

// ── YouTube icon ──────────────────────────────────────────────────────────────
function YTBadge() {
  return (
    <div className="w-5 h-5 rounded-sm bg-red-600 flex items-center justify-center flex-shrink-0">
      <svg viewBox="0 0 24 24" className="w-3 h-3 fill-white" aria-hidden>
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
      </svg>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export function YoutubePageClient({ accounts, currentUserId, isAdmin }: Props) {
  const router = useRouter();
  const [, startTransition]   = useTransition();
  const [showModal, setShowModal] = useState(false);
  const [deleting, setDeleting]   = useState<string | null>(null);

  const refresh = useCallback(() => {
    startTransition(() => router.refresh());
  }, [router]);

  async function handleDelete(id: string) {
    if (!confirm("Delete this channel and all its snapshots?")) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/youtube/accounts/${id}`, { method: "DELETE" });
      if (res.ok) {
        refresh();
      } else {
        const data = await res.json();
        alert(data.error ?? "Failed to delete.");
      }
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-ink flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white" aria-hidden>
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
              </svg>
            </div>
            YouTube
          </h1>
          <p className="text-sm text-ink-muted mt-0.5">
            {accounts.length === 0
              ? "No channels tracked yet"
              : `${accounts.length} channel${accounts.length !== 1 ? "s" : ""} tracked`}
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-pink-primary hover:bg-pink-hover text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition shadow-sm"
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current stroke-2" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Add Channel
        </button>
      </div>

      {/* Table */}
      {accounts.length === 0 ? (
        <div className="bg-warm-card border border-warm-border rounded-2xl p-16 text-center shadow-card">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-red-50 flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-8 h-8 fill-red-500" aria-hidden>
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-ink mb-1">No channels yet</h2>
          <p className="text-ink-muted text-sm mb-6">Add a YouTube channel to start tracking its growth.</p>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 bg-pink-primary hover:bg-pink-hover text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current stroke-2" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Add First Channel
          </button>
        </div>
      ) : (
        <div className="bg-warm-card border border-warm-border rounded-2xl shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-warm-divide">
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-ink-muted uppercase tracking-wide w-[280px]">
                    Channel
                  </th>
                  <th className="px-4 py-3.5 text-right text-xs font-semibold text-ink-muted uppercase tracking-wide">
                    Subscribers
                  </th>
                  <th className="px-4 py-3.5 text-right text-xs font-semibold text-ink-muted uppercase tracking-wide">
                    Total Views
                  </th>
                  <th className="px-4 py-3.5 text-right text-xs font-semibold text-ink-muted uppercase tracking-wide">
                    +7d (subs)
                  </th>
                  <th className="px-4 py-3.5 text-right text-xs font-semibold text-ink-muted uppercase tracking-wide">
                    +14d (subs)
                  </th>
                  <th className="px-4 py-3.5 text-right text-xs font-semibold text-ink-muted uppercase tracking-wide">
                    +30d (subs)
                  </th>
                  <th className="px-4 py-3.5 text-right text-xs font-semibold text-ink-muted uppercase tracking-wide">
                    +30d (views)
                  </th>
                  <th className="px-3 py-3.5 w-12"/>
                </tr>
              </thead>
              <tbody className="divide-y divide-warm-divide">
                {accounts.map((acc) => {
                  const canDelete = isAdmin || acc.addedById === currentUserId;
                  return (
                    <tr key={acc.id} className="hover:bg-warm-hover/40 transition-colors group">
                      {/* Channel identity */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          {acc.avatarUrl ? (
                            <Image
                              src={acc.avatarUrl}
                              alt={acc.name}
                              width={36}
                              height={36}
                              className="rounded-full flex-shrink-0 ring-1 ring-warm-border"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 text-red-500 font-bold text-sm">
                              {acc.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <YTBadge />
                              <span className="font-medium text-ink truncate">{acc.name}</span>
                            </div>
                            <div className="text-xs text-ink-muted truncate mt-0.5">
                              {acc.creatorName} · {acc.externalId}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Stats */}
                      <td className="px-4 py-3.5 text-right font-medium text-ink tabular-nums">
                        {fmt(acc.followers)}
                      </td>
                      <td className="px-4 py-3.5 text-right text-ink-secondary tabular-nums">
                        {fmtBig(acc.views)}
                      </td>

                      {/* Deltas */}
                      <td className="px-4 py-3.5 text-right tabular-nums">
                        <DeltaCell value={acc.delta7d.followers} />
                      </td>
                      <td className="px-4 py-3.5 text-right tabular-nums">
                        <DeltaCell value={acc.delta14d.followers} />
                      </td>
                      <td className="px-4 py-3.5 text-right tabular-nums">
                        <DeltaCell value={acc.delta30d.followers} />
                      </td>
                      <td className="px-4 py-3.5 text-right tabular-nums">
                        <DeltaCell value={acc.delta30d.views} />
                      </td>

                      {/* Actions */}
                      <td className="px-3 py-3.5 text-right">
                        {canDelete && (
                          <button
                            onClick={() => handleDelete(acc.id)}
                            disabled={deleting === acc.id}
                            className="p-1.5 rounded-lg text-ink-faint hover:text-red-500 hover:bg-red-50 transition opacity-0 group-hover:opacity-100 disabled:opacity-50"
                            title="Delete channel"
                          >
                            {deleting === acc.id ? (
                              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                              </svg>
                            ) : (
                              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current stroke-2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6"/>
                                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                                <path d="M10 11v6"/>
                                <path d="M14 11v6"/>
                                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                              </svg>
                            )}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <AddChannelModal
          onClose={() => setShowModal(false)}
          onAdded={refresh}
        />
      )}
    </div>
  );
}
