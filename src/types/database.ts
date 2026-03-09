// Merkezi veritabanı tip tanımları – multi-tenant yapı

export enum UserRole {
  SUPER_ADMIN = "SUPER_ADMIN",
  ADMIN = "ADMIN",
  ADMIN_DOCTOR = "ADMIN_DOCTOR",
  DOCTOR = "DOCTOR",
  DOKTOR = "DOKTOR", // Legacy/Turkish support if needed
  ASSISTANT = "ASSISTANT",
  RECEPTION = "RECEPTION",
  SEKRETER = "SEKRETER", // Legacy support
  FINANCE = "FINANCE",
  FINANS = "FINANS", // Legacy support
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

export interface AssistantTiming {
  value: number;
  unit: "minutes" | "hours" | "days";
  reference: "before_start" | "after_end" | "on_due_date";
}

export interface ClinicSettings {
  id: string;
  clinic_id: string;
  message_templates: {
    REMINDER: string;
    SATISFACTION: string;
    PAYMENT: string;
  };
  notification_settings: {
    is_reminder_enabled: boolean;
    is_satisfaction_enabled: boolean;
    is_payment_enabled: boolean;
  };
  assistant_timings: {
    REMINDER: AssistantTiming;
    SATISFACTION: AssistantTiming;
    PAYMENT: AssistantTiming;
  };
  created_at: string;
  updated_at: string;
}

// SubscriptionPlan removed - using simplified subscription model

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
  subscription_status?: 'trialing' | 'active' | 'past_due' | 'canceled';
  billing_cycle?: 'monthly' | 'annual' | 'pilot';
  current_period_end?: string | null;
  last_payment_date?: string | null;
  n8n_workflows: { id: string; name: string; enabled: boolean; visible?: boolean }[];
  settings?: ClinicSettings;
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
  gender: string | null;
  blood_group: string | null;
  address: string | null;
  occupation: string | null;
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
  agreed_total: number | null;
  method: string | null;
  status: string | null;
  note: string | null;
  due_date: string | null;
  installment_count: number | null;
  installment_number: number | null;
  parent_payment_id: string | null;
  created_at: string;
  patients?: { full_name: string; phone: string | null };
}

export interface PaymentHistory {
  id: string;
  clinic_id: string;
  amount: number;
  currency: string;
  status: 'paid' | 'failed' | 'pending';
  package_name: string;
  billing_period: string;
  invoice_url?: string;
  created_at: string;
}

export interface TreatmentDefinition {
  id: string;
  clinic_id: string;
  name: string;
  default_duration: number;
  color: string | null;
  created_at: string;
  updated_at: string;
}
export interface AuditLog {
  id: string;
  clinic_id: string;
  user_id: string | null;
  action: "INSERT" | "UPDATE" | "DELETE";
  entity_type: string;
  entity_id: string;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  user?: { full_name: string | null; email: string | null };
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  type: 'info' | 'warning' | 'danger' | 'success';
  target_clinic_id: string | null;
  starts_at: string | null;
  expires_at: string | null;
  created_at: string;
  created_by: string | null;
}

export interface AnnouncementRead {
  announcement_id: string;
  user_id: string;
  read_at: string;
}
