import "@testing-library/jest-dom";
import { vi } from "vitest";

// Mock Supabase to prevent real calls during tests
vi.mock("@/lib/supabaseClient", () => ({
    supabase: {
        from: vi.fn(() => ({
            select: vi.fn().mockReturnThis(),
            insert: vi.fn().mockReturnThis(),
            update: vi.fn().mockReturnThis(),
            delete: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockReturnThis(),
        })),
    },
}));
