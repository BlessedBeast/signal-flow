import { z } from "zod";

export type LinkPolicyBody = "banned" | "allowed" | "restricted";

/**
 * Structured moderation constraints returned by the rule checker LLM
 * and stored in `platform_rules_cache.constraints_json`.
 */
export interface PlatformConstraints {
  rules: string[];
  formatting_rules: string[];
  ai_smell_flags: string[];
  link_policy: {
    links_in_body: LinkPolicyBody;
  };
}

const linkPolicySchema = z.object({
  links_in_body: z.enum(["banned", "allowed", "restricted"]),
});

const rawPlatformConstraintsSchema = z.object({
  rules: z.array(z.string()).optional().default([]),
  formatting_rules: z.array(z.string()).optional(),
  formattingRules: z.array(z.string()).optional(),
  ai_smell_flags: z.array(z.string()).optional(),
  bannedPhrases: z.array(z.string()).optional(),
  toneGuidelines: z.array(z.string()).optional(),
  link_policy: linkPolicySchema.optional(),
  noSelfPromotion: z.boolean().optional(),
  linksAllowed: z.boolean().optional(),
});

export const platformConstraintsSchema = rawPlatformConstraintsSchema.transform(
  (data): PlatformConstraints => {
    const formatting_rules =
      data.formatting_rules ?? data.formattingRules ?? [];
    const ai_smell_flags =
      data.ai_smell_flags ??
      [...(data.bannedPhrases ?? []), ...(data.toneGuidelines ?? [])];

    let links_in_body: LinkPolicyBody = "allowed";
    if (data.link_policy?.links_in_body) {
      links_in_body = data.link_policy.links_in_body;
    } else if (data.linksAllowed === false || data.noSelfPromotion === true) {
      links_in_body = "banned";
    }

    return {
      rules: data.rules ?? [],
      formatting_rules,
      ai_smell_flags,
      link_policy: { links_in_body },
    };
  }
);

export const emptyPlatformConstraints = (): PlatformConstraints => ({
  rules: [],
  formatting_rules: [],
  ai_smell_flags: [],
  link_policy: { links_in_body: "allowed" },
});

export type PlatformConstraintsRow = {
  platform: string;
  normalized_location: string;
  constraints_json: unknown;
  last_updated_at: string;
};
