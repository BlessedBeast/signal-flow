export const BIP_POST_TYPES = [
  "milestone",
  "friction",
  "insight",
  "ship",
] as const;

export type BipPostType = (typeof BIP_POST_TYPES)[number];

export type BipLedgerEntry = {
  id: string;
  post_type: BipPostType;
  post_content: string;
  current_focus: string | null;
  created_at: string;
};

export type BipGenerateResult = {
  ok: true;
  postContent: string;
  postType: BipPostType;
  entry: BipLedgerEntry;
};

export type BipLedgerListResult = {
  ok: true;
  posts: BipLedgerEntry[];
};

export const BIP_POST_TYPE_LABELS: Record<BipPostType, string> = {
  milestone: "Milestone",
  friction: "Friction",
  insight: "Insight",
  ship: "Ship",
};
