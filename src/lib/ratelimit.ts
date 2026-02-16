import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Redis istemcisini yapılandır
const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

/**
 * Hassas rotalar için sıkı limit (Örn: Şifre Değiştirme)
 * 15 dakikada IP başına 5 istek
 */
export const sensitiveRateLimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, "15 m"),
    analytics: true,
    prefix: "@upstash/ratelimit/sensitive",
});

/**
 * Genel API rotaları için orta dereceli limit
 * 1 dakikada IP başına 30 istek
 */
export const generalRateLimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(30, "1 m"),
    analytics: true,
    prefix: "@upstash/ratelimit/general",
});

/**
 * İstek yapan kullanıcının IP adresini al
 */
export function getIP(req: Request): string {
    const forwarded = req.headers.get("x-forwarded-for");
    const ip = forwarded ? forwarded.split(/, /)[0] : "127.0.0.1";
    return ip;
}
