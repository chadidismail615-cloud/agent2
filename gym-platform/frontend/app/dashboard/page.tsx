"use client";
import { useEffect, useState } from "react";
import { billing, members } from "@/lib/api";
import type { BillingSummary } from "@/lib/api";
import { Sidebar } from "@/components/Sidebar";
import {
  Users,
  TrendingUp,
  AlertTriangle,
  UserPlus,
  MessageSquare,
  Clock,
  IndianRupee,
} from "lucide-react";
import Link from "next/link";

interface Stats {
  total_members: number;
  active_members: number;
  expired_members: number;
  new_this_month: number;
  expiring_within_7_days: number;
  revenue_this_month: number;
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-slate-500 font-medium">{label}</span>
        <div className={`p-2 rounded-xl ${color}`}>
          <Icon size={18} />
        </div>
      </div>
      <div className="text-3xl font-bold text-slate-900">{value}</div>
      {sub && <div className="text-xs text-slate-400 mt-1">{sub}</div>}
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [summary, setSummary] = useState<BillingSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/v1/members?page_size=1`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("gymos_token")}` },
      })
        .then((r) => r.json())
        .then((d) => d),
      billing.summary("this_month"),
    ])
      .then(([, sum]) => {
        setSummary(sum);
      })
      .catch(console.error)
      .finally(() => setLoading(false));

    // Get gym stats via a direct members query
    members.list({ page: 1 }).then((d) => {
      setStats({
        total_members: d.total,
        active_members: 0,
        expired_members: 0,
        new_this_month: 0,
        expiring_within_7_days: 0,
        revenue_this_month: 0,
      });
    });
  }, []);

  const gymName =
    typeof window !== "undefined"
      ? JSON.parse(localStorage.getItem("gymos_user") || "{}").gym_name || "Your Gym"
      : "Your Gym";

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="ml-60 flex-1 overflow-y-auto p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-slate-900">
              Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 18 ? "afternoon" : "evening"} 👋
            </h1>
            <p className="text-slate-500 mt-1">Here&apos;s what&apos;s happening at {gymName} today</p>
          </div>

          {/* Stats */}
          {loading ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white rounded-2xl p-6 h-32 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <StatCard
                label="Total Members"
                value={stats?.total_members ?? "—"}
                icon={Users}
                color="bg-blue-50 text-blue-600"
              />
              <StatCard
                label="Revenue This Month"
                value={`₹${((summary?.total_revenue ?? 0) / 1000).toFixed(1)}k`}
                sub={`${summary?.transaction_count ?? 0} transactions`}
                icon={IndianRupee}
                color="bg-green-50 text-green-600"
              />
              <StatCard
                label="Overdue Members"
                value={summary?.overdue_members ?? "—"}
                sub="Need follow-up"
                icon={AlertTriangle}
                color="bg-orange-50 text-orange-600"
              />
              <StatCard
                label="Payments Collected"
                value={summary?.transaction_count ?? "—"}
                sub="This month"
                icon={TrendingUp}
                color="bg-purple-50 text-purple-600"
              />
            </div>
          )}

          {/* Quick actions */}
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            <Link
              href="/members?action=new"
              className="bg-white rounded-2xl p-5 border border-slate-100 hover:border-brand-500 hover:shadow-md transition-all flex items-center gap-4"
            >
              <div className="bg-brand-50 p-3 rounded-xl">
                <UserPlus size={20} className="text-brand-600" />
              </div>
              <div>
                <div className="font-semibold text-slate-800">Add Member</div>
                <div className="text-xs text-slate-400">Register a new member</div>
              </div>
            </Link>

            <Link
              href="/chat"
              className="bg-gradient-to-r from-brand-500 to-brand-700 rounded-2xl p-5 hover:shadow-lg transition-all flex items-center gap-4 text-white"
            >
              <div className="bg-white/20 p-3 rounded-xl">
                <MessageSquare size={20} />
              </div>
              <div>
                <div className="font-semibold">Ask AI Agent</div>
                <div className="text-xs text-white/70">Get instant answers</div>
              </div>
            </Link>

            <Link
              href="/billing?tab=overdue"
              className="bg-white rounded-2xl p-5 border border-slate-100 hover:border-orange-400 hover:shadow-md transition-all flex items-center gap-4"
            >
              <div className="bg-orange-50 p-3 rounded-xl">
                <Clock size={20} className="text-orange-600" />
              </div>
              <div>
                <div className="font-semibold text-slate-800">View Overdue</div>
                <div className="text-xs text-slate-400">
                  {summary?.overdue_members ?? 0} pending follow-ups
                </div>
              </div>
            </Link>
          </div>

          {/* Billing by method */}
          {summary && Object.keys(summary.by_payment_method).length > 0 && (
            <div className="bg-white rounded-2xl p-6 border border-slate-100">
              <h2 className="font-semibold text-slate-800 mb-4">Revenue by Payment Method</h2>
              <div className="space-y-3">
                {Object.entries(summary.by_payment_method).map(([method, amount]) => {
                  const pct = summary.total_revenue > 0 ? (amount / summary.total_revenue) * 100 : 0;
                  return (
                    <div key={method}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-slate-600 capitalize">{method}</span>
                        <span className="text-sm font-medium">₹{amount.toLocaleString()}</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-brand-500 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
