// Merkezi veritabanı tip tanımları – multi-tenant yapı
// DB enum değerleri Türkçe adlar kullanıyor (DOKTOR, SEKRETER, FINANS)

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
  | "scheduled"
  | "arrived"
  | "in_treatment"
  | "completed"
  | "cancelled"
  | "no_show";

/** Dinamik kanal — DB'de text sütunu, değer klinik ayarlarından gelir. */
export type AppointmentChannel = string;

export type PaymentStatus =
  | "paid"
  | "pending"
  | "planned"
  | "partial"
  | "cancelled"
  | "deferred"
  // Legacy Turkish values – DB still accepts these; normalize on write
  | "Ödendi"
  | "Beklemede"
  | "Kısmi"
  | "İptal";

export type UssExportState = "not_ready" | "ready" | "queued" | "exported" | "failed";
export type UssEnvironment = "test" | "prod";
export type IdentityType = "tc" | "passport" | "foreign_id" | "other";

export type DayOfWeek = "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";

export interface DaySchedule {
  open: string;    // "09:00"
  close: string;   // "19:00"
  enabled: boolean;
}

export type WorkingHours = Record<DayOfWeek, DaySchedule>;

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
  /** Kliniğe özel randevu kanalları. Boş dizi = tüm randevular "Belirtilmedi". */
  appointment_channels: string[];
  created_at: string;
  updated_at: string;
}

export interface Clinic {
  id: string;
  name: string;
  slug: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  district: string | null;
  logo_url: string | null;
  is_active: boolean;
  working_hours: WorkingHours;
  working_hours_overrides?: { date: string; open: string; close: string; is_closed: boolean; note?: string }[];
  subscription_status?: "trialing" | "active" | "past_due" | "canceled";
  billing_cycle?: "monthly" | "annual" | "pilot";
  current_period_end?: string | null;
  last_payment_date?: string | null;
  last_active_at?: string | null;
  n8n_workflows: { id: string; name: string; enabled: boolean; visible?: boolean }[];
  settings?: ClinicSettings;
  // USS entegrasyonu
  ministry_facility_code: string | null;
  uss_enabled: boolean;
  uss_environment: UssEnvironment;
  uss_last_sync_at: string | null;
  created_at: string;
}

export interface User {
  id: string;
  clinic_id: string | null; // SUPER_ADMIN için null
  full_name: string | null;
  email: string | null;
  role: UserRole;
  // USS / Sağlık Bakanlığı entegrasyonu
  ministry_practitioner_code: string | null;
  specialty_code: string | null;
  is_clinical_provider: boolean;
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
  identity_type: IdentityType;
  nationality_code: string | null;
  gender: string | null;
  blood_group: string | null;
  address: string | null;
  occupation: string | null;
  allergies: string | null;
  medical_alerts: string | null;
  notes: string | null;
  kvkk_consent_at: string | null;
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
  encounter_external_ref: string | null;
  completed_at: string | null;
  uss_export_state: UssExportState;
  created_at: string;
  updated_at: string | null;
  // Join alanları (sorgu bazlı, isteğe bağlı)
  doctor_name?: string;
  patient_name?: string;
  patient?: { full_name: string; phone: string | null };
}

export interface Payment {
  id: string;
  clinic_id: string;
  appointment_id: string | null;
  patient_id: string | null;
  amount: number;
  agreed_total: number | null;
  method: string | null;
  status: PaymentStatus | null;
  note: string | null;
  due_date: string | null;
  installment_count: number | null;
  installment_number: number | null;
  parent_payment_id: string | null;
  created_at: string;
  insurance_company: string | null;
  insurance_amount: number | null;
  insurance_status: string | null;
  policy_number: string | null;
  discount_amount: number | null;
  receipt_number: string | null;
  treatment_plan_item_id: string | null;
  // Join alanları
  patients?: { full_name: string; phone: string | null };
  treatment_plan_item?: { id: string; procedure_name: string; tooth_no: string | null } | null;
}

export interface ClinicalProcedure {
  id: string;
  clinic_id: string;
  appointment_id: string;
  patient_id: string;
  doctor_id: string | null;
  treatment_definition_id: string | null;
  procedure_name: string;
  local_code: string | null;
  tooth_numbers: string[] | null;
  quantity: number;
  unit_price: number | null;
  total_price: number | null;
  performed_at: string;
  status: "planned" | "completed" | "cancelled" | "draft";
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface TreatmentPlan {
  id: string;
  clinic_id: string;
  patient_id: string;
  appointment_id: string | null;
  next_appointment_id: string | null;
  doctor_id: string | null;
  created_by: string | null;
  status: "draft" | "planned" | "approved" | "in_progress" | "completed" | "cancelled";
  title: string | null;
  note: string | null;
  total_estimated_amount: number | null;
  created_at: string;
  updated_at: string;
}

export interface TreatmentPlanItem {
  id: string;
  clinic_id: string;
  treatment_plan_id: string;
  patient_id: string;
  tooth_no: string | null;
  procedure_name: string;
  description: string | null;
  quantity: number;
  unit_price: number;
  total_price: number | null; // generated column: quantity * unit_price
  assigned_doctor_id: string | null;
  status: "planned" | "approved" | "in_progress" | "completed" | "cancelled";
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface PaymentHistory {
  id: string;
  clinic_id: string;
  amount: number;
  currency: string;
  status: "paid" | "failed" | "pending";
  package_name: string;
  billing_period: string;
  invoice_url?: string;
  created_at: string;
}

export interface AddonProduct {
  id: string;
  slug: string;
  name: string;
  description: string;
  features: string[];
  price_monthly: number | null;
  is_active: boolean;
  sort_order: number;
  gradient: string;
  icon: string;
  created_at: string;
}

export interface ClinicAddon {
  id: string;
  clinic_id: string;
  addon_id: string;
  is_visible: boolean;
  is_enabled: boolean;
  activated_at: string | null;
  created_at: string;
  addon_products: AddonProduct;
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
  type: "info" | "warning" | "danger" | "success";
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

export interface PlatformSettings {
  id: string; // always "global"
  monthly_price: number;
  annual_price: number;
  trial_days: number;
  sms_addon_price: number;
  updated_at: string;
}

export interface PlatformSupportRequest {
  id: string;
  clinic_id: string | null;
  user_id: string | null;
  subject: string;
  message: string;
  status: string;
  priority: string;
  created_at: string;
}

// Sabitler — type dosyasında tutulur, import kolaylığı için
export const DEFAULT_WORKING_HOURS: WorkingHours = {
  monday: { open: "09:00", close: "19:00", enabled: true },
  tuesday: { open: "09:00", close: "19:00", enabled: true },
  wednesday: { open: "09:00", close: "19:00", enabled: true },
  thursday: { open: "09:00", close: "19:00", enabled: true },
  friday: { open: "09:00", close: "19:00", enabled: true },
  saturday: { open: "09:00", close: "14:00", enabled: false },
  sunday: { open: "09:00", close: "14:00", enabled: false },
};

export const ORDERED_DAYS: DayOfWeek[] = [
  "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
];

export const DAY_LABELS: Record<DayOfWeek, string> = {
  monday: "Pazartesi",
  tuesday: "Salı",
  wednesday: "Çarşamba",
  thursday: "Perşembe",
  friday: "Cuma",
  saturday: "Cumartesi",
  sunday: "Pazar",
};

export interface SubscriptionPlanFeatures {
  description?: string;
  duration_days?: number;
}

// ─── Anamnez (Tıbbi Geçmiş) ───────────────────────────────────────────────────

export const SYSTEMIC_CONDITIONS = [
  { key: "diabetes", label: "Diyabet (Şeker Hastalığı)" },
  { key: "hypertension", label: "Hipertansiyon (Yüksek Tansiyon)" },
  { key: "heart_disease", label: "Kalp Hastalığı" },
  { key: "heart_valve", label: "Kalp Kapak Sorunu" },
  { key: "asthma_copd", label: "Astım / KOAH" },
  { key: "kidney_disease", label: "Böbrek Hastalığı" },
  { key: "liver_disease", label: "Karaciğer Hastalığı" },
  { key: "thyroid", label: "Tiroid Hastalığı" },
  { key: "epilepsy", label: "Epilepsi" },
  { key: "cancer", label: "Kanser / Kemoterapi" },
  { key: "osteoporosis", label: "Osteoporoz" },
  { key: "hepatitis", label: "Hepatit B / C" },
] as const;

export const ALLERGY_OPTIONS = [
  { key: "penicillin", label: "Penisilin / Antibiyotik" },
  { key: "latex", label: "Latex" },
  { key: "anesthesia", label: "Anestezi İlaçları" },
  { key: "aspirin_nsaid", label: "Aspirin / NSAİD" },
  { key: "iodine", label: "İyot" },
  { key: "sulfa", label: "Sülfa İlaçları" },
] as const;

export type SmokingStatus = "never" | "occasional" | "regular" | "quit";
export type AlcoholStatus = "never" | "occasional" | "regular";

export interface PatientAnamnesis {
  id: string;
  clinic_id: string;
  patient_id: string;
  // Sistemik hastalıklar
  systemic_conditions: string[];
  systemic_other: string | null;
  // İlaçlar
  current_medications: string | null;
  uses_anticoagulants: boolean;
  anticoagulant_name: string | null;
  // Alerjiler
  allergies_list: string[];
  allergies_other: string | null;
  // Geçmiş
  previous_surgeries: string | null;
  // Özel durumlar
  is_pregnant: boolean;
  pregnancy_month: number | null;
  is_breastfeeding: boolean;
  has_pacemaker: boolean;
  has_prosthetic_joint: boolean;
  had_organ_transplant: boolean;
  // Diş geçmişi
  dental_anxiety: boolean;
  bad_anesthesia_history: boolean;
  prolonged_bleeding_history: boolean;
  // Yaşam tarzı
  smoking_status: SmokingStatus;
  alcohol_status: AlcoholStatus;
  // Acil iletişim
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  emergency_contact_relation: string | null;
  // Ek notlar
  additional_notes: string | null;
  // Meta
  updated_at: string;
  updated_by: string | null;
}

export const EMPTY_ANAMNESIS: Omit<PatientAnamnesis, "id" | "clinic_id" | "patient_id" | "updated_at" | "updated_by"> = {
  systemic_conditions: [],
  systemic_other: null,
  current_medications: null,
  uses_anticoagulants: false,
  anticoagulant_name: null,
  allergies_list: [],
  allergies_other: null,
  previous_surgeries: null,
  is_pregnant: false,
  pregnancy_month: null,
  is_breastfeeding: false,
  has_pacemaker: false,
  has_prosthetic_joint: false,
  had_organ_transplant: false,
  dental_anxiety: false,
  bad_anesthesia_history: false,
  prolonged_bleeding_history: false,
  smoking_status: "never",
  alcohol_status: "never",
  emergency_contact_name: null,
  emergency_contact_phone: null,
  emergency_contact_relation: null,
  additional_notes: null,
};

// ─── Dental Chart (Odontogram) ────────────────────────────────────────────────

export type ToothStatus =
  | "healthy"
  | "cavity"
  | "filling"
  | "crown"
  | "missing"
  | "implant"
  | "root_canal"
  | "bridge"
  | "extraction_needed";

export interface ToothData {
  status: ToothStatus;
  note?: string;
  updatedAt?: string;
}

/** FDI tooth number string → ToothData. Only non-healthy teeth need entries. */
export type TeethData = Partial<Record<string, ToothData>>;

export interface DentalChart {
  id: string;
  clinic_id: string;
  patient_id: string;
  teeth_data: TeethData;
  updated_at: string;
  updated_by: string | null;
}
