"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  Box,
  Database,
  LogOut,
  MessageSquare,
  Sparkles,
  UserRound,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { useState, type ReactNode } from "react";

import { ScanForLeadsButton } from "@/components/scan-for-leads-button";
import { createBrowserSupabase } from "@/lib/supabase-browser";
import { useSignalFlow } from "@/lib/signalflow-store";
import { cn } from "@/lib/utils";

type NavLink = { href: string; label: string; icon: LucideIcon };

type NavCategory = {
  header: string;
  links: NavLink[];
};

const NAV_CATEGORIES: NavCategory[] = [
  {
    header: "📡 Discovery Stream",
    links: [
      { href: "/stream/dashboard", label: "Active Leads", icon: Activity },
      { href: "/stream/vault", label: "Product DNA Vault", icon: Database },
    ],
  },
  {
    header: "⚡ Velocity Hub",
    links: [
      { href: "/velocity/inbound", label: "1-Click Replier", icon: Zap },
      { href: "/velocity/bip", label: "Build In Public", icon: MessageSquare },
    ],
  },
  {
    header: "🧪 Growth Labs",
    links: [
      { href: "/labs/geo-seeds", label: "GEO Seed Engine", icon: Sparkles },
      { href: "/labs/side-cars", label: "Side-Car Factory", icon: Box },
    ],
  },
];

const PROFILE_LINK: NavLink = {
  href: "/profile",
  label: "Profile & Billing",
  icon: UserRound,
};

function isNavActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavItem({
  href,
  label,
  icon: Icon,
  isActive,
}: NavLink & { isActive: boolean }) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
        isActive
          ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
          : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
      )}
    >
      <Icon className="size-4 shrink-0" aria-hidden />
      {label}
    </Link>
  );
}

function AppShellSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { profile } = useSignalFlow();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      const supabase = createBrowserSupabase();
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("[app-shell] signOut:", error.message);
        return;
      }
      router.push("/login");
      router.refresh();
    } finally {
      setSigningOut(false);
    }
  }

  const profileActive = isNavActive(pathname, PROFILE_LINK.href);

  return (
    <aside className="fixed left-0 top-0 z-40 hidden h-screen w-60 flex-col border-r border-sidebar-border glass-panel text-sidebar-foreground md:flex">
      <div className="flex items-center gap-2.5 border-b border-sidebar-border px-4 py-5">
        <div className="flex size-7 items-center justify-center rounded-lg bg-primary shadow-sm">
          <Zap size={14} className="text-primary-foreground" aria-hidden />
        </div>
        <span className="text-sm font-semibold tracking-tight text-sidebar-foreground">
          SignalFlow
        </span>
      </div>

      <nav className="flex flex-1 flex-col gap-5 overflow-y-auto px-3 py-4">
        {NAV_CATEGORIES.map((category) => (
          <div key={category.header} className="space-y-1">
            <p className="px-3 pb-1 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
              {category.header}
            </p>
            {category.links.map((link) => (
              <NavItem
                key={link.href}
                {...link}
                isActive={isNavActive(pathname, link.href)}
              />
            ))}
          </div>
        ))}
      </nav>

      <div className="space-y-3 border-t border-sidebar-border px-3 py-4">
        <NavItem {...PROFILE_LINK} isActive={profileActive} />

        <div>
          <p className="px-3 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
            Miner status
          </p>
          <div className="mt-2 flex items-center gap-2 px-3">
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

        <button
          type="button"
          disabled={signingOut}
          onClick={() => void handleSignOut()}
          className={cn(
            "glass-soft flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors",
            "hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50"
          )}
        >
          <span>Sign Out</span>
          <LogOut className="size-4 shrink-0" aria-hidden />
        </button>
      </div>
    </aside>
  );
}

function AppShellFrame({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background">
      <AppShellSidebar />
      <div className="flex min-h-screen min-w-0 flex-1 flex-col md:ml-60">
        {children}
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return <AppShellFrame>{children}</AppShellFrame>;
}
