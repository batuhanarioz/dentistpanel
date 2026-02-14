/**
 * Yerel saat dilimine göre YYYY-MM-DD formatında tarih döndürür.
 * `new Date().toISOString().slice(0,10)` UTC kullanır ve
 * Türkiye gibi UTC+ bölgelerinde gece yarısı sonrası yanlış gün gösterir.
 */
export function localDateStr(date?: Date): string {
  const d = date ?? new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
