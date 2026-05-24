export type BipOptionType = "data-drop" | "raw-build" | "competitor-flank";

export type BipPostOption = {
  type: BipOptionType;
  label: string;
  text: string;
};

export type BipGenerateResult = {
  ok: true;
  options: BipPostOption[];
  meta: {
    activeLeadCount: number;
    generatedAt: string;
  };
};
