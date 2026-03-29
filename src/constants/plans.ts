export const PLAN_IDS = {
    STARTER: "starter",
    PRO: "pro",
    ENTERPRISE: "enterprise",
    TRIAL: "trial",
} as const;

export const DOCTOR_LIMITS: Record<string, number> = {
    [PLAN_IDS.STARTER]: 1,
    [PLAN_IDS.TRIAL]: 1,
    [PLAN_IDS.PRO]: 5,
    [PLAN_IDS.ENTERPRISE]: 999,
};

export const PLAN_LABELS: Record<string, string> = {
    [PLAN_IDS.STARTER]: "Başlangıç",
    [PLAN_IDS.PRO]: "Pro",
    [PLAN_IDS.ENTERPRISE]: "Enterprise",
    [PLAN_IDS.TRIAL]: "Deneme",
};
