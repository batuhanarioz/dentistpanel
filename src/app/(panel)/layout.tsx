import { AppShell } from "@/app/components/AppShell";

export const dynamic = "force-dynamic";

export default function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
