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
  must_change_password?: boolean;
  bio?: string | null;
  age?: number | null;
  photo_b64?: string | null;
};

export type Shift = {
  id: string;
  date: string;
  time_start: string;
  time_end?: string | null;
  assigned_user_id: string;
  assigned_user_name: string;
  target_role: "servizio_civile" | "admin";
  vehicle?: string | null;
  patient_name?: string | null;
  notes?: string | null;
  created_at: string;
};

export type GalleryPhoto = {
  id: string;
  photo_b64: string;
  caption?: string | null;
  created_at: string;
};

export type PatientInput = {
  first_name: string;
  last_name: string;
  address: string;
  dialysis_center: string;
  dialysis_schedule: string;
  phone?: string;
  notes?: string;
  map_url?: string;
};

export type Patient = PatientInput & {
  id: string;
  created_at: string;
};

export type TeamMember = {
  id: string;
  full_name: string;
  role: string;
  bio?: string | null;
  age?: number | null;
  photo_b64?: string | null;
};

export type VehicleInput = {
  name: string;
  vehicle_type: "ambulanza" | "furgone" | "altro";
  plate?: string;
  notes?: string;
};

export type Vehicle = VehicleInput & {
  id: string;
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
  async changePassword(current_password: string, new_password: string) {
    return request<{ ok: boolean }>("/auth/change-password", {
      method: "POST",
      body: JSON.stringify({ current_password, new_password }),
    });
  },
  async updateProfile(body: { full_name?: string; bio?: string; age?: number; photo_b64?: string }) {
    return request<UserPublic>("/auth/profile", { method: "PATCH", body: JSON.stringify(body) });
  },

  // Shifts
  async listShifts(params: { date_from?: string; date_to?: string; target_role?: "servizio_civile" | "admin" }) {
    const qs = new URLSearchParams(params as any).toString();
    return request<Shift[]>(`/shifts${qs ? `?${qs}` : ""}`);
  },
  async myShifts() {
    return request<Shift[]>("/shifts/mine");
  },
  async createShift(body: {
    date: string;
    time_start: string;
    time_end?: string;
    assigned_user_id: string;
    target_role: "servizio_civile" | "admin";
    vehicle?: string;
    patient_name?: string;
    notes?: string;
  }) {
    return request<Shift>("/shifts", { method: "POST", body: JSON.stringify(body) });
  },
  async deleteShift(id: string) {
    return request<{ ok: boolean }>(`/shifts/${id}`, { method: "DELETE" });
  },

  // Gallery
  async listGallery() {
    return request<GalleryPhoto[]>("/gallery", { auth: false });
  },
  async addPhoto(photo_b64: string, caption?: string) {
    return request<GalleryPhoto>("/gallery", { method: "POST", body: JSON.stringify({ photo_b64, caption }) });
  },
  async deletePhoto(id: string) {
    return request<{ ok: boolean }>(`/gallery/${id}`, { method: "DELETE" });
  },

  // Patients
  async listPatients() {
    return request<Patient[]>("/patients");
  },
  async createPatient(body: PatientInput) {
    return request<Patient>("/patients", { method: "POST", body: JSON.stringify(body) });
  },
  async updatePatient(id: string, body: PatientInput) {
    return request<Patient>(`/patients/${id}`, { method: "PATCH", body: JSON.stringify(body) });
  },
  async deletePatient(id: string) {
    return request<{ ok: boolean }>(`/patients/${id}`, { method: "DELETE" });
  },

  // Team (public)
  async team(role: "admin" | "servizio_civile") {
    return request<TeamMember[]>(`/team/${role}`, { auth: false });
  },

  // Admin sets photo on any user
  async adminUpdateUserPhoto(userId: string, photo_b64: string) {
    return request<UserPublic>(`/users/${userId}/profile`, {
      method: "PATCH",
      body: JSON.stringify({ photo_b64 }),
    });
  },

  // Vehicles (Garage)
  async listVehicles() {
    return request<Vehicle[]>("/vehicles");
  },
  async createVehicle(body: VehicleInput) {
    return request<Vehicle>("/vehicles", { method: "POST", body: JSON.stringify(body) });
  },
  async updateVehicle(id: string, body: VehicleInput) {
    return request<Vehicle>(`/vehicles/${id}`, { method: "PATCH", body: JSON.stringify(body) });
  },
  async deleteVehicle(id: string) {
    return request<{ ok: boolean }>(`/vehicles/${id}`, { method: "DELETE" });
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
