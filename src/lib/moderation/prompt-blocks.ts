import type { PlatformConstraints } from "@/lib/moderation/types";

export const STRICT_CRITICAL_VOICE_RULES = `STRICT CRITICAL VOICE RULES:
- Banned Words: delve, unlock, seamless, synergy, landscape, fast-paced, tapestry, navigate, elevate, realm, testament.
- Asymmetric Pacing: Use short, punchy sentence breaks. Never allow three consecutive sentences to share a uniform length or cadence.
- Progressive Information: Every single line must introduce a new metric, scar, or insight. Never make a claim and immediately explain it in the next sentence. Avoid conversational filler (e.g., 'furthermore', 'moreover').`;

export const PROACTIVE_SYNTAX_RULES = `PROACTIVE POST SYNTAX (mandatory):
- No emojis. No boilerplate introductions ("Hey everyone", "Excited to share").
- No repeating explanation loops: state each insight once, then move forward.
- Weave persona_context metrics into the framework structure blocks; do not dump persona as a generic bio paragraph.
- ${STRICT_CRITICAL_VOICE_RULES}`;

export function buildPlatformComplianceGuardrailsBlock(
  constraints: PlatformConstraints
): string {
  const linkPolicyLine =
    constraints.link_policy.links_in_body === "banned"
      ? "NEVER place a link in the body copy. Instruct the user via media directives to place the link in their bio or first comment."
      : constraints.link_policy.links_in_body === "restricted"
        ? "Minimize links in body copy. Prefer bio or first-comment placement via media directives."
        : "Follow standard link policy.";

  const communityRules =
    constraints.rules.length > 0
      ? `\n- Community Rules: ${JSON.stringify(constraints.rules)}`
      : "";

  return `PLATFORM COMPLIANCE GUARDRAILS:
- Formatting Rules to obey: ${JSON.stringify(constraints.formatting_rules)}
- AI Signatures to completely avoid: ${JSON.stringify(constraints.ai_smell_flags)}
- Link Policy: ${linkPolicyLine}${communityRules}

${STRICT_CRITICAL_VOICE_RULES}`;
}
