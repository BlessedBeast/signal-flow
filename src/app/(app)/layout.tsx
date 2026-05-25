import { AppShell } from "@/components/app-shell";
import { AppHeader } from "@/components/layout/app-header";

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AppShell>
      <AppHeader />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-6xl px-6 py-8">{children}</div>
      </main>
    </AppShell>
  );
}
