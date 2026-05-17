"use client";
import { useEffect, useState } from "react";
import { billing } from "@/lib/api";
import type { BillingSummary, Payment } from "@/lib/api";
import { Sidebar } from "@/components/Sidebar";
import { IndianRupee, CreditCard, AlertTriangle, TrendingUp } from "lucide-react";
import clsx from "clsx";

const PERIODS = ["today", "this_week", "this_month", "last_month", "all_time"] as const;

export default function BillingPage() {
  const [summary, setSummary] = useState<BillingSummary | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [period, setPeriod] = useState<(typeof PERIODS)[number]>("this_month");
  const [tab, setTab] = useState<"transactions" | "overdue">("transactions");
  const [overdueMembers, setOverdueMembers] = useState<{ id: number; full_name: string; membership_end: string; days_overdue: number; plan?: string; phone?: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      billing.summary(period),
      billing.payments({ page: 1 }),
      billing.overdue(),
    ])
      .then(([s, p, o]) => {
        setSummary(s);
        setPayments(p.payments);
        setOverdueMembers(o.members);
      })
      .finally(() => setLoading(false));
  }, [period]);

  const METHOD_COLORS: Record<string, string> = {
    cash: "bg-green-100 text-green-700",
    card: "bg-blue-100 text-blue-700",
    upi: "bg-purple-100 text-purple-700",
    bank_transfer: "bg-orange-100 text-orange-700",
    other: "bg-slate-100 text-slate-600",
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="ml-60 flex-1 overflow-y-auto p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-slate-900">Billing</h1>
            <div className="flex rounded-lg border overflow-hidden text-sm">
              {PERIODS.map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={clsx(
                    "px-3 py-2 capitalize",
                    period === p ? "bg-brand-500 text-white" : "text-slate-600 hover:bg-slate-50"
                  )}
                >
                  {p.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[
              {
                label: "Total Revenue",
                value: `₹${(summary?.total_revenue ?? 0).toLocaleString()}`,
                icon: IndianRupee,
                color: "bg-green-50 text-green-600",
              },
              {
                label: "Transactions",
                value: summary?.transaction_count ?? "—",
                icon: CreditCard,
                color: "bg-blue-50 text-blue-600",
              },
              {
                label: "Avg. Transaction",
                value: `₹${Math.round(summary?.average_transaction ?? 0).toLocaleString()}`,
                icon: TrendingUp,
                color: "bg-purple-50 text-purple-600",
              },
              {
                label: "Overdue Members",
                value: summary?.overdue_members ?? "—",
                icon: AlertTriangle,
                color: "bg-red-50 text-red-600",
              },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-slate-500 font-medium">{label}</span>
                  <div className={`p-2 rounded-xl ${color}`}>
                    <Icon size={16} />
                  </div>
                </div>
                <div className="text-2xl font-bold text-slate-900">{loading ? "…" : value}</div>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit mb-6">
            <button
              onClick={() => setTab("transactions")}
              className={clsx("px-4 py-2 rounded-lg text-sm font-medium transition-all", tab === "transactions" ? "bg-white shadow text-brand-600" : "text-slate-500")}
            >
              Transactions
            </button>
            <button
              onClick={() => setTab("overdue")}
              className={clsx("px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2", tab === "overdue" ? "bg-white shadow text-brand-600" : "text-slate-500")}
            >
              Overdue
              {(summary?.overdue_members ?? 0) > 0 && (
                <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                  {summary?.overdue_members}
                </span>
              )}
            </button>
          </div>

          {tab === "transactions" ? (
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
                  <tr>
                    <th className="px-5 py-3 text-left">Member</th>
                    <th className="px-5 py-3 text-left">Amount</th>
                    <th className="px-5 py-3 text-left">Method</th>
                    <th className="px-5 py-3 text-left">Description</th>
                    <th className="px-5 py-3 text-left">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loading ? (
                    <tr><td colSpan={5} className="px-5 py-12 text-center text-slate-400">Loading…</td></tr>
                  ) : payments.length === 0 ? (
                    <tr><td colSpan={5} className="px-5 py-12 text-center text-slate-400">No transactions found</td></tr>
                  ) : (
                    payments.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50">
                        <td className="px-5 py-4 font-medium text-slate-800">{p.member_name || `#${p.member_id}`}</td>
                        <td className="px-5 py-4 font-semibold text-slate-900">₹{p.amount.toLocaleString()}</td>
                        <td className="px-5 py-4">
                          <span className={clsx("text-xs px-2 py-0.5 rounded-full font-medium", METHOD_COLORS[p.payment_method] || "bg-slate-100 text-slate-600")}>
                            {p.payment_method}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-sm text-slate-600">{p.description || "—"}</td>
                        <td className="px-5 py-4 text-sm text-slate-500">
                          {p.paid_at ? new Date(p.paid_at).toLocaleDateString() : "—"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
                  <tr>
                    <th className="px-5 py-3 text-left">Member</th>
                    <th className="px-5 py-3 text-left">Plan</th>
                    <th className="px-5 py-3 text-left">Expired On</th>
                    <th className="px-5 py-3 text-left">Days Overdue</th>
                    <th className="px-5 py-3 text-left">Phone</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loading ? (
                    <tr><td colSpan={5} className="px-5 py-12 text-center text-slate-400">Loading…</td></tr>
                  ) : overdueMembers.length === 0 ? (
                    <tr><td colSpan={5} className="px-5 py-12 text-center text-slate-400">🎉 No overdue members!</td></tr>
                  ) : (
                    overdueMembers.map((m) => (
                      <tr key={m.id} className="hover:bg-slate-50">
                        <td className="px-5 py-4 font-medium text-slate-800">{m.full_name}</td>
                        <td className="px-5 py-4 text-sm capitalize text-slate-600">{m.plan || "—"}</td>
                        <td className="px-5 py-4 text-sm text-slate-600">{m.membership_end}</td>
                        <td className="px-5 py-4">
                          <span className="bg-red-100 text-red-700 text-xs font-medium px-2 py-0.5 rounded-full">
                            {m.days_overdue}d
                          </span>
                        </td>
                        <td className="px-5 py-4 text-sm text-slate-600">{m.phone || "—"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
