// Merkezi veritabanı tip tanımları – multi-tenant yapı

export enum UserRole {
  SUPER_ADMIN = "SUPER_ADMIN",
  ADMIN = "ADMIN",
  DOKTOR = "DOKTOR",
  SEKRETER = "SEKRETER",
  FINANS = "FINANS",
}

export const USER_ROLES = Object.values(UserRole);

export type AppointmentStatus =
  | "confirmed"
  | "cancelled"
  | "no_show"
  | "completed";

export type AppointmentChannel = "whatsapp" | "web" | "phone" | "walk_in";

export type DayOfWeek = "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";

export interface DaySchedule {
  open: string;   // "09:00"
  close: string;  // "19:00"
  enabled: boolean;
}

export type WorkingHours = Record<DayOfWeek, DaySchedule>;

export interface SubscriptionPlanFeatures {
  description?: string;
  duration_days?: number;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  features: SubscriptionPlanFeatures;
  monthly_price: number;
  max_doctors: number;
  max_staff: number;
  monthly_credits: number;
  has_ai_features: boolean;
  created_at: string;
}

export interface Clinic {
  id: string;
  name: string;
  slug: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  logo_url: string | null;
  is_active: boolean;
  working_hours: WorkingHours;
  working_hours_overrides?: { date: string; open: string; close: string; is_closed: boolean; note?: string }[];
  plan_id: string;
  credits: number;
  trial_ends_at: string | null;
  automations_enabled: boolean;
  n8n_workflow_id: string | null;
  n8n_workflows: { id: string; name: string; enabled: boolean }[];
  created_at: string;
}

export interface User {
  id: string;
  clinic_id: string | null; // SUPER_ADMIN için null
  full_name: string | null;
  email: string | null;
  role: UserRole;
  created_at: string;
}

export interface Patient {
  id: string;
  clinic_id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  birth_date: string | null;
  tc_identity_no: string | null;
  allergies: string | null;
  medical_alerts: string | null;
  notes: string | null;
  created_at: string;
}

export interface Appointment {
  id: string;
  clinic_id: string;
  patient_id: string;
  doctor_id: string | null;
  channel: AppointmentChannel;
  status: AppointmentStatus;
  starts_at: string;
  ends_at: string;
  notes: string | null;
  treatment_type: string | null;
  patient_note: string | null;
  internal_note: string | null;
  treatment_note: string | null;

  tags: string[] | null;
  source_conversation_id: string | null;
  source_message_id: string | null;
  estimated_amount: number | null;
  created_by: string | null;
  created_at: string;
  doctor_name?: string;
  patient_name?: string;
  patient?: { full_name: string; phone: string | null };
}

export interface Payment {
  id: string;
  clinic_id: string;
  appointment_id: string;
  patient_id: string | null;
  amount: number;
  method: string | null;
  status: string | null;
  note: string | null;
  due_date: string | null;
  created_at: string;
  patients?: { full_name: string; phone: string | null };
}
