/**
 * Basit in-memory sliding window rate limiter.
 * Next.js single-instance ortamı için yeterli.
 */

interface RateLimitEntry {
    count: number;
    resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// 10 dakikada bir eski girişleri temizle
if (typeof setInterval !== "undefined") {
    setInterval(() => {
        const now = Date.now();
        for (const [key, entry] of store.entries()) {
            if (entry.resetAt < now) store.delete(key);
        }
    }, 10 * 60 * 1000);
}

/**
 * @param key      IP veya benzeri benzersiz tanımlayıcı
 * @param limit    İzin verilen maksimum istek sayısı
 * @param windowMs Zaman penceresi (ms)
 * @returns { allowed: boolean, remaining: number, resetAt: number }
 */
export function rateLimit(
    key: string,
    limit: number,
    windowMs: number
): { allowed: boolean; remaining: number; resetAt: number } {
    const now = Date.now();
    const entry = store.get(key);

    if (!entry || entry.resetAt < now) {
        store.set(key, { count: 1, resetAt: now + windowMs });
        return { allowed: true, remaining: limit - 1, resetAt: now + windowMs };
    }

    if (entry.count >= limit) {
        return { allowed: false, remaining: 0, resetAt: entry.resetAt };
    }

    entry.count++;
    return { allowed: true, remaining: limit - entry.count, resetAt: entry.resetAt };
}
