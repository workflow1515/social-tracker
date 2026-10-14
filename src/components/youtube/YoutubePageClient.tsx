"use client";

import { useState, useCallback, useTransition, useRef, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { AddChannelModal } from "./AddChannelModal";
import type { AccountRow, CreatorOption } from "@/app/(dashboard)/youtube/page";

interface Props {
  accounts:      AccountRow[];
  creators:      CreatorOption[];
  currentUserId: string;
  isAdmin:       boolean;
}

const PILL_COLORS = [
  "bg-pink-100 text-pink-700 ring-pink-300",
  "bg-violet-100 text-violet-700 ring-violet-300",
  "bg-blue-100 text-blue-700 ring-blue-300",
  "bg-emerald-100 text-emerald-700 ring-emerald-300",
  "bg-amber-100 text-amber-700 ring-amber-300",
  "bg-cyan-100 text-cyan-700 ring-cyan-300",
  "bg-rose-100 text-rose-700 ring-rose-300",
  "bg-indigo-100 text-indigo-700 ring-indigo-300",
];

type SortKey = "followers" | "views";
type SortDir = "asc" | "desc";

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
    <span className={positive ? "text-emerald-600 font-semibold" : "text-red-500 font-semibold"}>
      {label}
    </span>
  );
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  return (
    <svg viewBox="0 0 24 24" className={`inline w-3 h-3 ml-1 fill-none stroke-current stroke-2 transition-opacity ${active ? "opacity-100" : "opacity-30"}`} strokeLinecap="round" strokeLinejoin="round">
      {dir === "desc" || !active
        ? <path d="M12 5v14M5 12l7 7 7-7"/>
        : <path d="M12 19V5M5 12l7-7 7 7"/>}
    </svg>
  );
}

function YTBadge() {
  return (
    <div className="w-5 h-5 rounded-sm bg-red-600 flex items-center justify-center flex-shrink-0">
      <svg viewBox="0 0 24 24" className="w-3 h-3 fill-white" aria-hidden>
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
      </svg>
    </div>
  );
}

function channelUrl(handle: string | null, externalId: string): string {
  if (handle) return "https://youtube.com/" + handle;
  return "https://youtube.com/channel/" + externalId;
}

function NotesCell({ accountId, initialNotes }: { accountId: string; initialNotes: string | null }) {
  const [editing, setEditing] = useState(false);
  const [value,   setValue]   = useState(initialNotes ?? "");
  const [saving,  setSaving]  = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  async function save() {
    setSaving(true);
    await fetch(`/api/youtube/accounts/${accountId}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ notes: value.trim() || null }),
    });
    setSaving(false);
    setEditing(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter")  save();
    if (e.key === "Escape") { setValue(initialNotes ?? ""); setEditing(false); }
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={save}
        onKeyDown={handleKeyDown}
        disabled={saving}
        className="w-full min-w-[140px] rounded-lg border border-pink-primary/50 bg-warm-input px-2 py-1 text-xs text-ink outline-none focus:ring-2 focus:ring-pink-primary/20"
        placeholder="Add note…"
      />
    );
  }

  return (
    <div onClick={() => setEditing(true)} className="cursor-text min-w-[120px] group/note flex items-center gap-1.5" title="Click to edit">
      {value ? (
        <span className="text-xs text-ink-secondary">{value}</span>
      ) : (
        <span className="text-xs text-ink-faint opacity-0 group-hover/note:opacity-100 transition-opacity">Add note…</span>
      )}
      <svg viewBox="0 0 24 24" className="w-3 h-3 fill-none stroke-current stroke-2 text-ink-faint opacity-0 group-hover/note:opacity-100 transition-opacity flex-shrink-0" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
      </svg>
    </div>
  );
}

export function YoutubePageClient({ accounts, creators, currentUserId, isAdmin }: Props) {
  const router = useRouter();
  const [, startTransition]             = useTransition();
  const [showModal, setShowModal]       = useState(false);
  const [deleting, setDeleting]         = useState<string | null>(null);
  const [activeCreator, setActiveCreator] = useState<string | null>(null);
  const [sortKey, setSortKey]           = useState<SortKey | null>(null);
  const [sortDir, setSortDir]           = useState<SortDir>("desc");

  const refresh = useCallback(() => {
    startTransition(() => router.refresh());
  }, [router]);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

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

  const creatorsInUse = creators.filter((c) =>
    accounts.some((a) => a.creatorName === c.name)
  );

  let filtered = activeCreator
    ? accounts.filter((a) => a.creatorName === creators.find((c) => c.id === activeCreator)?.name)
    : [...accounts];

  if (sortKey) {
    filtered = filtered.sort((a, b) => {
      const av = sortKey === "followers" ? (a.followers ?? -1) : Number(a.views ?? -1);
      const bv = sortKey === "followers" ? (b.followers ?? -1) : Number(b.views ?? -1);
      return sortDir === "desc" ? bv - av : av - bv;
    });
  }

  return (
    <div className="p-6 lg:p-8">
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
              : `${filtered.length}${activeCreator ? `/${accounts.length}` : ""} channel${accounts.length !== 1 ? "s" : ""} tracked`}
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

      {/* Creator filter pills */}
      {creatorsInUse.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-5">
          {creatorsInUse.map((c, i) => {
            const colors = PILL_COLORS[i % PILL_COLORS.length];
            const active = activeCreator === c.id;
            return (
              <button
                key={c.id}
                onClick={() => setActiveCreator(active ? null : c.id)}
                className={`px-3 py-1 rounded-full text-xs font-semibold ring-1 transition-all ${colors} ${
                  active ? "ring-2 opacity-100" : "opacity-60 hover:opacity-100 ring-transparent"
                }`}
              >
                {c.name}
              </button>
            );
          })}
        </div>
      )}

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
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-ink-muted uppercase tracking-wide">Channel</th>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold text-ink-muted uppercase tracking-wide">Creator</th>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold text-ink-muted uppercase tracking-wide">Notes</th>
                  <th
                    className="px-4 py-3.5 text-right text-xs font-semibold text-ink-muted uppercase tracking-wide cursor-pointer hover:text-ink select-none"
                    onClick={() => handleSort("followers")}
                  >
                    Subscribers <SortIcon active={sortKey === "followers"} dir={sortDir} />
                  </th>
                  <th
                    className="px-4 py-3.5 text-right text-xs font-semibold text-ink-muted uppercase tracking-wide cursor-pointer hover:text-ink select-none"
                    onClick={() => handleSort("views")}
                  >
                    Total Views <SortIcon active={sortKey === "views"} dir={sortDir} />
                  </th>
                  <th className="px-4 py-3.5 text-right text-xs font-semibold text-ink-muted uppercase tracking-wide">Videos</th>
                  <th className="px-4 py-3.5 text-right text-xs font-semibold text-ink-muted uppercase tracking-wide">+7d (subs)</th>
                  <th className="px-4 py-3.5 text-right text-xs font-semibold text-ink-muted uppercase tracking-wide">+14d (subs)</th>
                  <th className="px-4 py-3.5 text-right text-xs font-semibold text-ink-muted uppercase tracking-wide">+30d (subs)</th>
                  <th className="px-4 py-3.5 text-right text-xs font-semibold text-ink-muted uppercase tracking-wide">+30d (views)</th>
                  <th className="px-3 py-3.5 w-12"/>
                </tr>
              </thead>
              <tbody className="divide-y divide-warm-divide">
                {filtered.map((acc) => {
                  const canDelete = isAdmin || acc.addedById === currentUserId;
                  return (
                    <tr key={acc.id} className="hover:bg-warm-hover/40 transition-colors group">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          {acc.avatarUrl ? (
                            <Image src={acc.avatarUrl} alt={acc.name} width={54} height={54} className="rounded-full flex-shrink-0 ring-1 ring-warm-border"/>
                          ) : (
                            <div className="w-[54px] h-[54px] rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 text-red-500 font-bold text-base">
                              {acc.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <YTBadge />
                              <a
                                href={channelUrl(acc.handle, acc.externalId)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-bold text-ink truncate hover:text-pink-primary transition-colors"
                              >
                                {acc.name}
                              </a>
                            </div>
                            <div className="text-xs text-ink-muted truncate mt-0.5">{acc.handle ?? acc.externalId}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5"><span className="font-semibold text-ink">{acc.creatorName}</span></td>
                      <td className="px-4 py-3.5"><NotesCell accountId={acc.id} initialNotes={acc.notes} /></td>
                      <td className="px-4 py-3.5 text-right font-bold text-ink tabular-nums">{fmt(acc.followers)}</td>
                      <td className="px-4 py-3.5 text-right font-semibold text-ink-secondary tabular-nums">{fmtBig(acc.views)}</td>
                      <td className="px-4 py-3.5 text-right font-semibold text-ink-secondary tabular-nums">{acc.videoCount != null ? acc.videoCount.toLocaleString() : "—"}</td>
                      <td className="px-4 py-3.5 text-right tabular-nums"><DeltaCell value={acc.delta7d.followers} /></td>
                      <td className="px-4 py-3.5 text-right tabular-nums"><DeltaCell value={acc.delta14d.followers} /></td>
                      <td className="px-4 py-3.5 text-right tabular-nums"><DeltaCell value={acc.delta30d.followers} /></td>
                      <td className="px-4 py-3.5 text-right tabular-nums"><DeltaCell value={acc.delta30d.views} /></td>
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
                                <path d="M10 11v6"/><path d="M14 11v6"/>
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

      {showModal && (
        <AddChannelModal creators={creators} onClose={() => setShowModal(false)} onAdded={refresh} />
      )}
    </div>
  );
}
