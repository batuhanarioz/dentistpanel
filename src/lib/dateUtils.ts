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
