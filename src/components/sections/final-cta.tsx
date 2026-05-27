"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

import FadeUp from "@/components/ui/fade-up";
import { Button } from "@/components/ui/button";

type FinalCtaProps = {
  hasSession: boolean;
};

export function FinalCTA({ hasSession }: FinalCtaProps) {
  const href = hasSession ? "/stream/dashboard" : "/signup";

  return (
    <section className="px-6 py-20 pb-32">
      <FadeUp className="mx-auto max-w-2xl text-center">
        <div className="rounded-3xl border border-white/[0.08] bg-white/[0.02] p-10 backdrop-blur-md sm:p-16">
          <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            {"// READY TO AUTOMATE DISTRIBUTION"}
          </p>
          <h2 className="mt-4 text-4xl font-extrabold tracking-tight text-foreground">
            Your product deserves to be{" "}
            <span className="text-primary">found.</span>
          </h2>
          <p className="mt-3 text-sm text-muted-foreground">
            Free tier. No credit card. The full engine running from day one.
          </p>
          <motion.div
            className="mt-8 inline-block"
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.2 }}
          >
            <Button asChild size="lg" className="gap-2">
              <Link href={href}>
                Enter Workspace →
                <ArrowRight className="size-4 shrink-0" aria-hidden />
              </Link>
            </Button>
          </motion.div>
          <p className="mt-4 font-mono text-xs text-muted-foreground">
            Free tier includes 50 leads/mo · No card required · Cancel anytime.
          </p>
        </div>
      </FadeUp>
    </section>
  );
}
