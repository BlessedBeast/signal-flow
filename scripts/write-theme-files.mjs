import fs from "fs";
import path from "path";

const root = path.resolve(".");

function write(rel, content) {
  const filePath = path.join(root, rel);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, "utf8");
  console.log("wrote", rel);
}

write(
  "src/app/layout.tsx",
  `import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SignalFlow",
  description: "Signal intelligence for growth teams",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="light" suppressHydrationWarning>
      <body
        className={\`\${geistSans.variable} \${geistMono.variable} min-h-screen bg-background font-sans text-foreground antialiased\`}
      >
        {children}
      </body>
    </html>
  );
}
`
);

write(
  "src/app/globals.css",
  `@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --radius: 0.625rem;

    /* Light theme — active defaults */
    --background: oklch(0.985 0.004 286);
    --foreground: oklch(0.21 0.006 286);
    --card: oklch(1 0 0 / 0.78);
    --card-foreground: oklch(0.21 0.006 286);
    --popover: oklch(1 0 0 / 0.92);
    --popover-foreground: oklch(0.21 0.006 286);
    --primary: oklch(0.55 0.14 160);
    --primary-foreground: oklch(0.99 0 0);
    --secondary: oklch(0.96 0.008 286);
    --secondary-foreground: oklch(0.28 0.01 286);
    --muted: oklch(0.96 0.006 286);
    --muted-foreground: oklch(0.5 0.02 286);
    --accent: oklch(0.94 0.02 286);
    --accent-foreground: oklch(0.21 0.006 286);
    --destructive: oklch(0.577 0.245 27.325);
    --destructive-foreground: oklch(0.99 0 0);
    --border: oklch(0.9 0.01 286 / 0.55);
    --input: oklch(0.92 0.01 286 / 0.7);
    --ring: oklch(0.55 0.14 160 / 0.45);

    /* Glassmorphism (frosted white layers) */
    --glass-bg: oklch(1 0 0 / 0.72);
    --glass-border: oklch(1 0 0 / 0.55);
    --glass-strong-bg: oklch(1 0 0 / 0.88);
    --glass-strong-border: oklch(1 0 0 / 0.7);
    --glass-soft-bg: oklch(1 0 0 / 0.48);
    --glass-soft-border: oklch(1 0 0 / 0.38);

    --sidebar: var(--glass-strong-bg);
    --sidebar-foreground: oklch(0.28 0.01 286);
    --sidebar-primary: oklch(0.55 0.14 160);
    --sidebar-primary-foreground: oklch(0.99 0 0);
    --sidebar-accent: oklch(1 0 0 / 0.92);
    --sidebar-accent-foreground: oklch(0.21 0.006 286);
    --sidebar-border: var(--glass-strong-border);
    --sidebar-ring: oklch(0.55 0.14 160 / 0.35);

    /* SignalFlow semantic tokens */
    --bg-canvas: oklch(0.985 0.004 286);
    --bg-surface: oklch(1 0 0 / 0.65);
    --bg-card: oklch(1 0 0 / 0.72);
    --border-subtle: oklch(0.9 0.01 286 / 0.55);
    --border-focus: oklch(0.55 0.14 160 / 0.35);
    --text-primary: oklch(0.21 0.006 286);
    --text-secondary: oklch(0.45 0.02 286);
    --text-muted: oklch(0.55 0.02 286);
    --accent-emerald: #10b981;
    --accent-rose: #f43f5e;
    --accent-amber: #f59e0b;
  }

  .dark {
    --background: oklch(0.141 0.005 285.823);
    --foreground: oklch(0.985 0 0);
    --card: oklch(0.21 0.006 285.885);
    --card-foreground: oklch(0.985 0 0);
    --popover: oklch(0.21 0.006 285.885);
    --popover-foreground: oklch(0.985 0 0);
    --primary: oklch(0.696 0.17 162.48);
    --primary-foreground: oklch(0.141 0.005 285.823);
    --secondary: oklch(0.274 0.006 286.033);
    --secondary-foreground: oklch(0.985 0 0);
    --muted: oklch(0.274 0.006 286.033);
    --muted-foreground: oklch(0.705 0.015 286.067);
    --accent: oklch(0.274 0.006 286.033);
    --accent-foreground: oklch(0.985 0 0);
    --destructive: oklch(0.577 0.245 27.325);
    --destructive-foreground: oklch(0.985 0 0);
    --border: oklch(1 0 0 / 10%);
    --input: oklch(1 0 0 / 15%);
    --ring: oklch(0.552 0.016 285.938);

    --sidebar: oklch(0.141 0.005 285.823);
    --sidebar-foreground: oklch(0.985 0 0);
    --sidebar-primary: oklch(0.696 0.17 162.48);
    --sidebar-primary-foreground: oklch(0.141 0.005 285.823);
    --sidebar-accent: oklch(0.274 0.006 286.033);
    --sidebar-accent-foreground: oklch(0.985 0 0);
    --sidebar-border: oklch(1 0 0 / 10%);
    --sidebar-ring: oklch(0.552 0.016 285.938);

    --glass-bg: oklch(0.21 0.006 285.885 / 0.55);
    --glass-border: oklch(1 0 0 / 12%);
    --glass-strong-bg: oklch(0.21 0.006 285.885 / 0.72);
    --glass-strong-border: oklch(1 0 0 / 18%);
    --glass-soft-bg: oklch(0.21 0.006 285.885 / 0.38);
    --glass-soft-border: oklch(1 0 0 / 8%);

    --bg-canvas: #09090b;
    --bg-surface: #18181b;
    --bg-card: rgba(24, 24, 27, 0.4);
    --border-subtle: rgba(63, 63, 70, 0.6);
    --border-focus: rgba(161, 161, 170, 0.3);
    --text-primary: #fafafa;
    --text-secondary: #a1a1aa;
    --text-muted: #52525b;
  }

  * {
    @apply border-border;
  }

  body {
    @apply min-h-screen bg-background text-foreground antialiased;
    background-color: var(--background);
    background-image:
      radial-gradient(
        at 12% 8%,
        oklch(0.86 0.05 260 / 0.55) 0px,
        transparent 55%
      ),
      radial-gradient(
        at 88% 12%,
        oklch(0.88 0.06 220 / 0.45) 0px,
        transparent 50%
      ),
      radial-gradient(
        at 50% 100%,
        oklch(0.9 0.04 300 / 0.4) 0px,
        transparent 60%
      );
    background-attachment: fixed;
  }
}

@layer components {
  .glass {
    @apply rounded-xl shadow-sm;
    background: var(--glass-bg);
    border: 1px solid var(--glass-border);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
  }

  .glass-strong {
    @apply rounded-xl shadow-md;
    background: var(--glass-strong-bg);
    border: 1px solid var(--glass-strong-border);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
  }

  .glass-soft {
    @apply rounded-xl shadow-sm;
    background: var(--glass-soft-bg);
    border: 1px solid var(--glass-soft-border);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
  }

  .pulse-dot {
    @apply inline-block size-2 shrink-0 rounded-full bg-primary animate-pulse-dot;
    box-shadow: 0 0 8px oklch(0.55 0.14 160 / 0.55);
  }

  .grid-bg {
    background-image:
      linear-gradient(
        to right,
        oklch(0.21 0.006 286 / 0.06) 1px,
        transparent 1px
      ),
      linear-gradient(
        to bottom,
        oklch(0.21 0.006 286 / 0.06) 1px,
        transparent 1px
      );
    background-size: 24px 24px;
  }
}
`
);

write(
  "src/components/app-shell.tsx",
  `"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Crosshair,
  Dna,
  LayoutDashboard,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";

import {
  SignalFlowProvider,
  useSignalFlow,
} from "@/lib/signalflow-store";
import { cn } from "@/lib/utils";

const NAV_ITEMS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/dashboard", label: "Pipeline", icon: LayoutDashboard },
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

      <div className="border-t border-sidebar-border px-4 py-4">
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
  return (
    <SignalFlowProvider>
      <AppShellFrame>{children}</AppShellFrame>
    </SignalFlowProvider>
  );
}
`
);

write(
  "src/app/(app)/dashboard/page.tsx",
  `import { IntentBadge, PlatformBadge, StatusBadge } from "@/components/badges";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Pipeline
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Bounty board — demo leads loaded from global store.
        </p>
      </div>
      <div className="glass flex flex-wrap gap-2 p-4">
        <IntentBadge tier="HOT" />
        <IntentBadge tier="WARM" />
        <StatusBadge status="new" />
        <PlatformBadge platform="reddit" />
      </div>
    </div>
  );
}
`
);

write(
  "src/app/(app)/competitors/page.tsx",
  `export default function CompetitorsPage() {
  return (
    <div className="glass-soft p-6">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        Discovery
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Competitor intelligence — coming soon.
      </p>
    </div>
  );
}
`
);

write(
  "src/app/(app)/onboarding/page.tsx",
  `export default function OnboardingPage() {
  return (
    <div className="glass-soft p-6">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        Product DNA
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Configure your signal vault and search operators.
      </p>
    </div>
  );
}
`
);

console.log("done");
