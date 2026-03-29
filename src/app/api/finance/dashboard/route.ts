/**
 * GET /api/finance/dashboard
 *
 * Tarih aralığındaki (default: bu ay) ödendi durumundaki tahsilatları
 * randevu → tedavi tanımı üzerinden malzeme maliyeti ve hekim primiyle
 * birleştirip KPI + hekim bazında + tedavi bazında + yöntem bazında karlılık döner.
 *
 * Query params:
 *   ?from=2026-03-01  (yoksa bu ayın 1'i)
 *   ?to=2026-03-31    (yoksa bu ayın son günü)
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth-middleware";
import { supabaseAdmin } from "@/lib/supabaseAdminClient";
import { UserRole } from "@/types/database";
import { istanbulOffset } from "@/lib/closing-utils";
import { normalizePaymentMethod } from "@/constants/payments";

export const GET = withAuth(async (req: NextRequest, ctx) => {
    if (!ctx.clinicId) return NextResponse.json({ error: "forbidden" }, { status: 403 });

    const url = new URL(req.url);
    const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Istanbul" });
    const [year, month] = today.split("-");
    const defaultFrom = `${year}-${month}-01`;
    const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
    const defaultTo = `${year}-${month}-${String(lastDay).padStart(2, "0")}`;

    const from = url.searchParams.get("from") ?? defaultFrom;
    const to   = url.searchParams.get("to")   ?? defaultTo;

    // DST-aware tarih aralıkları
    const tzFrom = istanbulOffset(from);
    const tzTo   = istanbulOffset(to);
    const rangeStart = `${from}T00:00:00${tzFrom}`;
    const rangeEnd   = `${to}T23:59:59${tzTo}`;

    // Paralel: ödendi + bekleyen/kısmi ödemeler + tedavi tanımları
    const [paidRes, pendingRes, treatmentsRes] = await Promise.all([
        // 1. Ödendi — randevu + doktor bilgisiyle
        supabaseAdmin
            .from("payments")
            .select(`
                id, amount, method,
                appointments (
                    id, treatment_type, doctor_id,
                    users ( id, full_name )
                )
            `)
            .eq("clinic_id", ctx.clinicId)
            .eq("status", "paid")
            .gte("created_at", rangeStart)
            .lte("created_at", rangeEnd),

        // 2. Bekleyen / kısmi — açık alacak hesabı için
        supabaseAdmin
            .from("payments")
            .select("id, amount, status")
            .eq("clinic_id", ctx.clinicId)
            .in("status", ["pending", "partial"])
            .gte("created_at", rangeStart)
            .lte("created_at", rangeEnd),

        // 3. Tedavi tanımları
        supabaseAdmin
            .from("treatment_definitions")
            .select("name, material_cost, doctor_prim_percent")
            .eq("clinic_id", ctx.clinicId),
    ]);

    if (paidRes.error)      return NextResponse.json({ error: paidRes.error.message },      { status: 500 });
    if (treatmentsRes.error) return NextResponse.json({ error: treatmentsRes.error.message }, { status: 500 });

    // İsim → maliyet/prim lookup
    const treatmentMap = new Map<string, { material_cost: number; doctor_prim_percent: number }>(
        (treatmentsRes.data ?? []).map(t => [t.name.toLowerCase().trim(), {
            material_cost: Number(t.material_cost ?? 0),
            doctor_prim_percent: Number(t.doctor_prim_percent ?? 0),
        }])
    );

    // Açık alacak — pending + partial ödemelerin toplam tutarı
    const openReceivables = round(
        (pendingRes.data ?? []).reduce((s, p) => s + Number(p.amount ?? 0), 0)
    );

    // ─── Ana hesaplama ────────────────────────────────────────────────────────

    let totalRevenue = 0;
    let totalMaterialCost = 0;
    let totalDoctorPrim = 0;
    let unmatchedCount = 0; // tedavi tanımı bulunamayan ödeme sayısı

    const doctorMap = new Map<string, {
        name: string;
        revenue: number;
        materialCost: number;
        doctorPrim: number;
    }>();

    const treatTypeMap = new Map<string, {
        name: string;
        count: number;
        revenue: number;
        materialCost: number;
        doctorPrim: number;
    }>();

    // Ödeme yöntemi bazında toplam tahsilat
    const methodMap = new Map<string, { label: string; revenue: number; count: number }>();

    for (const p of paidRes.data ?? []) {
        const amount = Number(p.amount ?? 0);
        const appt = Array.isArray(p.appointments) ? p.appointments[0] : p.appointments;
        const treatmentType = (appt?.treatment_type ?? "").toLowerCase().trim();
        const doctorId = appt?.doctor_id ?? null;
        const users = appt?.users;
        const doctorName = Array.isArray(users)
            ? users[0]?.full_name
            : (users as { full_name?: string } | null)?.full_name ?? null;

        const def = treatmentType ? treatmentMap.get(treatmentType) : undefined;
        if (treatmentType && !def) unmatchedCount++;
        const materialCost = def ? def.material_cost : 0;
        const primPercent  = def ? def.doctor_prim_percent : 0;
        const doctorPrim   = amount * primPercent / 100;

        totalRevenue      += amount;
        totalMaterialCost += materialCost;
        totalDoctorPrim   += doctorPrim;

        // Hekim
        if (doctorId) {
            const ex = doctorMap.get(doctorId) ?? { name: doctorName ?? "Bilinmiyor", revenue: 0, materialCost: 0, doctorPrim: 0 };
            ex.revenue      += amount;
            ex.materialCost += materialCost;
            ex.doctorPrim   += doctorPrim;
            doctorMap.set(doctorId, ex);
        }

        // Tedavi türü
        const displayType = appt?.treatment_type ?? "Belirtilmemiş";
        const exTreat = treatTypeMap.get(displayType) ?? { name: displayType, count: 0, revenue: 0, materialCost: 0, doctorPrim: 0 };
        exTreat.count   += 1;
        exTreat.revenue += amount;
        exTreat.materialCost += materialCost;
        exTreat.doctorPrim   += doctorPrim;
        treatTypeMap.set(displayType, exTreat);

        // Ödeme yöntemi — normalize edilmiş label'ı key olarak kullan
        const methodKey = normalizePaymentMethod(p.method);
        const exMethod = methodMap.get(methodKey) ?? { label: methodKey, revenue: 0, count: 0 };
        exMethod.revenue += amount;
        exMethod.count   += 1;
        methodMap.set(methodKey, exMethod);
    }

    const netProfit = totalRevenue - totalMaterialCost - totalDoctorPrim;

    return NextResponse.json({
        period: { from, to },
        kpi: {
            revenue:          round(totalRevenue),
            materialCost:     round(totalMaterialCost),
            doctorPrim:       round(totalDoctorPrim),
            netProfit:        round(netProfit),
            openReceivables,
            unmatchedCount,
        },
        byDoctor: Array.from(doctorMap.entries()).map(([id, d]) => ({
            doctorId: id,
            name: d.name,
            revenue:      round(d.revenue),
            materialCost: round(d.materialCost),
            doctorPrim:   round(d.doctorPrim),
            netProfit:    round(d.revenue - d.materialCost - d.doctorPrim),
        })).sort((a, b) => b.revenue - a.revenue),
        byTreatment: Array.from(treatTypeMap.values()).map(t => ({
            name:         t.name,
            count:        t.count,
            revenue:      round(t.revenue),
            materialCost: round(t.materialCost),
            doctorPrim:   round(t.doctorPrim),
            netProfit:    round(t.revenue - t.materialCost - t.doctorPrim),
        })).sort((a, b) => b.revenue - a.revenue),
        byMethod: Array.from(methodMap.values()).map(m => ({
            label:   m.label,
            revenue: round(m.revenue),
            count:   m.count,
        })).sort((a, b) => b.revenue - a.revenue),
    });
}, { requiredRole: [UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.FINANS] });

function round(n: number) {
    return Math.round(n * 100) / 100;
}
