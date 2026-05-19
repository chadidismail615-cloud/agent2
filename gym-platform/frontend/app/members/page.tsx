"use client";
import { useEffect, useState, useCallback } from "react";
import { members } from "@/lib/api";
import type { Member } from "@/lib/api";
import { Sidebar } from "@/components/Sidebar";
import {
  Search, Plus, UserCheck, UserX, Clock, X, CheckCircle, AlertCircle
} from "lucide-react";
import clsx from "clsx";

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  expired: "bg-red-100 text-red-700",
  suspended: "bg-yellow-100 text-yellow-700",
  pending: "bg-blue-100 text-blue-700",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={clsx("text-xs font-medium px-2 py-0.5 rounded-full", STATUS_COLORS[status] || "bg-slate-100 text-slate-600")}>
      {status}
    </span>
  );
}

function AddMemberModal({ onClose, onSave }: { onClose: () => void; onSave: () => void }) {
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    plan: "basic",
    plan_price: 1500,
    membership_start: new Date().toISOString().split("T")[0],
    membership_end: "",
    assigned_trainer: "",
    health_notes: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await members.create(form);
      onSave();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create member");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="font-bold text-slate-900">Add New Member</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {error && <div className="bg-red-50 text-red-700 rounded-lg px-4 py-2 text-sm">{error}</div>}

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-xs font-medium text-slate-500 mb-1 block">Full Name *</label>
              <input required value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Email</label>
              <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Phone</label>
              <input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Plan</label>
              <select value={form.plan} onChange={e => setForm({...form, plan: e.target.value})}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                <option value="basic">Basic</option>
                <option value="premium">Premium</option>
                <option value="vip">VIP</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Monthly Price (₹)</label>
              <input type="number" value={form.plan_price} onChange={e => setForm({...form, plan_price: Number(e.target.value)})}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Start Date</label>
              <input type="date" value={form.membership_start} onChange={e => setForm({...form, membership_start: e.target.value})}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">End Date</label>
              <input type="date" value={form.membership_end} onChange={e => setForm({...form, membership_end: e.target.value})}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Trainer</label>
              <input value={form.assigned_trainer} onChange={e => setForm({...form, assigned_trainer: e.target.value})}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Health Notes</label>
              <input value={form.health_notes} onChange={e => setForm({...form, health_notes: e.target.value})}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 border rounded-lg py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 bg-brand-500 text-white rounded-lg py-2 text-sm font-medium disabled:opacity-60">
              {loading ? "Saving…" : "Add Member"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function MembersPage() {
  const [data, setData] = useState<{ total: number; members: Member[] } | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [page, setPage] = useState(1);

  const load = useCallback(() => {
    setLoading(true);
    members.list({
      search: search || undefined,
      status: statusFilter !== "all" ? statusFilter : undefined,
      page,
    }).then(setData).finally(() => setLoading(false));
  }, [search, statusFilter, page]);

  useEffect(() => { load(); }, [load]);

  const FILTERS = ["all", "active", "expired", "suspended"];

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      {showAdd && <AddMemberModal onClose={() => setShowAdd(false)} onSave={() => { setShowAdd(false); load(); }} />}
      <main className="ml-60 flex-1 overflow-y-auto p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Members</h1>
              <p className="text-slate-500 text-sm mt-0.5">{data?.total ?? 0} total members</p>
            </div>
            <button
              onClick={() => setShowAdd(true)}
              className="bg-brand-500 hover:bg-brand-600 text-white rounded-xl px-4 py-2.5 text-sm font-medium flex items-center gap-2"
            >
              <Plus size={16} /> Add Member
            </button>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1 max-w-xs">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                placeholder="Search members…"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div className="flex rounded-lg border overflow-hidden">
              {FILTERS.map((f) => (
                <button
                  key={f}
                  onClick={() => { setStatusFilter(f); setPage(1); }}
                  className={clsx(
                    "px-3 py-2 text-sm capitalize",
                    statusFilter === f ? "bg-brand-500 text-white" : "text-slate-600 hover:bg-slate-50"
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
                <tr>
                  <th className="px-5 py-3 text-left">Name</th>
                  <th className="px-5 py-3 text-left">Contact</th>
                  <th className="px-5 py-3 text-left">Plan</th>
                  <th className="px-5 py-3 text-left">Status</th>
                  <th className="px-5 py-3 text-left">Expiry</th>
                  <th className="px-5 py-3 text-left">Trainer</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr><td colSpan={6} className="px-5 py-12 text-center text-slate-400">Loading…</td></tr>
                ) : data?.members.length === 0 ? (
                  <tr><td colSpan={6} className="px-5 py-12 text-center text-slate-400">No members found</td></tr>
                ) : (
                  data?.members.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-4">
                        <div className="font-medium text-slate-900">{m.full_name}</div>
                        <div className="text-xs text-slate-400">#{m.id}</div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="text-sm text-slate-700">{m.phone || "—"}</div>
                        <div className="text-xs text-slate-400">{m.email || ""}</div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="text-sm text-slate-700 capitalize">{m.plan || "—"}</div>
                        {m.plan_price > 0 && <div className="text-xs text-slate-400">₹{m.plan_price}/mo</div>}
                      </td>
                      <td className="px-5 py-4"><StatusBadge status={m.status} /></td>
                      <td className="px-5 py-4">
                        {m.membership_end ? (
                          <div className="flex items-center gap-1.5">
                            {(m.days_until_expiry ?? 0) < 0 ? (
                              <AlertCircle size={14} className="text-red-500" />
                            ) : (m.days_until_expiry ?? 0) <= 7 ? (
                              <Clock size={14} className="text-orange-500" />
                            ) : (
                              <CheckCircle size={14} className="text-green-500" />
                            )}
                            <span className="text-sm text-slate-700">{m.membership_end}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-600">{m.assigned_trainer || "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* Pagination */}
            {data && data.total > 20 && (
              <div className="px-5 py-3 border-t flex items-center justify-between text-sm text-slate-500">
                <span>Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, data.total)} of {data.total}</span>
                <div className="flex gap-2">
                  <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                    className="px-3 py-1 rounded border disabled:opacity-40 hover:bg-slate-50">Prev</button>
                  <button disabled={page * 20 >= data.total} onClick={() => setPage(p => p + 1)}
                    className="px-3 py-1 rounded border disabled:opacity-40 hover:bg-slate-50">Next</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
