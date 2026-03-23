import { test, expect } from "@playwright/test";

test.describe("Login Flow", () => {
    test("should load the login page", async ({ page }) => {
        await page.goto("/");
        await expect(page).toHaveTitle(/Klinik Yönetim Paneli/);
        await expect(page.locator('input[type="email"]')).toBeVisible();
        await expect(page.locator('input[type="password"]')).toBeVisible();
        await expect(page.locator('button[type="submit"]')).toContainText("Giriş yap");
    });

    test("should show error on invalid login", async ({ page }) => {
        await page.goto("/");
        await page.fill('input[type="email"]', "wrong@example.com");
        await page.fill('input[type="password"]', "wrongpassword");
        await page.click('button[type="submit"]');

        // Wait for error message (either specific from Supabase or generic "Giriş yapılamadı")
        // We'll look for the error div or the rose-700 text class
        await expect(page.locator(".text-rose-700")).toBeVisible();
    });
});
