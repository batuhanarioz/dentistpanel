/**
 * HH:MM formatında saat döndürür (local timezone).
 * Randevu listelerinde ve kontrol saatleri gösteriminde kullanılır.
 */
export function formatTime(dateString: string): string {
  const d = new Date(dateString);
  const hh = d.getHours().toString().padStart(2, "0");
  const mm = d.getMinutes().toString().padStart(2, "0");
  return `${hh}:${mm}`;
}

/**
 * Yerel saat dilimine göre YYYY-MM-DD formatında tarih döndürür.
 * `new Date().toISOString().slice(0,10)` UTC kullanır ve
 * Türkiye gibi UTC+ bölgelerinde gece yarısı sonrası yanlış gün gösterir.
 */
export function localDateStr(date?: Date): string {
  const d = date ?? new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Istanbul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  // en-CA format is YYYY-MM-DD
  return formatter.format(d);
}

/**
 * Telefon numarasını WhatsApp wa.me linki için temizler ve TR ülke kodunu ekler.
 * "05xxxxxxxxx" → "905xxxxxxxxx", "5xxxxxxxxx" → "905xxxxxxxxx", "+90..." → "90..."
 */
export function formatPhoneForWhatsApp(phone: string): string {
  let cleaned = phone.replace(/\D/g, "");
  if (cleaned.startsWith("0")) {
    cleaned = "90" + cleaned.slice(1);
  } else if (!cleaned.startsWith("90") && cleaned.length === 10) {
    cleaned = "90" + cleaned;
  }
  return cleaned;
}

export type PaymentViewMode = "day" | "week" | "month" | "range";

/**
 * Ödeme listesi görünüm moduna göre [startDate, endDate) aralığı hesaplar.
 * endDate exclusive (lt ile kullanılır), startDate inclusive (gte ile kullanılır).
 */
export function paymentDateRange(
  viewMode: PaymentViewMode,
  selectedDate: string,
  startDate: string,
  endDate: string,
): { s: string; e: string } {
  if (viewMode === "range") {
    const d = new Date(endDate);
    d.setDate(d.getDate() + 1);
    return { s: startDate, e: localDateStr(d) };
  }

  const base = new Date(selectedDate);
  let start = new Date(base);
  let end = new Date(base);

  if (viewMode === "day") {
    end.setDate(end.getDate() + 1);
  } else if (viewMode === "week") {
    const diff = (base.getDay() + 6) % 7;
    start.setDate(start.getDate() - diff);
    end = new Date(start);
    end.setDate(end.getDate() + 7);
  } else {
    // month
    start = new Date(base.getFullYear(), base.getMonth(), 1);
    end = new Date(base.getFullYear(), base.getMonth() + 1, 1);
  }

  return { s: localDateStr(start), e: localDateStr(end) };
}
