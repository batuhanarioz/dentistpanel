import { describe, it, expect } from "vitest";
import {
    getRecurringParams,
    generateOrderId,
    tlToKurus,
    kurusToTl,
    calculatePeriodEnd,
    generateIframeHash,
    generateCancelHash,
    generateRetryHash,
} from "./paytr";

// ─── getRecurringParams ───────────────────────────────────────────────────────

describe("getRecurringParams", () => {
    it("aylık plan → frequency=1, type=M", () => {
        const params = getRecurringParams("monthly");
        expect(params.recurring_payment_frequency).toBe("1");
        expect(params.recurring_payment_frequency_type).toBe("M");
    });

    it("yıllık plan → frequency=12, type=M (PayTR 'Y' tipini desteklemez)", () => {
        const params = getRecurringParams("annual");
        expect(params.recurring_payment_frequency).toBe("12");
        expect(params.recurring_payment_frequency_type).toBe("M");
    });

    it("'Y' tipi hiçbir zaman gönderilmez", () => {
        expect(getRecurringParams("monthly").recurring_payment_frequency_type).not.toBe("Y");
        expect(getRecurringParams("annual").recurring_payment_frequency_type).not.toBe("Y");
    });

    it("sonsuz yineleme (num=0) ve tutar sınırı yok (max_charge=0)", () => {
        const monthly = getRecurringParams("monthly");
        const annual = getRecurringParams("annual");
        expect(monthly.recurring_payment_num).toBe("0");
        expect(monthly.recurring_payment_max_charge).toBe("0");
        expect(annual.recurring_payment_num).toBe("0");
        expect(annual.recurring_payment_max_charge).toBe("0");
    });

    it("döndürülen tüm değerler string tipinde (PayTR form-encoded gerektirir)", () => {
        const params = getRecurringParams("annual");
        for (const [key, val] of Object.entries(params)) {
            expect(typeof val, `${key} string olmalı`).toBe("string");
        }
    });
});

// ─── tlToKurus / kurusToTl ────────────────────────────────────────────────────

describe("tlToKurus / kurusToTl", () => {
    it("11990 TL → 1199000 kuruş", () => {
        expect(tlToKurus(11990)).toBe("1199000");
    });

    it("1199 TL → 119900 kuruş", () => {
        expect(tlToKurus(1199)).toBe("119900");
    });

    it("kuruştan TL'ye geri dönüşüm doğru", () => {
        expect(kurusToTl("1199000")).toBe(11990);
        expect(kurusToTl("119900")).toBe(1199);
    });

    it("kesirli TL doğru yuvarlanır (0.1 + 0.2 floating point tuzağı)", () => {
        // 999.99 TL → 99999 kuruş (float hatası olmadan)
        expect(tlToKurus(999.99)).toBe("99999");
    });
});

// ─── generateOrderId ──────────────────────────────────────────────────────────

describe("generateOrderId", () => {
    const clinicId = "550e8400-e29b-41d4-a716-446655440000";

    it("benzersiz ID'ler üretir", () => {
        const ids = new Set(Array.from({ length: 100 }, () => generateOrderId(clinicId)));
        expect(ids.size).toBe(100);
    });

    it("ID yalnızca alfanümerik karakterler içerir", () => {
        const id = generateOrderId(clinicId);
        expect(/^[A-Z0-9]+$/.test(id)).toBe(true);
    });

    it("ID clinic prefix ile başlar (UUID başı 8 karakter, tire hariç)", () => {
        const id = generateOrderId(clinicId);
        // 550e8400 → üstten 8 karakter, tire olmadan uppercase
        expect(id.startsWith("550E8400")).toBe(true);
    });

    it("ID uzunluğu tutarlı (8 prefix + timestamp base36 + 3 random)", () => {
        const id = generateOrderId(clinicId);
        expect(id.length).toBeGreaterThanOrEqual(14);
        expect(id.length).toBeLessThanOrEqual(24);
    });
});

// ─── calculatePeriodEnd ───────────────────────────────────────────────────────

describe("calculatePeriodEnd", () => {
    it("aylık: tam olarak 1 ay ileri", () => {
        const base = new Date("2026-01-15T00:00:00Z");
        const end = calculatePeriodEnd("monthly", base);
        expect(end.getMonth()).toBe(1); // Şubat
        expect(end.getDate()).toBe(15);
        expect(end.getFullYear()).toBe(2026);
    });

    it("yıllık: tam olarak 1 yıl ileri", () => {
        const base = new Date("2026-03-27T00:00:00Z");
        const end = calculatePeriodEnd("annual", base);
        expect(end.getFullYear()).toBe(2027);
        expect(end.getMonth()).toBe(2); // Mart
        expect(end.getDate()).toBe(27);
    });

    it("fromDate belirtilmezse bugünden hesaplar", () => {
        const before = new Date();
        const end = calculatePeriodEnd("monthly");
        const after = new Date();
        // 1 ay ileri (±1 gün tolerans)
        const diffDays = (end.getTime() - before.getTime()) / (1000 * 60 * 60 * 24);
        expect(diffDays).toBeGreaterThanOrEqual(27);
        expect(diffDays).toBeLessThanOrEqual(32);
        void after;
    });
});

// ─── Hash fonksiyonları (deterministik doğrulama) ────────────────────────────

describe("generateIframeHash", () => {
    it("string döndürür ve boş değildir", () => {
        const hash = generateIframeHash({
            userIp: "1.2.3.4",
            merchantOid: "TEST123",
            email: "test@test.com",
            paymentAmountKurus: "119900",
            userBasket: Buffer.from(JSON.stringify([["Plan", "1199.00", 1]])).toString("base64"),
            noInstallment: "1",
            maxInstallment: "0",
        });
        expect(typeof hash).toBe("string");
        expect(hash.length).toBeGreaterThan(10);
    });

    it("aynı girdilerle her seferinde aynı hash üretir (deterministik)", () => {
        const params = {
            userIp: "1.2.3.4",
            merchantOid: "TESTOID",
            email: "a@b.com",
            paymentAmountKurus: "100000",
            userBasket: "dGVzdA==",
            noInstallment: "1",
            maxInstallment: "0",
        };
        expect(generateIframeHash(params)).toBe(generateIframeHash(params));
    });

    it("farklı merchant_oid → farklı hash", () => {
        const base = {
            userIp: "1.2.3.4",
            email: "a@b.com",
            paymentAmountKurus: "100000",
            userBasket: "dGVzdA==",
            noInstallment: "1",
            maxInstallment: "0",
        };
        const h1 = generateIframeHash({ ...base, merchantOid: "OID1" });
        const h2 = generateIframeHash({ ...base, merchantOid: "OID2" });
        expect(h1).not.toBe(h2);
    });
});

describe("generateCancelHash", () => {
    it("string döndürür ve boş değildir", () => {
        const hash = generateCancelHash("TESTOID123");
        expect(typeof hash).toBe("string");
        expect(hash.length).toBeGreaterThan(10);
    });

    it("aynı merchant_oid → aynı hash (deterministik)", () => {
        expect(generateCancelHash("SAME_OID")).toBe(generateCancelHash("SAME_OID"));
    });

    it("farklı merchant_oid → farklı hash", () => {
        expect(generateCancelHash("OID_A")).not.toBe(generateCancelHash("OID_B"));
    });
});

describe("generateRetryHash", () => {
    const base = {
        originalMerchantOid: "ORIG123",
        newMerchantOid: "NEW456",
        paymentAmountKurus: "119900",
    };

    it("string döndürür ve boş değildir", () => {
        const hash = generateRetryHash(base);
        expect(typeof hash).toBe("string");
        expect(hash.length).toBeGreaterThan(10);
    });

    it("deterministik", () => {
        expect(generateRetryHash(base)).toBe(generateRetryHash(base));
    });

    it("farklı new_merchant_oid → farklı hash", () => {
        const h1 = generateRetryHash({ ...base, newMerchantOid: "NEW_A" });
        const h2 = generateRetryHash({ ...base, newMerchantOid: "NEW_B" });
        expect(h1).not.toBe(h2);
    });

    it("farklı tutar → farklı hash", () => {
        const h1 = generateRetryHash({ ...base, paymentAmountKurus: "100000" });
        const h2 = generateRetryHash({ ...base, paymentAmountKurus: "200000" });
        expect(h1).not.toBe(h2);
    });
});
