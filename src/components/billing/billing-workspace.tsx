"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Check,
  CreditCard,
  ExternalLink,
  Loader2,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { getAuthHeaders } from "@/lib/api-auth";
import {
  BILLING_TIERS,
  type BillingTierDefinition,
  type SubscriptionTierId,
} from "@/lib/billing/tiers";
import type { UserBillingContext } from "@/lib/billing/user-billing";
import { cn } from "@/lib/utils";

function MonoEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
      {children}
    </p>
  );
}

function QuotaMeter({ billing }: { billing: UserBillingContext }) {
  const used = billing.leadsUsed;
  const cap = billing.monthlyLeadCap;
  const pct = cap > 0 ? Math.min(100, Math.round((used / cap) * 100)) : 0;

  return (
    <section className="glass-strong rounded-2xl border border-border/60 p-6 sm:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <MonoEyebrow>Active billing cycle</MonoEyebrow>
          <p className="mt-2 text-lg font-semibold tracking-tight text-foreground sm:text-xl">
            Ledger Quota Used:{" "}
            <span className="text-primary">
              {used} / {cap}
            </span>{" "}
            Leads
          </p>
          <p className="mt-1 font-mono text-[11px] uppercase tracking-tight text-muted-foreground">
            {billing.cycleLabel} · {billing.tierName} · Daily drop batch{" "}
            {billing.dailyDropQuota}
          </p>
        </div>
        <p className="font-mono text-2xl font-bold tracking-tight text-foreground">
          {pct}%
        </p>
      </div>

      <div
        className="mt-6 h-3 overflow-hidden rounded-full border border-border/60 bg-muted/30"
        role="progressbar"
        aria-valuenow={used}
        aria-valuemin={0}
        aria-valuemax={cap}
        aria-label={`Ledger quota ${used} of ${cap} leads used`}
      >
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            pct >= 90 ? "bg-destructive" : "bg-primary"
          )}
          style={{ width: `${pct}%` }}
        />
      </div>

      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
        Quota is tied to your{" "}
        <span className="font-medium text-foreground">
          {billing.tierName}
        </span>{" "}
        plan via the Daily Drop engine ({billing.dailyDropQuota} leads released
        per drop). Upgrade before you hit the cap to keep the Hunter running.
      </p>
    </section>
  );
}

function PricingTierCard({
  tier,
  activeTierId,
  onSelectPlan,
  checkoutLoading,
}: {
  tier: BillingTierDefinition;
  activeTierId: SubscriptionTierId;
  onSelectPlan: (tierId: SubscriptionTierId) => void;
  checkoutLoading: SubscriptionTierId | null;
}) {
  const isActive = tier.id === activeTierId;
  const isHighlighted = tier.highlighted === true;
  const isLoading = checkoutLoading === tier.id;

  return (
    <article
      className={cn(
        "glass-strong relative flex flex-col rounded-2xl border p-6 transition-all duration-300",
        isHighlighted
          ? "border-primary/50 shadow-[0_0_32px_-8px] shadow-primary/30"
          : "border-border/60 hover:border-primary/35",
        isActive && !isHighlighted && "ring-1 ring-primary/25"
      )}
    >
      {isHighlighted ? (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-primary/50 bg-primary/10 px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-primary">
          Most popular
        </span>
      ) : null}

      <MonoEyebrow>{tier.dailyDropsLabel}</MonoEyebrow>
      <h3 className="mt-2 text-xl font-semibold tracking-tight text-foreground">
        {tier.name}
      </h3>
      <p className="mt-1 text-3xl font-bold tracking-tight text-foreground">
        {tier.priceLabel}
      </p>

      <ul className="mt-6 flex-1 space-y-3">
        {tier.features.map((feature) => (
          <li
            key={feature}
            className="flex gap-2.5 text-sm leading-relaxed text-muted-foreground"
          >
            <Check
              className="mt-0.5 size-4 shrink-0 text-primary"
              aria-hidden
            />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <Button
        type="button"
        className={cn("mt-8 w-full", isHighlighted && "shadow-md")}
        variant={isActive ? "outline" : isHighlighted ? "default" : "outline"}
        disabled={isActive || isLoading || checkoutLoading !== null}
        onClick={() => onSelectPlan(tier.id)}
      >
        {isLoading ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Processing...
          </>
        ) : isActive ? (
          "Current plan"
        ) : (
          tier.ctaLabel
        )}
      </Button>
    </article>
  );
}

export function BillingWorkspace() {
  const [billing, setBilling] = useState<UserBillingContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] =
    useState<SubscriptionTierId | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  const loadQuota = useCallback(async () => {
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/billing/quota", { headers });
      const json = (await res.json()) as {
        ok?: boolean;
        data?: UserBillingContext;
        error?: string;
      };

      if (!res.ok || !json.ok || !json.data) {
        throw new Error(json.error ?? "Failed to load billing quota");
      }

      setBilling(json.data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load billing data";
      toast.error(message);
      setBilling(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadQuota();
  }, [loadQuota]);

  async function handleSelectPlan(tierId: SubscriptionTierId) {
    if (!billing || tierId === billing.tier) return;
    setCheckoutLoading(tierId);
    try {
      await new Promise((resolve) => setTimeout(resolve, 400));
      toast.info("Stripe Checkout will be wired for this tier.");
    } finally {
      setCheckoutLoading(null);
    }
  }

  async function handleManagePortal() {
    if (portalLoading) return;
    setPortalLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 400));
      toast.info("Stripe Customer Portal redirect will be wired here.");
    } finally {
      setPortalLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <Loader2
          className="size-8 animate-spin text-primary"
          aria-label="Loading billing workspace"
        />
      </div>
    );
  }

  const activeTierId = billing?.tier ?? "hobbyist";

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <p className="font-mono text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Account workspace
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Pricing & billing
        </h1>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Map your ledger quota to a tier. Stripe checkout and portal hooks land
          on these cards next.
        </p>
        <Link
          href="/profile"
          className="inline-block pt-1 text-xs font-medium text-primary hover:underline"
        >
          Back to profile
        </Link>
      </div>

      {billing ? <QuotaMeter billing={billing} /> : null}

      <section className="space-y-6">
        <div className="max-w-2xl">
          <MonoEyebrow>VelocityHub plans</MonoEyebrow>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            Three tiers. One distribution stack.
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Free Hobbyist gets you mining. Indie Pro unlocks the Megaphone and
            BIP memory. Growth Studio runs omnichannel at full burner velocity.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {BILLING_TIERS.map((tier) => (
            <PricingTierCard
              key={tier.id}
              tier={tier}
              activeTierId={activeTierId}
              onSelectPlan={(id) => void handleSelectPlan(id)}
              checkoutLoading={checkoutLoading}
            />
          ))}
        </div>
      </section>

      <section className="glass-strong rounded-2xl border border-border/60 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <CreditCard className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
            <div>
              <h2 className="font-semibold tracking-tight text-foreground">
                Stripe billing portal
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Update payment method, download invoices, or cancel anytime when
                checkout goes live.
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            className="gap-2 shrink-0"
            disabled={portalLoading}
            onClick={() => void handleManagePortal()}
          >
            {portalLoading ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Opening...
              </>
            ) : (
              <>
                Manage billing
                <ExternalLink className="size-4 shrink-0" aria-hidden />
              </>
            )}
          </Button>
        </div>
      </section>

      <p className="flex items-center gap-2 text-center text-xs text-muted-foreground sm:text-left">
        <Sparkles className="size-3.5 shrink-0 text-primary" aria-hidden />
        Daily drop quota resolves from{" "}
        <code className="rounded bg-muted/40 px-1 py-0.5 font-mono text-[10px]">
          resolveDailyDropQuota(tier)
        </code>{" "}
        — same engine as the Hunter circuit breaker.
      </p>
    </div>
  );
}
