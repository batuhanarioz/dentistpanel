import { redirect } from "next/navigation";

/**
 * Eski /login URL'si ana sayfaya yönlendirilir.
 * Ana domain (/) artık doğrudan giriş sayfasıdır.
 */
export default function LoginRedirectPage() {
  redirect("/");
}
