import { redirect } from "next/navigation";

/**
 * Kök URL (/) her zaman giriş sayfasına yönlendirir.
 * Giriş yapmış kullanıcılar /login sayfasında oturum kontrolü ile panele yönlendirilir.
 */
export default function RootPage() {
  redirect("/login");
}
