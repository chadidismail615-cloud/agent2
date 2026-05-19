"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Dumbbell,
  LayoutDashboard,
  Users,
  CreditCard,
  MessageSquare,
  LogOut,
  ChevronRight,
} from "lucide-react";
import clsx from "clsx";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/members", label: "Members", icon: Users },
  { href: "/billing", label: "Billing", icon: CreditCard },
  { href: "/chat", label: "AI Agent", icon: MessageSquare, highlight: true },
];

export function Sidebar() {
  const path = usePathname();

  const handleLogout = () => {
    localStorage.removeItem("gymos_token");
    localStorage.removeItem("gymos_user");
    window.location.href = "/";
  };

  let gymName = "Your Gym";
  try {
    const user = JSON.parse(localStorage.getItem("gymos_user") || "{}");
    gymName = user.gym_name || "Your Gym";
  } catch {}

  return (
    <aside className="w-60 bg-slate-900 text-white flex flex-col h-screen fixed left-0 top-0 z-40">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-700">
        <div className="bg-brand-500 p-2 rounded-xl">
          <Dumbbell size={20} />
        </div>
        <div>
          <div className="font-bold text-sm">GymOS</div>
          <div className="text-slate-400 text-xs truncate w-32">{gymName}</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV.map(({ href, label, icon: Icon, highlight }) => {
          const active = path === href;
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group",
                active
                  ? "bg-brand-500 text-white"
                  : highlight
                  ? "text-slate-300 hover:bg-slate-700 border border-slate-700 hover:border-brand-500"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              )}
            >
              <Icon size={18} />
              <span className="flex-1">{label}</span>
              {highlight && !active && (
                <span className="text-[10px] bg-brand-500/20 text-brand-400 px-1.5 py-0.5 rounded-full">
                  AI
                </span>
              )}
              {active && <ChevronRight size={14} />}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 pb-4 border-t border-slate-700 pt-4">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-400 hover:bg-slate-800 hover:text-white w-full transition-all"
        >
          <LogOut size={18} />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
