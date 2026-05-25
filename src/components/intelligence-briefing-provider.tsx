"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";

import { IntelligenceBriefing } from "@/components/ui/intelligence-briefing";
import {
  intelligenceModuleKeyFromPath,
  type IntelligenceModuleKey,
} from "@/lib/intelligence-briefing";

type IntelligenceBriefingContextValue = {
  open: boolean;
  moduleKey: IntelligenceModuleKey;
  openBriefing: (key?: IntelligenceModuleKey) => void;
  closeBriefing: () => void;
  setOpen: (open: boolean) => void;
};

const IntelligenceBriefingContext =
  createContext<IntelligenceBriefingContextValue | null>(null);

export function IntelligenceBriefingProvider({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const routeModuleKey = intelligenceModuleKeyFromPath(pathname);

  const [open, setOpen] = useState(false);
  const [moduleKey, setModuleKey] =
    useState<IntelligenceModuleKey>(routeModuleKey);

  useEffect(() => {
    setModuleKey(routeModuleKey);
  }, [routeModuleKey]);

  const openBriefing = useCallback(
    (key?: IntelligenceModuleKey) => {
      setModuleKey(key ?? intelligenceModuleKeyFromPath(pathname));
      setOpen(true);
    },
    [pathname]
  );

  const closeBriefing = useCallback(() => {
    setOpen(false);
  }, []);

  const value = useMemo(
    () => ({
      open,
      moduleKey,
      openBriefing,
      closeBriefing,
      setOpen,
    }),
    [open, moduleKey, openBriefing, closeBriefing]
  );

  return (
    <IntelligenceBriefingContext.Provider value={value}>
      {children}
      <IntelligenceBriefing
        moduleKey={moduleKey}
        open={open}
        onOpenChange={setOpen}
      />
    </IntelligenceBriefingContext.Provider>
  );
}

export function useIntelligenceBriefing() {
  const ctx = useContext(IntelligenceBriefingContext);
  if (!ctx) {
    throw new Error(
      "useIntelligenceBriefing must be used within IntelligenceBriefingProvider"
    );
  }
  return ctx;
}
