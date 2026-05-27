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

import { parseSubscriptionTier } from "@/lib/billing/tiers";
import { DAILY_LIMIT } from "@/lib/discovery/constants";
import { safeParseProductDna } from "@/lib/product-dna-schema";
import { createBrowserSupabase } from "@/lib/supabase-browser";
import type {
  CompetitorBattlecards,
  Lead,
  ProductDNA,
  Profile,
} from "@/lib/signalflow-types";
import { initialDNA } from "@/lib/signalflow-types";

export type {
  ConversationTurn,
  CompetitorBattlecards,
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
  competitor_battlecards: {},
  subscription_tier: "hobbyist",
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

type ProfileRowPayload = {
  is_mining?: boolean;
  product_dna?: unknown;
  competitor_battlecards?: unknown;
};

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
      competitor_battlecards: battlecards,
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
  dailyLimit: DAILY_LIMIT,
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

      setLeadsState(body.leads);
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
        .select("is_mining, product_dna, competitor_battlecards, subscription_tier")
        .eq("id", session.user.id)
        .maybeSingle();

      if (error) {
        console.error("[store] refreshProfile:", error.message);
        return false;
      }

      const productDna = parseProductDnaFromDb(data?.product_dna);
      const nextProfile: Profile = {
        is_mining: Boolean(data?.is_mining),
        product_dna: productDna,
        competitor_battlecards: parseBattlecardsFromDb(
          data?.competitor_battlecards
        ),
        subscription_tier: parseSubscriptionTier(data?.subscription_tier),
      };

      setProfileState(nextProfile);
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
            const row = (payload.new ?? payload.old) as ProfileRowPayload;
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
