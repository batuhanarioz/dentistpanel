// Ödeme Makbuzu / Dekontu üretici
// Bu belge resmi fatura değildir — yalnızca bilgilendirme amaçlıdır.

export interface ReceiptPayment {
    amount: number;
    method: string | null;
    status: string | null;
    due_date: string | null;
    note?: string | null;
    installment_number?: number | null;
    installment_count?: number | null;
    treatment_type?: string | null;
    id?: string;
}

export interface ReceiptData {
    clinicName: string;
    patient: {
        name: string;
        phone?: string | null;
    };
    payments: ReceiptPayment[];
}

function escHtml(str: string): string {
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

const NORMALIZE_METHOD: Record<string, string> = {
    nakit: "Nakit",
    kredi_karti: "Kredi Kartı",
    kredi_kartı: "Kredi Kartı",
    "kredi kartı": "Kredi Kartı",
    havale_eft: "Havale / EFT",
    "havale/eft": "Havale / EFT",
    havale: "Havale / EFT",
    eft: "Havale / EFT",
    pos_taksit: "POS / Taksit",
    pos: "POS / Taksit",
    senet: "Senet",
    cek: "Çek",
    çek: "Çek",
    diger: "Diğer",
    diğer: "Diğer",
};

function normalizeMethod(m: string | null | undefined): string {
    if (!m) return "—";
    return NORMALIZE_METHOD[m.toLowerCase().replace(/\s+/g, "_")] ?? m;
}

function statusInfo(s: string | null): { label: string; cls: string } {
    const map: Record<string, { label: string; cls: string }> = {
        paid:       { label: "Ödendi",    cls: "st-paid" },
        ödendi:     { label: "Ödendi",    cls: "st-paid" },
        pending:    { label: "Beklemede", cls: "st-pending" },
        beklemede:  { label: "Beklemede", cls: "st-pending" },
        planned:    { label: "Planlandı", cls: "st-pending" },
        partial:    { label: "Kısmi",     cls: "st-partial" },
        kısmi:      { label: "Kısmi",     cls: "st-partial" },
        cancelled:  { label: "İptal",     cls: "st-cancelled" },
        "i̇ptal":    { label: "İptal",     cls: "st-cancelled" },
        iptal:      { label: "İptal",     cls: "st-cancelled" },
        deferred:   { label: "Ertelendi", cls: "st-pending" },
    };
    return map[(s ?? "").toLowerCase()] ?? { label: s ?? "—", cls: "st-pending" };
}

function buildReceiptNo(payments: ReceiptPayment[]): string {
    const now = new Date();
    const d = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
    const suffix = payments[0]?.id
        ? payments[0].id.replace(/-/g, "").slice(-5).toUpperCase()
        : String(Math.floor(Math.random() * 90000) + 10000);
    return `MKZ-${d}-${suffix}`;
}

const CSS = `
@page { size: A4; margin: 14mm 18mm 20mm; }
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: 'Segoe UI', Arial, Helvetica, sans-serif; font-size: 11px; color: #1a202c; background: #fff; }

/* ── Header ─────────────────────────────────────────────────────────── */
.hdr { display: flex; justify-content: space-between; align-items: center; padding-bottom: 10px; border-bottom: 2.5px solid #007f6e; margin-bottom: 14px; }
.clinic-name { font-size: 22px; font-weight: 900; color: #007f6e; letter-spacing: -0.5px; line-height: 1; }
.rcpt-info { text-align: right; }
.rcpt-label { font-size: 7.5px; font-weight: 900; text-transform: uppercase; letter-spacing: 2.5px; color: #a0aec0; }
.rcpt-no { font-size: 13px; font-weight: 900; color: #1a202c; margin-top: 2px; letter-spacing: -0.3px; }
.rcpt-date { font-size: 10px; color: #718096; font-weight: 600; margin-top: 2px; }

/* ── Sections ────────────────────────────────────────────────────────── */
.sec { margin-bottom: 12px; }
.sec-label { font-size: 7.5px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; color: #a0aec0; margin-bottom: 5px; }

/* ── Patient box ─────────────────────────────────────────────────────── */
.patient-box { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; background: #f7fafc; border-radius: 6px; padding: 9px 14px; border: 1px solid #e2e8f0; }
.fld label { font-size: 7.5px; text-transform: uppercase; letter-spacing: 1px; color: #a0aec0; display: block; margin-bottom: 1px; }
.fld span { font-size: 12px; font-weight: 700; }

/* ── Table ───────────────────────────────────────────────────────────── */
table { width: 100%; border-collapse: collapse; }
thead th { background: #f7fafc; padding: 6px 10px; text-align: left; font-size: 7.5px; font-weight: 900; text-transform: uppercase; letter-spacing: 1.5px; color: #718096; border-bottom: 1px solid #e2e8f0; }
th.r, td.r { text-align: right; }
tbody td { padding: 8px 10px; border-bottom: 1px solid #f0f4f8; font-size: 11px; font-weight: 600; color: #2d3748; vertical-align: middle; }
tbody tr:last-child td { border-bottom: 2px solid #007f6e; }
td.r { font-weight: 900; font-size: 13px; color: #007f6e; }

/* ── Badges ──────────────────────────────────────────────────────────── */
.badge-method { display: inline-block; background: #f0fff4; color: #276749; border: 1px solid #c6f6d5; border-radius: 4px; padding: 2px 6px; font-size: 9px; font-weight: 700; }
.badge-inst { display: inline-block; background: #ebf4ff; color: #2b6cb0; border: 1px solid #bee3f8; border-radius: 4px; padding: 2px 6px; font-size: 9px; font-weight: 700; margin-left: 6px; }
.st-badge { display: inline-block; padding: 2px 8px; border-radius: 20px; font-size: 9px; font-weight: 900; }
.st-paid      { background: #f0fff4; color: #276749; border: 1px solid #9ae6b4; }
.st-pending   { background: #fffbeb; color: #92400e; border: 1px solid #fcd34d; }
.st-partial   { background: #ebf8ff; color: #2c5282; border: 1px solid #90cdf4; }
.st-cancelled { background: #fff5f5; color: #9b2c2c; border: 1px solid #feb2b2; }

/* ── Total ───────────────────────────────────────────────────────────── */
.total-wrap { display: flex; justify-content: flex-end; margin-top: 10px; }
.total-box { background: #f0fff4; border: 1.5px solid #68d391; border-radius: 8px; padding: 9px 16px; text-align: right; min-width: 150px; }
.total-lbl { font-size: 7.5px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; color: #276749; }
.total-amt { font-size: 22px; font-weight: 900; color: #007f6e; margin-top: 2px; letter-spacing: -0.5px; line-height: 1.1; }

/* ── Footer ──────────────────────────────────────────────────────────── */
.ftr { margin-top: 20px; padding-top: 10px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: flex-end; }
.disclaimer { font-size: 7.5px; color: #a0aec0; line-height: 1.7; max-width: 360px; }
.sig { text-align: center; }
.sig-line { border-bottom: 1px solid #cbd5e0; width: 130px; margin: 0 auto 4px; height: 20px; }
.sig-lbl { font-size: 7.5px; color: #718096; font-weight: 600; }

@media print {
  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}
`;

export function printReceipt(data: ReceiptData): void {
    const now = new Date();
    const dateStr = now.toLocaleDateString("tr-TR", { day: "2-digit", month: "long", year: "numeric" });
    const receiptNo = buildReceiptNo(data.payments);
    const total = data.payments.reduce((sum, p) => sum + p.amount, 0);

    const rows = data.payments.map(p => {
        const desc = escHtml(p.treatment_type || p.note || "Klinik Hizmeti");
        const method = escHtml(normalizeMethod(p.method));
        const { label: stLabel, cls: stCls } = statusInfo(p.status);
        const date = p.due_date ? new Date(p.due_date).toLocaleDateString("tr-TR") : "—";
        const amount = p.amount.toLocaleString("tr-TR", { minimumFractionDigits: 2 });
        const isInst = p.installment_count && p.installment_count > 1;

        return `<tr>
  <td>${desc}${isInst ? `<span class="badge-inst">Taksit ${p.installment_number}/${p.installment_count}</span>` : ""}</td>
  <td><span class="badge-method">${method}</span></td>
  <td><span class="st-badge ${stCls}">${stLabel}</span></td>
  <td>${date}</td>
  <td class="r">${amount} ₺</td>
</tr>`;
    }).join("\n");

    const totalFmt = total.toLocaleString("tr-TR", { minimumFractionDigits: 2 });

    const html = `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="utf-8">
<title>Ödeme Makbuzu – ${receiptNo}</title>
<style>${CSS}</style>
</head>
<body>

<div class="hdr">
  <div class="clinic-name">${escHtml(data.clinicName)}</div>
  <div class="rcpt-info">
    <div class="rcpt-label">Ödeme Makbuzu</div>
    <div class="rcpt-no">${receiptNo}</div>
    <div class="rcpt-date">${dateStr}</div>
  </div>
</div>

<div class="sec">
  <div class="sec-label">Hasta Bilgileri</div>
  <div class="patient-box">
    <div class="fld">
      <label>Ad Soyad</label>
      <span>${escHtml(data.patient.name)}</span>
    </div>
    ${data.patient.phone
        ? `<div class="fld"><label>Telefon</label><span>${escHtml(data.patient.phone)}</span></div>`
        : "<div></div>"
    }
  </div>
</div>

<div class="sec">
  <div class="sec-label">Ödeme Detayları</div>
  <table>
    <thead>
      <tr>
        <th>Açıklama</th>
        <th>Yöntem</th>
        <th>Durum</th>
        <th>Tarih</th>
        <th class="r">Tutar</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>
</div>

<div class="total-wrap">
  <div class="total-box">
    <div class="total-lbl">Toplam Tutar</div>
    <div class="total-amt">${totalFmt} ₺</div>
  </div>
</div>

<div class="ftr">
  <div class="disclaimer">
    Bu belge resmi fatura ya da tahsilat makbuzu değildir.<br>
    Yalnızca bilgilendirme amaçlıdır. Resmi belge için kliniğinizle iletişime geçiniz.
  </div>
  <div class="sig">
    <div class="sig-line"></div>
    <div class="sig-lbl">Yetkili İmzası</div>
  </div>
</div>

</body>
</html>`;

    const win = window.open("", "_blank", "width=820,height=1050");
    if (!win) {
        alert("Popup engellendi. Lütfen tarayıcı ayarlarından bu siteye popup iznini açınız.");
        return;
    }
    win.document.write(html);
    win.document.close();
    // Auto-print after styles render
    win.addEventListener("load", () => {
        setTimeout(() => win.print(), 150);
    });
}
