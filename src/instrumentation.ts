import * as Sentry from "@sentry/nextjs";

export async function register() {
    if (process.env.NEXT_RUNTIME === "nodejs") {
        Sentry.init({
            dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN,
            tracesSampleRate: 1.0,
            debug: false,
            beforeSend(event) {
                if (event.extra) {
                    ["payload", "data", "body"].forEach((key) => {
                        if (event.extra && event.extra[key]) {
                            event.extra[key] = "[FILTERED]";
                        }
                    });
                }
                return event;
            },
        });
    }

    if (process.env.NEXT_RUNTIME === "edge") {
        Sentry.init({
            dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN,
            tracesSampleRate: 1.0,
            debug: false,
        });
    }
}

export const onRequestError = Sentry.captureRequestError;
