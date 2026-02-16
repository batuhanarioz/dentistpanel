import { describe, it, expect } from "vitest";
import { patientSchema } from "./patient";

describe("Patient Schema", () => {
    it("should validate a valid patient", () => {
        const validPatient = {
            full_name: "John Doe",
            phone: "5551234567",
            email: "john@example.com",
            tc_identity_no: "12345678901",
        };
        const result = patientSchema.safeParse(validPatient);
        expect(result.success).toBe(true);
    });

    it("should fail if full_name is too short", () => {
        const invalidPatient = {
            full_name: "J",
            phone: "5551234567",
        };
        const result = patientSchema.safeParse(invalidPatient);
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.issues[0].message).toBe("Ad soyad en az 2 karakter olmalıdır");
        }
    });

    it("should fail if phone is invalid", () => {
        const invalidPatient = {
            full_name: "John Doe",
            phone: "123",
        };
        const result = patientSchema.safeParse(invalidPatient);
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.issues[0].message).toBe("Geçerli bir telefon numarası giriniz");
        }
    });

    it("should fail if tc_identity_no is not 11 digits", () => {
        const invalidPatient = {
            full_name: "John Doe",
            phone: "5551234567",
            tc_identity_no: "123",
        };
        const result = patientSchema.safeParse(invalidPatient);
        expect(result.success).toBe(false);
    });
});
