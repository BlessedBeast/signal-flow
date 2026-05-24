"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Crosshair,
  Dna,
  LayoutDashboard,
  Megaphone,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";

import { ScanForLeadsButton } from "@/components/scan-for-leads-button";
import { useSignalFlow } from "@/lib/signalflow-store";
import { cn } from "@/lib/utils";

const NAV_ITEMS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/dashboard", label: "Pipeline", icon: LayoutDashboard },
  { href: "/bip", label: "Build In Public Workspace", icon: Megaphone },
  { href: "/competitors", label: "Discovery", icon: Crosshair },
  { href: "/onboarding", label: "Product DNA", icon: Dna },
];

function AppShellSidebar() {
  const pathname = usePathname();
  const { profile } = useSignalFlow();

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 flex h-screen w-56 flex-col",
        "border-r border-sidebar-border glass-strong"
      )}
    >
      <div className="flex items-center gap-2.5 px-4 py-5">
        <div className="flex size-7 items-center justify-center rounded-lg bg-primary shadow-sm">
          <Zap
            size={14}
            className="text-primary-foreground"
            aria-hidden
          />
        </div>
        <span className="text-sm font-semibold tracking-tight text-sidebar-foreground">
          SignalFlow
        </span>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href;

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-sidebar-accent/70 hover:text-sidebar-foreground"
              )}
            >
              <Icon className="size-4 shrink-0" aria-hidden />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border px-4 py-4 space-y-3">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
            Miner status
          </p>
          <div className="mt-2 flex items-center gap-2">
            {profile.is_mining ? (
              <>
                <span className="pulse-dot" aria-hidden />
                <span className="text-xs font-medium text-primary">
                  Actively mining
                </span>
              </>
            ) : (
              <>
                <span
                  className="size-2 shrink-0 rounded-full bg-muted-foreground/35"
                  aria-hidden
                />
                <span className="text-xs text-muted-foreground">Idle</span>
              </>
            )}
          </div>
        </div>

        <ScanForLeadsButton size="sm" fullWidth />
      </div>
    </aside>
  );
}

function AppShellFrame({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background">
      <AppShellSidebar />
      <main className="ml-56 min-h-screen flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-6 py-8">{children}</div>
      </main>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return <AppShellFrame>{children}</AppShellFrame>;
}
