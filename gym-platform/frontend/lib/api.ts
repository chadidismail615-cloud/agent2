const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("gymos_token");
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (res.status === 401) {
    localStorage.removeItem("gymos_token");
    localStorage.removeItem("gymos_user");
    window.location.href = "/";
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Request failed");
  }

  return res.json();
}

// Auth
export const auth = {
  register: (data: {
    gym_name: string;
    gym_email: string;
    owner_name: string;
    owner_email: string;
    password: string;
    phone?: string;
  }) => request<AuthResponse>("/api/v1/auth/register", { method: "POST", body: JSON.stringify(data) }),

  login: (email: string, password: string) =>
    request<AuthResponse>("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
};

// Members
export const members = {
  list: (params?: { status?: string; search?: string; plan?: string; page?: number }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set("status", params.status);
    if (params?.search) q.set("search", params.search);
    if (params?.plan) q.set("plan", params.plan);
    if (params?.page) q.set("page", String(params.page));
    return request<MemberListResponse>(`/api/v1/members?${q}`);
  },
  get: (id: number) => request<Member>(`/api/v1/members/${id}`),
  create: (data: Partial<Member>) =>
    request<Member>("/api/v1/members", { method: "POST", body: JSON.stringify(data) }),
  update: (id: number, data: Partial<Member>) =>
    request<Member>(`/api/v1/members/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  delete: (id: number) =>
    request<void>(`/api/v1/members/${id}`, { method: "DELETE" }),
};

// Billing
export const billing = {
  payments: (params?: { member_id?: number; status?: string; page?: number }) => {
    const q = new URLSearchParams();
    if (params?.member_id) q.set("member_id", String(params.member_id));
    if (params?.status) q.set("status", params.status);
    if (params?.page) q.set("page", String(params.page));
    return request<PaymentListResponse>(`/api/v1/billing/payments?${q}`);
  },
  createPayment: (data: {
    member_id: number;
    amount: number;
    payment_method: string;
    description?: string;
    reference_id?: string;
  }) => request<Payment>("/api/v1/billing/payments", { method: "POST", body: JSON.stringify(data) }),
  summary: (period?: string) =>
    request<BillingSummary>(`/api/v1/billing/summary?period=${period || "this_month"}`),
  overdue: () => request<OverdueResponse>("/api/v1/billing/overdue"),
};

// Chat — returns a streaming fetch
export function streamChat(messages: ChatMessage[]) {
  const token = getToken();
  return fetch(`${API_BASE}/api/v1/chat/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ messages }),
  });
}

// Types
export interface AuthResponse {
  access_token: string;
  user_id: number;
  user_name: string;
  tenant_id: number;
  gym_name: string;
  role: string;
}

export interface Member {
  id: number;
  full_name: string;
  email?: string;
  phone?: string;
  plan?: string;
  plan_price: number;
  status: string;
  membership_start?: string;
  membership_end?: string;
  days_until_expiry?: number;
  assigned_trainer?: string;
  health_notes?: string;
  created_at?: string;
}

export interface MemberListResponse {
  total: number;
  page: number;
  page_size: number;
  members: Member[];
}

export interface Payment {
  id: number;
  member_id: number;
  member_name?: string;
  amount: number;
  currency: string;
  payment_method: string;
  status: string;
  description?: string;
  paid_at?: string;
  created_at?: string;
}

export interface PaymentListResponse {
  total: number;
  page: number;
  page_size: number;
  payments: Payment[];
}

export interface BillingSummary {
  period: string;
  total_revenue: number;
  transaction_count: number;
  average_transaction: number;
  by_payment_method: Record<string, number>;
  overdue_members: number;
}

export interface OverdueResponse {
  count: number;
  members: Array<{
    id: number;
    full_name: string;
    email?: string;
    phone?: string;
    plan?: string;
    membership_end: string;
    days_overdue: number;
  }>;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}
