import { storage } from "@/src/utils/storage";

const BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export type Role = "master" | "admin" | "servizio_civile";

export type UserPublic = {
  id: string;
  username: string;
  email: string | null;
  full_name: string;
  role: Role;
  created_at: string;
};

export type Slot = {
  id: string;
  date: string;
  time: string;
  vehicle_type: "ambulanza" | "furgone";
  capacity: number;
  booked_count: number;
  assigned_user_ids: string[];
  notes?: string | null;
  created_at: string;
};

export type Booking = {
  id: string;
  slot_id: string;
  slot_date: string;
  slot_time: string;
  requester_name: string;
  requester_surname: string;
  patient_name: string;
  patient_surname: string;
  phone: string;
  email: string;
  address: string;
  vehicle_type: string;
  patient_weight_class: string;
  has_elevator: boolean;
  floor: number;
  notes?: string | null;
  status: string;
  created_at: string;
};

export const TOKEN_KEY = "auth_token";

async function authHeader(): Promise<Record<string, string>> {
  const token = await storage.secureGet<string>(TOKEN_KEY, "");
  if (token) return { Authorization: `Bearer ${token}` };
  return {};
}

async function request<T>(path: string, init?: RequestInit & { auth?: boolean }): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init?.headers as Record<string, string>),
  };
  if (init?.auth !== false) {
    Object.assign(headers, await authHeader());
  }
  const url = `${BASE_URL}/api${path}`;
  const res = await fetch(url, { ...init, headers });
  const text = await res.text();
  let data: any;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    const message = data?.detail || data?.message || `Errore ${res.status}`;
    throw new Error(typeof message === "string" ? message : JSON.stringify(message));
  }
  return data as T;
}

export const api = {
  // Auth
  async login(username: string, password: string) {
    return request<{ token: string; user: UserPublic }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
      auth: false,
    });
  },
  async me() {
    return request<UserPublic>("/auth/me");
  },

  // Users
  async listUsers() {
    return request<UserPublic[]>("/users");
  },
  async createUser(body: {
    username: string;
    full_name: string;
    email?: string;
    role: "admin" | "servizio_civile";
    password?: string;
  }) {
    return request<{ user: UserPublic; generated_password?: string }>("/users", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },
  async deleteUser(id: string) {
    return request<{ ok: boolean }>(`/users/${id}`, { method: "DELETE" });
  },
  async resetPassword(id: string) {
    return request<{ new_password: string }>(`/users/${id}/reset-password`, { method: "POST" });
  },

  // Slots
  async listSlots(params?: { date_from?: string; date_to?: string; vehicle_type?: string }) {
    const qs = new URLSearchParams(params as any).toString();
    return request<Slot[]>(`/slots${qs ? `?${qs}` : ""}`, { auth: false });
  },
  async createSlot(body: {
    date: string;
    time: string;
    vehicle_type: string;
    capacity: number;
    assigned_user_ids?: string[];
    notes?: string;
  }) {
    return request<Slot>("/slots", { method: "POST", body: JSON.stringify(body) });
  },
  async deleteSlot(id: string) {
    return request<{ ok: boolean }>(`/slots/${id}`, { method: "DELETE" });
  },
  async mySlots() {
    return request<Slot[]>("/slots/mine");
  },

  // Bookings
  async createBooking(body: {
    slot_id: string;
    requester_name: string;
    requester_surname: string;
    patient_name: string;
    patient_surname: string;
    phone: string;
    email: string;
    address: string;
    vehicle_type: string;
    patient_weight_class: string;
    has_elevator: boolean;
    floor: number;
    notes?: string;
  }) {
    return request<Booking>("/bookings", { method: "POST", body: JSON.stringify(body), auth: false });
  },
  async listBookings(date?: string) {
    const qs = date ? `?date=${date}` : "";
    return request<Booking[]>(`/bookings${qs}`);
  },
  async deleteBooking(id: string) {
    return request<{ ok: boolean }>(`/bookings/${id}`, { method: "DELETE" });
  },
};
