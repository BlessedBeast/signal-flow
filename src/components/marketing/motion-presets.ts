export const SECTION_FADE = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.15 },
  transition: { duration: 0.3, ease: "easeOut" as const },
} as const;

export function staggerDelay(index: number, base = 0): number {
  return base + index * 0.05;
}
