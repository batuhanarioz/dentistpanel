/**
 * [slug] altındaki tüm sayfalar tamamen dinamiktir (veritabanı tabanlı).
 * Next.js'in statik path oluşturma denemesini engeller.
 */
export const dynamic = "force-dynamic";

export default function SlugLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
