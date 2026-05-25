import {
  format,
  isToday,
  isYesterday,
  parseISO,
  startOfDay,
} from "date-fns";

import type { Lead, LeadStatus } from "@/lib/signalflow-types";

/** Statuses shown in the chronological stream ledger. */
export const STREAM_LEDGER_STATUSES: LeadStatus[] = [
  "new",
  "drafted",
  "replied",
];

export type LeadLedgerBucketStats = {
  total: number;
  untouched: number;
  ongoingFollowUps: number;
};

export type LeadLedgerBucket = {
  /** Stable sort key: `today`, `yesterday`, or `yyyy-MM-dd`. */
  key: string;
  label: string;
  leads: Lead[];
  stats: LeadLedgerBucketStats;
};

function resolveReleaseInstant(lead: Lead): Date {
  const raw = lead.released_at?.trim() || lead.created_at?.trim();
  if (!raw) return startOfDay(new Date());
  const parsed = parseISO(raw);
  return Number.isNaN(parsed.getTime()) ? startOfDay(new Date()) : parsed;
}

function bucketLabelForDate(date: Date): { key: string; label: string } {
  if (isToday(date)) {
    return { key: "today", label: "Today" };
  }
  if (isYesterday(date)) {
    return { key: "yesterday", label: "Yesterday" };
  }
  return {
    key: format(startOfDay(date), "yyyy-MM-dd"),
    label: format(startOfDay(date), "MMMM d, yyyy"),
  };
}

function bucketSortRank(key: string): number {
  if (key === "today") return 0;
  if (key === "yesterday") return 1;
  return 2;
}

export function isUntouchedLedgerLead(lead: Lead): boolean {
  return lead.status === "new";
}

export function isOngoingFollowUpLead(lead: Lead): boolean {
  if (lead.status === "drafted" || lead.status === "replied") {
    return true;
  }
  return lead.conversation_history.some((turn) => turn.role === "user");
}

export function computeLedgerBucketStats(leads: Lead[]): LeadLedgerBucketStats {
  const untouched = leads.filter(isUntouchedLedgerLead).length;
  const ongoingFollowUps = leads.filter(isOngoingFollowUpLead).length;
  return {
    total: leads.length,
    untouched,
    ongoingFollowUps,
  };
}

export function filterStreamLedgerLeads(leads: Lead[]): Lead[] {
  return leads.filter((lead) => STREAM_LEDGER_STATUSES.includes(lead.status));
}

/** Group stream leads by `released_at` calendar day; hottest intent first per bucket. */
export function groupLeadsByReleaseDay(leads: Lead[]): LeadLedgerBucket[] {
  const streamLeads = filterStreamLedgerLeads(leads);
  const groups = new Map<string, LeadLedgerBucket>();

  for (const lead of streamLeads) {
    const releaseDate = resolveReleaseInstant(lead);
    const { key, label } = bucketLabelForDate(releaseDate);

    const existing = groups.get(key);
    if (existing) {
      existing.leads.push(lead);
    } else {
      groups.set(key, { key, label, leads: [lead], stats: { total: 0, untouched: 0, ongoingFollowUps: 0 } });
    }
  }

  const buckets = [...groups.values()].map((bucket) => {
    const sortedLeads = [...bucket.leads].sort(
      (a, b) => b.intent_score - a.intent_score
    );
    return {
      ...bucket,
      leads: sortedLeads,
      stats: computeLedgerBucketStats(sortedLeads),
    };
  });

  buckets.sort((a, b) => {
    const rank = bucketSortRank(a.key) - bucketSortRank(b.key);
    if (rank !== 0) return rank;
    if (a.key === "today" || a.key === "yesterday") return 0;
    return b.key.localeCompare(a.key);
  });

  return buckets;
}
