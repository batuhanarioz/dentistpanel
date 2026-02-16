import * as Sentry from "@sentry/nextjs";

Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN,
    tracesSampleRate: 1.0,
    debug: false,
    replaysOnErrorSampleRate: 1.0,
    replaysSessionSampleRate: 0.1,

    beforeSend(event) {
        if (event.request && typeof event.request.data === 'string') {
            try {
                const data = JSON.parse(event.request.data) as Record<string, unknown>;
                const sanitize = (obj: Record<string, unknown>) => {
                    for (const key in obj) {
                        if (['full_name', 'phone', 'email', 'tc_identity_no', 'birth_date', 'allergies', 'medical_alerts'].includes(key)) {
                            obj[key] = '[FILTERED]';
                        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
                            sanitize(obj[key] as Record<string, unknown>);
                        }
                    }
                };
                sanitize(data);
                event.request.data = JSON.stringify(data);
            } catch {
                event.request.data = '[FILTERED]';
            }
        }
        return event;
    },
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
