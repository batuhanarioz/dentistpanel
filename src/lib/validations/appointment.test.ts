import { describe, it, expect } from "vitest";
import { internalAppointmentSchema } from "./appointment";

describe("Internal Appointment Schema", () => {
    const validAppointment = {
        patient_id: "550e8400-e29b-41d4-a716-446655440000",
        doctor_id: "550e8400-e29b-41d4-a716-446655440001",
        starts_at: "2024-02-16T10:00:00Z",
        ends_at: "2024-02-16T10:30:00Z",
        channel: "web",
        status: "confirmed",
        treatment_type: "MUAYENE",
        contact_preference: "WhatsApp",
        reminder_minutes_before: 1440,
    };

    it("should validate a valid appointment", () => {
        const result = internalAppointmentSchema.safeParse(validAppointment);
        expect(result.success).toBe(true);
    });

    it("should fail if patient_id is not a UUID", () => {
        const invalidAppt = { ...validAppointment, patient_id: "invalid" };
        const result = internalAppointmentSchema.safeParse(invalidAppt);
        expect(result.success).toBe(false);
    });

    it("should fail if starts_at is missing", () => {
        const { starts_at: _, ...invalidAppt } = validAppointment as unknown as Record<string, unknown>;
        const result = internalAppointmentSchema.safeParse(invalidAppt);
        expect(result.success).toBe(false);
    });

    it("should fail if channel is invalid", () => {
        const invalidAppt = { ...validAppointment, channel: "invalid" };
        const result = internalAppointmentSchema.safeParse(invalidAppt);
        expect(result.success).toBe(false);
    });
});
