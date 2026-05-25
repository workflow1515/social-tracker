"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Role = "admin" | "user";
const NETWORKS = ["youtube", "instagram", "twitter"] as const;

type Creator = { id: string; name: string };
type AccessGrant = { id: string; creator: Creator; network: string; see_all: boolean };
type UserRow = {
  id: string; username: string; name: string; role: Role;
  is_active: boolean; created_at: string;
  access_grants: AccessGrant[];
};

interface Props {
  users:    UserRow[];
  creators: Creator[];
  currentUserId: string;
}

const inputCls = "w-full px-3 py-2 text-sm border border-warm-border rounded-xl bg-warm-input text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-pink-primary/30";
const labelCls = "block text-xs font-medium text-ink-secondary mb-1";

export function AdminUsers({ users: initialUsers, creators: initialCreators, currentUserId }: Props) {
  const router = useRouter();
  const [users,    setUsers]    = useState(initialUsers);
  const [creators, setCreators] = useState(initialCreators);

  // ── Create user ────────────────────────────────────────────────────────────
  const [showCreate, setShowCreate] = useState(false);
  const [newUser, setNewUser] = useState({ username: "", name: "", password: "", role: "user" as Role });
  const [createError, setCreateError] = useState("");
  const [saving, setSaving] = useState(false);

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setCreateError("");
    const res = await fetch("/api/admin/users", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newUser),
    });
    setSaving(false);
    if (!res.ok) { const j = await res.json(); setCreateError(j.error?.formErrors?.[0] ?? j.error ?? "Error"); return; }
    const { data } = await res.json();
    setUsers((u) => [...u, { ...data, access_grants: [] }]);
    setNewUser({ username: "", name: "", password: "", role: "user" });
    setShowCreate(false);
  }

  // ── Edit user (name / password / active) ──────────────────────────────────
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [editForm, setEditForm] = useState({ name: "", password: "", is_active: true });

  function openEdit(u: UserRow) {
    setEditingUser(u);
    setEditForm({ name: u.name, password: "", is_active: u.is_active });
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingUser) return;
    setSaving(true);
    const body: Record<string, unknown> = { name: editForm.name, is_active: editForm.is_active };
    if (editForm.password) body.password = editForm.password;
    await fetch(`/api/admin/users/${editingUser.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    setUsers((u) => u.map((x) => x.id === editingUser.id ? { ...x, name: editForm.name, is_active: editForm.is_active } : x));
    setEditingUser(null);
  }

  // ── Delete user ───────────────────────────────────────────────────────────
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function deleteUser(id: string) {
    if (!confirm("Delete this user?")) return;
    setDeletingId(id);
    await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
    setDeletingId(null);
    setUsers((u) => u.filter((x) => x.id !== id));
  }

  // ── Access grants ─────────────────────────────────────────────────────────
  const [accessUser, setAccessUser] = useState<UserRow | null>(null);
  type DraftGrant = { creator_id: string; network: string; see_all: boolean };
  const [grants, setGrants] = useState<DraftGrant[]>([]);

  function openAccess(u: UserRow) {
    setAccessUser(u);
    setGrants(u.access_grants.map((g) => ({ creator_id: g.creator.id, network: g.network, see_all: g.see_all })));
  }

  function toggleGrant(creator_id: string, network: string) {
    setGrants((prev) => {
      const exists = prev.find((g) => g.creator_id === creator_id && g.network === network);
      if (exists) return prev.filter((g) => !(g.creator_id === creator_id && g.network === network));
      return [...prev, { creator_id, network, see_all: false }];
    });
  }

  function toggleSeeAll(creator_id: string, network: string) {
    setGrants((prev) => prev.map((g) =>
      g.creator_id === creator_id && g.network === network ? { ...g, see_all: !g.see_all } : g
    ));
  }

  async function saveAccess() {
    if (!accessUser) return;
    setSaving(true);
    await fetch(`/api/admin/users/${accessUser.id}/access`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ grants }),
    });
    setSaving(false);
    const updatedGrants = grants.map((g) => ({
      id: `${g.creator_id}-${g.network}`,
      creator: creators.find((c) => c.id === g.creator_id)!,
      network: g.network,
      see_all: g.see_all,
    }));
    setUsers((u) => u.map((x) => x.id === accessUser.id ? { ...x, access_grants: updatedGrants } : x));
    setAccessUser(null);
  }

  // ── Creators ──────────────────────────────────────────────────────────────
  const [showCreators, setShowCreators] = useState(false);
  const [newCreatorName, setNewCreatorName] = useState("");

  async function addCreator(e: React.FormEvent) {
    e.preventDefault();
    if (!newCreatorName.trim()) return;
    const res = await fetch("/api/admin/creators", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newCreatorName.trim() }),
    });
    const { data } = await res.json();
    setCreators((c) => [...c, data]);
    setNewCreatorName("");
  }

  async function deleteCreator(id: string) {
    if (!confirm("Delete this creator?")) return;
    await fetch(`/api/admin/creators/${id}`, { method: "DELETE" });
    setCreators((c) => c.filter((x) => x.id !== id));
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-ink">Users</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowCreators(true)}
            className="px-3 py-1.5 text-xs rounded-xl border border-warm-border text-ink-muted hover:bg-warm-hover transition-colors"
          >
            Creators
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-1.5 text-sm rounded-xl bg-pink-primary text-white font-medium hover:bg-pink-hover transition-colors"
          >
            + Add User
          </button>
        </div>
      </div>

      {/* Users list */}
      <div className="space-y-3">
        {users.map((u) => (
          <div key={u.id} className="bg-warm-card border border-warm-border rounded-2xl p-4 flex items-start gap-4">
            <div className="w-9 h-9 rounded-full bg-pink-primary/20 flex items-center justify-center text-pink-primary font-bold text-sm shrink-0">
              {u.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-ink">{u.name}</span>
                <span className="text-xs text-ink-muted">@{u.username}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium ${u.role === "admin" ? "bg-pink-light text-pink-dark" : "bg-warm-hover text-ink-secondary"}`}>
                  {u.role}
                </span>
                {!u.is_active && <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-red-50 text-red-500 font-medium">inactive</span>}
              </div>
              {u.access_grants.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {u.access_grants.map((g) => (
                    <span key={g.id} className="text-[10px] bg-warm-hover text-ink-secondary px-1.5 py-0.5 rounded-md">
                      {g.creator.name} · {g.network}{g.see_all ? " (all)" : " (own)"}
                    </span>
                  ))}
                </div>
              )}
            </div>
            {u.id !== currentUserId && (
              <div className="flex gap-2 shrink-0">
                <button onClick={() => openAccess(u)} className="text-xs text-ink-muted hover:text-ink transition-colors">Access</button>
                <button onClick={() => openEdit(u)} className="text-xs text-pink-primary hover:text-pink-hover transition-colors">Edit</button>
                <button
                  onClick={() => deleteUser(u.id)}
                  disabled={deletingId === u.id}
                  className="text-xs text-red-400 hover:text-red-600 transition-colors disabled:opacity-50"
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── Create user modal ── */}
      {showCreate && (
        <Modal title="Add User" onClose={() => setShowCreate(false)}>
          <form onSubmit={createUser} className="space-y-3">
            <div>
              <label className={labelCls}>Username *</label>
              <input required className={inputCls} placeholder="john_doe" value={newUser.username}
                onChange={(e) => setNewUser((p) => ({ ...p, username: e.target.value.toLowerCase() }))} />
              <p className="text-[11px] text-ink-muted mt-1">Lowercase letters, numbers, underscore</p>
            </div>
            <div>
              <label className={labelCls}>Display Name *</label>
              <input required className={inputCls} placeholder="John Doe" value={newUser.name}
                onChange={(e) => setNewUser((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div>
              <label className={labelCls}>Password *</label>
              <input required type="password" minLength={6} className={inputCls} value={newUser.password}
                onChange={(e) => setNewUser((p) => ({ ...p, password: e.target.value }))} />
            </div>
            <div>
              <label className={labelCls}>Role</label>
              <select className={inputCls} value={newUser.role}
                onChange={(e) => setNewUser((p) => ({ ...p, role: e.target.value as Role }))}>
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            {createError && <p className="text-xs text-red-500">{createError}</p>}
            <div className="flex gap-2 pt-1">
              <button type="submit" disabled={saving}
                className="flex-1 py-2 text-sm rounded-xl bg-pink-primary text-white font-medium hover:bg-pink-hover disabled:opacity-50 transition-colors">
                {saving ? "Creating..." : "Create"}
              </button>
              <button type="button" onClick={() => setShowCreate(false)}
                className="flex-1 py-2 text-sm rounded-xl border border-warm-border text-ink-muted hover:bg-warm-hover transition-colors">
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Edit user modal ── */}
      {editingUser && (
        <Modal title={`Edit — ${editingUser.username}`} onClose={() => setEditingUser(null)}>
          <form onSubmit={saveEdit} className="space-y-3">
            <div>
              <label className={labelCls}>Display Name</label>
              <input className={inputCls} value={editForm.name}
                onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div>
              <label className={labelCls}>New Password <span className="text-ink-muted font-normal">(leave blank to keep)</span></label>
              <input type="password" minLength={6} className={inputCls} value={editForm.password}
                onChange={(e) => setEditForm((p) => ({ ...p, password: e.target.value }))} />
            </div>
            <label className="flex items-center gap-2 text-sm text-ink cursor-pointer">
              <input type="checkbox" checked={editForm.is_active}
                onChange={(e) => setEditForm((p) => ({ ...p, is_active: e.target.checked }))}
                className="rounded accent-pink-primary" />
              Active
            </label>
            <div className="flex gap-2 pt-1">
              <button type="submit" disabled={saving}
                className="flex-1 py-2 text-sm rounded-xl bg-pink-primary text-white font-medium hover:bg-pink-hover disabled:opacity-50 transition-colors">
                {saving ? "Saving..." : "Save"}
              </button>
              <button type="button" onClick={() => setEditingUser(null)}
                className="flex-1 py-2 text-sm rounded-xl border border-warm-border text-ink-muted hover:bg-warm-hover transition-colors">
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Access modal ── */}
      {accessUser && (
        <Modal title={`Access — ${accessUser.name}`} onClose={() => setAccessUser(null)} wide>
          <div className="space-y-4">
            {creators.length === 0 && (
              <p className="text-sm text-ink-muted">No creators yet. Add some first.</p>
            )}
            {creators.map((c) => (
              <div key={c.id} className="border border-warm-border rounded-xl p-3">
                <p className="text-sm font-medium text-ink mb-2">{c.name}</p>
                <div className="flex flex-wrap gap-2">
                  {NETWORKS.map((net) => {
                    const grant = grants.find((g) => g.creator_id === c.id && g.network === net);
                    return (
                      <div key={net} className="flex items-center gap-1.5">
                        <button
                          onClick={() => toggleGrant(c.id, net)}
                          className={`px-2.5 py-1 text-xs rounded-lg border transition-colors ${
                            grant
                              ? "border-pink-primary bg-pink-light text-pink-dark font-medium"
                              : "border-warm-border text-ink-muted hover:border-pink-primary/50"
                          }`}
                        >
                          {net}
                        </button>
                        {grant && (
                          <button
                            onClick={() => toggleSeeAll(c.id, net)}
                            className={`px-2 py-1 text-[10px] rounded-lg border transition-colors ${
                              grant.see_all
                                ? "border-green-500 bg-green-50 text-green-700"
                                : "border-warm-border text-ink-muted hover:border-green-400"
                            }`}
                            title={grant.see_all ? "Sees all accounts" : "Sees own accounts only"}
                          >
                            {grant.see_all ? "all" : "own"}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            <div className="flex gap-2 pt-1">
              <button onClick={saveAccess} disabled={saving}
                className="flex-1 py-2 text-sm rounded-xl bg-pink-primary text-white font-medium hover:bg-pink-hover disabled:opacity-50 transition-colors">
                {saving ? "Saving..." : "Save Access"}
              </button>
              <button onClick={() => setAccessUser(null)}
                className="flex-1 py-2 text-sm rounded-xl border border-warm-border text-ink-muted hover:bg-warm-hover transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Creators modal ── */}
      {showCreators && (
        <Modal title="Creators" onClose={() => setShowCreators(false)}>
          <form onSubmit={addCreator} className="flex gap-2 mb-4">
            <input
              className={inputCls}
              placeholder="Creator name"
              value={newCreatorName}
              onChange={(e) => setNewCreatorName(e.target.value)}
            />
            <button type="submit"
              className="px-3 py-2 text-sm rounded-xl bg-pink-primary text-white font-medium hover:bg-pink-hover transition-colors whitespace-nowrap">
              Add
            </button>
          </form>
          <div className="space-y-2">
            {creators.length === 0 && <p className="text-sm text-ink-muted">No creators yet.</p>}
            {creators.map((c) => (
              <div key={c.id} className="flex items-center justify-between py-1.5 border-b border-warm-border last:border-0">
                <span className="text-sm text-ink">{c.name}</span>
                <button onClick={() => deleteCreator(c.id)} className="text-xs text-red-400 hover:text-red-600 transition-colors">
                  Delete
                </button>
              </div>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}

function Modal({ title, onClose, children, wide }: {
  title: string; onClose: () => void; children: React.ReactNode; wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className={`bg-warm-card border border-warm-border rounded-2xl shadow-xl p-6 w-full space-y-4 ${wide ? "max-w-lg" : "max-w-sm"}`}>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink">{title}</h2>
          <button onClick={onClose} className="text-ink-muted hover:text-ink transition-colors">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
