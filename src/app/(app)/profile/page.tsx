"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import {
  CreditCard,
  ExternalLink,
  Loader2,
  LogOut,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createBrowserSupabase } from "@/lib/supabase-browser";
import { useSignalFlow } from "@/lib/signalflow-store";
import { cn } from "@/lib/utils";

type AccountHealth = "healthy" | "pending_verification" | "attention";

const SUBSCRIPTION_TIERS = {
  free: {
    label: "Free Sandbox Plan",
    description: "Core discovery stream, vault storage, and manual lead scans.",
  },
  founder: {
    label: "Founder Elite Tracker",
    description:
      "Unlimited mining, priority alerts, and advanced velocity tools.",
  },
} as const;

function resolveAccountHealth(user: User | null): AccountHealth {
  if (!user) return "attention";
  if (!user.email_confirmed_at) return "pending_verification";
  return "healthy";
}

function AccountHealthBadge({ health }: { health: AccountHealth }) {
  const config = {
    healthy: {
      label: "Account healthy",
      className: "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    },
    pending_verification: {
      label: "Email verification pending",
      className: "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-400",
    },
    attention: {
      label: "Session attention required",
      className: "border-destructive/25 bg-destructive/10 text-destructive",
    },
  }[health];

  return (
    <Badge variant="outline" className={cn("font-medium", config.className)}>
      {config.label}
    </Badge>
  );
}

function formatMemberSince(iso: string | undefined) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso));
}

export default function ProfilePage() {
  const router = useRouter();
  const { profile } = useSignalFlow();
  const [user, setUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  const [billingLoading, setBillingLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadUser() {
      try {
        const supabase = createBrowserSupabase();
        const { data, error } = await supabase.auth.getUser();
        if (error) throw error;
        if (!cancelled) setUser(data.user);
      } catch (err) {
        console.error("[profile] getUser:", err);
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setLoadingUser(false);
      }
    }

    void loadUser();

    return () => {
      cancelled = true;
    };
  }, []);

  const accountHealth = useMemo(() => resolveAccountHealth(user), [user]);

  const activeTier = SUBSCRIPTION_TIERS.free;

  async function handleManageBilling() {
    if (billingLoading) return;
    setBillingLoading(true);
    try {
      // Future: POST /api/billing/portal → Stripe Customer Portal URL
      await new Promise((resolve) => setTimeout(resolve, 400));
      toast.info("Stripe Customer Portal redirect will be wired here.");
    } finally {
      setBillingLoading(false);
    }
  }

  async function handleSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      const supabase = createBrowserSupabase();
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast.success("Session closed safely");
      router.push("/login");
      router.refresh();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to close session";
      toast.error(message);
    } finally {
      setSigningOut(false);
    }
  }

  if (loadingUser) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <Loader2
          className="size-8 animate-spin text-primary"
          aria-label="Loading profile"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="font-mono text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Account workspace
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Profile & billing
        </h1>
        <p className="text-xs text-muted-foreground">
          Manage your session, subscription tier, and secure account controls.
        </p>
      </div>

      <section className="rounded-xl glass p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <UserRound className="size-4 text-primary" aria-hidden />
              <h2 className="font-semibold tracking-tight text-foreground">
                User session profile
              </h2>
            </div>
            <p className="text-xs text-muted-foreground">
              Identity details tied to your active Supabase session.
            </p>
          </div>
          <AccountHealthBadge health={accountHealth} />
        </div>

        <dl className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <dt className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
              Email
            </dt>
            <dd className="font-mono text-xs text-foreground">
              {user?.email ?? "No email on file"}
            </dd>
          </div>
          <div className="space-y-1">
            <dt className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
              User ID
            </dt>
            <dd className="font-mono text-xs text-foreground">
              {user?.id ?? "—"}
            </dd>
          </div>
          <div className="space-y-1">
            <dt className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
              Member since
            </dt>
            <dd className="font-mono text-xs text-foreground">
              {formatMemberSince(user?.created_at)}
            </dd>
          </div>
          <div className="space-y-1">
            <dt className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
              Vault status
            </dt>
            <dd className="font-mono text-xs text-foreground">
              {profile.product_dna ? "Product DNA synced" : "Vault not initialized"}
            </dd>
          </div>
          <div className="space-y-1">
            <dt className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
              Miner state
            </dt>
            <dd className="font-mono text-xs text-foreground">
              {profile.is_mining ? "Actively mining" : "Idle"}
            </dd>
          </div>
        </dl>
      </section>

      <section className="rounded-xl glass p-6">
        <div className="flex items-center gap-2">
          <CreditCard className="size-4 text-primary" aria-hidden />
          <h2 className="font-semibold tracking-tight text-foreground">
            Subscription & billing
          </h2>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Track your plan tier and manage Stripe invoices when billing goes live.
        </p>

        <div className="mt-6 rounded-lg border border-border/60 bg-background/40 p-5">
          <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            Active tier
          </p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
            {activeTier.label}
          </p>
          <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
            {activeTier.description}
          </p>
        </div>

        <Button
          type="button"
          className="mt-6 gap-2"
          disabled={billingLoading}
          onClick={() => void handleManageBilling()}
        >
          {billingLoading ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Opening portal...
            </>
          ) : (
            <>
              Manage Billing & Invoices
              <ExternalLink className="size-4 shrink-0" aria-hidden />
            </>
          )}
        </Button>
      </section>

      <section className="rounded-xl glass p-6">
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-4 text-primary" aria-hidden />
          <h2 className="font-semibold tracking-tight text-foreground">
            Security & account
          </h2>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Close your session safely on shared or untrusted devices.
        </p>

        <Button
          type="button"
          variant="outline"
          className="mt-6 w-full gap-2 sm:w-auto"
          disabled={signingOut}
          onClick={() => void handleSignOut()}
        >
          {signingOut ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Signing out...
            </>
          ) : (
            <>
              <LogOut className="size-4 shrink-0" aria-hidden />
              Log Out of Application
            </>
          )}
        </Button>
      </section>
    </div>
  );
}
