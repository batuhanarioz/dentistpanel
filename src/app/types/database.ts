// Merkezi veritabanı tip tanımları – multi-tenant yapı

export type UserRole =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "DOKTOR"
  | "SEKRETER"
  | "FINANS";

export type AppointmentStatus =
  | "pending"
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

export const DEFAULT_WORKING_HOURS: WorkingHours = {
  monday: { open: "09:00", close: "19:00", enabled: true },
  tuesday: { open: "09:00", close: "19:00", enabled: true },
  wednesday: { open: "09:00", close: "19:00", enabled: true },
  thursday: { open: "09:00", close: "19:00", enabled: true },
  friday: { open: "09:00", close: "19:00", enabled: true },
  saturday: { open: "09:00", close: "14:00", enabled: false },
  sunday: { open: "09:00", close: "14:00", enabled: false },
};

export const DAY_LABELS: Record<DayOfWeek, string> = {
  monday: "Pazartesi",
  tuesday: "Salı",
  wednesday: "Çarşamba",
  thursday: "Perşembe",
  friday: "Cuma",
  saturday: "Cumartesi",
  sunday: "Pazar",
};

export const ORDERED_DAYS: DayOfWeek[] = [
  "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
];

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
  contact_preference: string | null;
  reminder_minutes_before: number | null;
  tags: string[] | null;
  source_conversation_id: string | null;
  source_message_id: string | null;
  estimated_amount: number | null;
  created_by: string | null;
  created_at: string;
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
}
