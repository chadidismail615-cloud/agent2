"use client";
import { useState } from "react";
import { auth } from "@/lib/api";
import { Dumbbell, ArrowRight, CheckCircle } from "lucide-react";

type Mode = "login" | "register";

export default function Home() {
  const [mode, setMode] = useState<Mode>("login");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Login fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Register fields
  const [gymName, setGymName] = useState("");
  const [gymEmail, setGymEmail] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await auth.login(email, password);
      localStorage.setItem("gymos_token", res.access_token);
      localStorage.setItem("gymos_user", JSON.stringify(res));
      window.location.href = "/dashboard";
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await auth.register({
        gym_name: gymName,
        gym_email: gymEmail,
        owner_name: ownerName,
        owner_email: ownerEmail,
        password: regPassword,
      });
      localStorage.setItem("gymos_token", res.access_token);
      localStorage.setItem("gymos_user", JSON.stringify(res));
      window.location.href = "/dashboard";
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-brand-900 to-slate-900 flex">
      {/* Left — value prop */}
      <div className="hidden lg:flex flex-col justify-center px-16 w-1/2 text-white">
        <div className="flex items-center gap-3 mb-10">
          <div className="bg-brand-500 p-2 rounded-xl">
            <Dumbbell size={28} />
          </div>
          <span className="text-2xl font-bold">GymOS</span>
        </div>
        <h1 className="text-5xl font-bold leading-tight mb-6">
          One AI brain.<br />
          Zero admin chaos.
        </h1>
        <p className="text-slate-300 text-lg mb-10 leading-relaxed">
          Stop juggling WhatsApp, Excel, Google Calendar, and Razorpay.
          GymOS replaces all of them with a single AI-powered platform that
          saves your staff 5–10 hours every week.
        </p>
        <div className="space-y-4">
          {[
            "AI agent answers any question about your gym instantly",
            "Members, billing, and renewals in one place",
            "Zero data entry — just talk to it",
            "Built for Indian gyms — ₹ pricing, UPI support",
          ].map((item) => (
            <div key={item} className="flex items-start gap-3">
              <CheckCircle size={20} className="text-brand-500 mt-0.5 shrink-0" />
              <span className="text-slate-200">{item}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right — auth form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="bg-brand-500 p-1.5 rounded-lg">
              <Dumbbell size={20} className="text-white" />
            </div>
            <span className="font-bold text-lg">GymOS</span>
          </div>

          <div className="flex rounded-xl bg-slate-100 p-1 mb-8">
            <button
              onClick={() => setMode("login")}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                mode === "login" ? "bg-white shadow text-brand-600" : "text-slate-500"
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setMode("register")}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                mode === "register" ? "bg-white shadow text-brand-600" : "text-slate-500"
              }`}
            >
              Create Account
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-6 text-sm">
              {error}
            </div>
          )}

          {mode === "login" ? (
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@yourgym.com"
                  className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-brand-500 hover:bg-brand-600 text-white rounded-lg py-3 font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
              >
                {loading ? "Signing in…" : <>Sign In <ArrowRight size={16} /></>}
              </button>
              <p className="text-center text-xs text-slate-500 mt-4">
                Demo: register a new gym account to get started
              </p>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Gym Name</label>
                  <input
                    type="text"
                    required
                    value={gymName}
                    onChange={(e) => setGymName(e.target.value)}
                    placeholder="Iron Paradise Fitness"
                    className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Gym Email</label>
                  <input
                    type="email"
                    required
                    value={gymEmail}
                    onChange={(e) => setGymEmail(e.target.value)}
                    placeholder="contact@yourgym.com"
                    className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Your Name</label>
                  <input
                    type="text"
                    required
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    placeholder="Raj Sharma"
                    className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Your Email</label>
                  <input
                    type="email"
                    required
                    value={ownerEmail}
                    onChange={(e) => setOwnerEmail(e.target.value)}
                    placeholder="raj@yourgym.com"
                    className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-brand-500 hover:bg-brand-600 text-white rounded-lg py-3 font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-60 mt-2"
              >
                {loading ? "Creating account…" : <>Create Gym Account <ArrowRight size={16} /></>}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
