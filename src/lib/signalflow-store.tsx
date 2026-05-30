"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";

import { parseSubscriptionTier, resolveDailyDropQuota } from "@/lib/billing/tiers";
import { safeParseProductDna } from "@/lib/product-dna-schema";
import { createBrowserSupabase } from "@/lib/supabase-browser";
import { parseFrameworkStepTracking } from "@/lib/frameworks/framework-step-tracking";
import { parseMediaDirectives } from "@/lib/parse-media-directives";
import type {
  CompetitorBattlecards,
  Lead,
  ProductDNA,
  Profile,
} from "@/lib/signalflow-types";
import { initialDNA } from "@/lib/signalflow-types";
import type {
  ProfileRow,
  ProfileStoreSelectRow,
} from "@/types/database.types";

export type {
  ConversationTurn,
  CompetitorBattlecards,
  DiscoveryLead,
  IntentTier,
  Lead,
  LeadStatus,
  Platform,
  ProductDNA,
  Profile,
} from "@/lib/signalflow-types";
export { getIntentTier, initialDNA, DEFAULT_SERPER_QUERIES } from "@/lib/signalflow-types";

type LeadBankStats = {
  queuedCount: number;
  activeCount: number;
  dailyLimit: number;
};

type SignalFlowContextValue = {
  leads: Lead[];
  dna: ProductDNA;
  profile: Profile;
  leadBank: LeadBankStats;
  leadsLoading: boolean;
  profileLoading: boolean;
  addLead: (lead: Omit<Lead, "id"> & { id?: string }) => void;
  updateLead: (id: string, patch: Partial<Lead>) => void;
  setLeads: (leads: Lead[]) => void;
  setDna: (dna: ProductDNA) => void;
  setProfile: (patch: Partial<Profile>) => void;
  refreshLeads: () => Promise<boolean>;
  refreshProfile: () => Promise<boolean>;
  persistProductDna: (
    dna: ProductDNA,
    options?: { battlecards?: CompetitorBattlecards }
  ) => Promise<boolean>;
};

const SignalFlowContext = createContext<SignalFlowContextValue | null>(null);

const EMPTY_PROFILE: Profile = {
  is_mining: false,
  product_dna: null,
  persona_context: null,
  competitor_battlecards: {},
  subscription_tier: "free",
  current_streak: 0,
  longest_streak: 0,
  last_action_at: null,
  framework_step_tracking: {},
};

function parseProductDnaFromDb(raw: unknown): ProductDNA | null {
  return safeParseProductDna(raw);
}

function parseBattlecardsFromDb(raw: unknown): CompetitorBattlecards {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {};
  }
  const out: CompetitorBattlecards = {};
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === "string") {
      out[key] = value;
    }
  }
  return out;
}

type ProfileRowPayload = Partial<ProfileStoreSelectRow>;

function normalizeLeadsFromApi(leads: Lead[]): Lead[] {
  return leads.map((lead) => ({
    ...lead,
    media_directives: parseMediaDirectives(lead.media_directives),
  }));
}

function profileRowToState(
  row: ProfileStoreSelectRow | null | undefined
): Profile {
  const productDna = parseProductDnaFromDb(row?.product_dna);

  return {
    is_mining: Boolean(row?.is_mining),
    product_dna: productDna,
    persona_context:
      row?.persona_context &&
      typeof row.persona_context === "object" &&
      !Array.isArray(row.persona_context)
        ? (row.persona_context as Record<string, unknown>)
        : null,
    competitor_battlecards: parseBattlecardsFromDb(row?.competitor_battlecards),
    subscription_tier: parseSubscriptionTier(row?.subscription_tier),
    current_streak: Number(row?.current_streak ?? 0),
    longest_streak: Number(row?.longest_streak ?? 0),
    last_action_at:
      typeof row?.last_action_at === "string" ? row.last_action_at : null,
    framework_step_tracking: parseFrameworkStepTracking(
      row?.framework_step_tracking
    ),
  };
}

function applyProfileRow(
  row: ProfileRowPayload,
  setProfileState: Dispatch<SetStateAction<Profile>>,
  setDnaState: Dispatch<SetStateAction<ProductDNA>>
) {
  setProfileState((prev) => {
    const productDna =
      row.product_dna !== undefined
        ? parseProductDnaFromDb(row.product_dna)
        : prev.product_dna;
    const battlecards =
      row.competitor_battlecards !== undefined
        ? parseBattlecardsFromDb(row.competitor_battlecards)
        : prev.competitor_battlecards;

    const next: Profile = {
      ...prev,
      is_mining:
        row.is_mining !== undefined
          ? Boolean(row.is_mining)
          : prev.is_mining,
      product_dna: productDna ?? prev.product_dna,
      persona_context:
        row.persona_context !== undefined &&
        row.persona_context &&
        typeof row.persona_context === "object" &&
        !Array.isArray(row.persona_context)
          ? (row.persona_context as Record<string, unknown>)
          : prev.persona_context,
      competitor_battlecards: battlecards,
      subscription_tier:
        row.subscription_tier !== undefined
          ? parseSubscriptionTier(row.subscription_tier)
          : prev.subscription_tier,
      current_streak:
        row.current_streak !== undefined && row.current_streak !== null
          ? Number(row.current_streak)
          : prev.current_streak,
      longest_streak:
        row.longest_streak !== undefined && row.longest_streak !== null
          ? Number(row.longest_streak)
          : prev.longest_streak,
      last_action_at:
        row.last_action_at !== undefined
          ? row.last_action_at
          : prev.last_action_at,
      framework_step_tracking:
        row.framework_step_tracking !== undefined
          ? parseFrameworkStepTracking(row.framework_step_tracking)
          : prev.framework_step_tracking,
    };

    if (productDna) {
      setDnaState(productDna);
    }

    return next;
  });
}

const EMPTY_LEAD_BANK: LeadBankStats = {
  queuedCount: 0,
  activeCount: 0,
  dailyLimit: resolveDailyDropQuota("free"),
};

export function SignalFlowProvider({ children }: { children: ReactNode }) {
  const [leads, setLeadsState] = useState<Lead[]>([]);
  const [leadBank, setLeadBankState] = useState<LeadBankStats>(EMPTY_LEAD_BANK);
  const [dna, setDnaState] = useState<ProductDNA>(initialDNA);
  const [profile, setProfileState] = useState<Profile>(EMPTY_PROFILE);
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const userIdRef = useRef<string | null>(null);

  const setLeads = useCallback((next: Lead[]) => {
    setLeadsState(next);
  }, []);

  const setDna = useCallback((next: ProductDNA) => {
    setDnaState(next);
    setProfileState((prev) => ({ ...prev, product_dna: next }));
  }, []);

  const setProfile = useCallback((patch: Partial<Profile>) => {
    setProfileState((prev) => {
      const merged = { ...prev, ...patch };
      if (patch.product_dna) {
        setDnaState(patch.product_dna);
      }
      return merged;
    });
  }, []);

  const addLead = useCallback((lead: Omit<Lead, "id"> & { id?: string }) => {
    const id = lead.id ?? `lead-${crypto.randomUUID()}`;
    setLeadsState((prev) => [{ ...lead, id }, ...prev]);
  }, []);

  const updateLead = useCallback((id: string, patch: Partial<Lead>) => {
    setLeadsState((prev) =>
      prev.map((lead) => (lead.id === id ? { ...lead, ...patch } : lead))
    );
  }, []);

  const refreshLeads = useCallback(async (): Promise<boolean> => {
    const supabase = createBrowserSupabase();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      return false;
    }

    setLeadsLoading(true);
    try {
      const res = await fetch("/api/leads", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
      });

      const body = (await res.json()) as {
        ok?: boolean;
        leads?: Lead[];
        bank?: LeadBankStats;
        error?: string;
      };

      if (!res.ok || !body.ok || !body.leads || !body.bank) {
        console.error(
          "[store] refreshLeads:",
          body.error ?? res.statusText
        );
        return false;
      }

      setLeadsState(normalizeLeadsFromApi(body.leads));
      setLeadBankState(body.bank);
      return true;
    } catch (err) {
      console.error("[store] refreshLeads:", err);
      return false;
    } finally {
      setLeadsLoading(false);
    }
  }, []);

  const refreshProfile = useCallback(async (): Promise<boolean> => {
    setProfileLoading(true);
    try {
      const supabase = createBrowserSupabase();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setProfileState(EMPTY_PROFILE);
        setDnaState(initialDNA);
        userIdRef.current = null;
        return false;
      }

      userIdRef.current = session.user.id;

      const { data, error } = await supabase
        .from("profiles")
        .select(
          "is_mining, product_dna, persona_context, competitor_battlecards, subscription_tier, current_streak, longest_streak, last_action_at, framework_step_tracking"
        )
        .eq("id", session.user.id)
        .maybeSingle();

      if (error) {
        console.error("[store] refreshProfile:", error.message);
        return false;
      }

      const row = data as ProfileStoreSelectRow | null;
      const nextProfile = profileRowToState(row);

      setProfileState(nextProfile);
      const productDna = nextProfile.product_dna;
      if (productDna) {
        setDnaState(productDna);
      }
      return true;
    } catch (err) {
      console.error("[store] refreshProfile:", err);
      return false;
    } finally {
      setProfileLoading(false);
    }
  }, []);

  const persistProductDna = useCallback(
    async (
      next: ProductDNA,
      options?: { battlecards?: CompetitorBattlecards }
    ): Promise<boolean> => {
      try {
        const supabase = createBrowserSupabase();
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) return false;

        const patch: Record<string, unknown> = {
          product_dna: next,
          website_url: next.url,
        };

        if (options?.battlecards !== undefined) {
          patch.competitor_battlecards = options.battlecards;
        }

        const { error } = await supabase
          .from("profiles")
          .update(patch)
          .eq("id", session.user.id);

        if (error) {
          console.error("[store] persistProductDna:", error.message);
          return false;
        }

        setDnaState(next);
        setProfileState((prev) => ({
          ...prev,
          product_dna: next,
          ...(options?.battlecards !== undefined
            ? { competitor_battlecards: options.battlecards }
            : {}),
        }));
        return true;
      } catch (err) {
        console.error("[store] persistProductDna:", err);
        return false;
      }
    },
    []
  );

  useEffect(() => {
    const supabase = createBrowserSupabase();
    let profileChannel: ReturnType<typeof supabase.channel> | null = null;

    const teardownRealtime = () => {
      if (profileChannel) {
        void supabase.removeChannel(profileChannel);
        profileChannel = null;
      }
    };

    const subscribeToProfile = (userId: string) => {
      teardownRealtime();

      profileChannel = supabase
        .channel(`profiles:${userId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "profiles",
            filter: `id=eq.${userId}`,
          },
          (payload) => {
            const row = (payload.new ?? payload.old) as Partial<ProfileRow>;
            if (!row || payload.eventType === "DELETE") return;
            applyProfileRow(row, setProfileState, setDnaState);
          }
        )
        .subscribe();
    };

    const syncFromSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        userIdRef.current = null;
        teardownRealtime();
        setLeadsState([]);
        setLeadBankState(EMPTY_LEAD_BANK);
        setProfileState(EMPTY_PROFILE);
        setDnaState(initialDNA);
        return;
      }

      userIdRef.current = session.user.id;
      subscribeToProfile(session.user.id);
      await Promise.all([refreshProfile(), refreshLeads()]);
    };

    void syncFromSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        userIdRef.current = session.user.id;
        subscribeToProfile(session.user.id);
        void refreshProfile();
        void refreshLeads();
      } else {
        userIdRef.current = null;
        teardownRealtime();
        setLeadsState([]);
        setLeadBankState(EMPTY_LEAD_BANK);
        setProfileState(EMPTY_PROFILE);
        setDnaState(initialDNA);
      }
    });

    return () => {
      subscription.unsubscribe();
      teardownRealtime();
    };
  }, [refreshLeads, refreshProfile]);

  const value = useMemo(
    () => ({
      leads,
      dna,
      profile,
      leadBank,
      leadsLoading,
      profileLoading,
      addLead,
      updateLead,
      setLeads,
      setDna,
      setProfile,
      refreshLeads,
      refreshProfile,
      persistProductDna,
    }),
    [
      leads,
      dna,
      profile,
      leadBank,
      leadsLoading,
      profileLoading,
      addLead,
      updateLead,
      setLeads,
      setDna,
      setProfile,
      refreshLeads,
      refreshProfile,
      persistProductDna,
    ]
  );

  return (
    <SignalFlowContext.Provider value={value}>
      {children}
    </SignalFlowContext.Provider>
  );
}

export function useSignalFlow() {
  const ctx = useContext(SignalFlowContext);
  if (!ctx) {
    throw new Error("useSignalFlow must be used within SignalFlowProvider");
  }
  return ctx;
}
