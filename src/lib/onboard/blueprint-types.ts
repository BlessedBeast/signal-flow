export const USER_BLUEPRINTS_TABLE = "user_blueprints" as const;

export type UserBlueprint = {
  id: string;
  user_id: string;
  chosen_frameworks: string[];
  macro_rationale: string;
  target_audience_summary: string;
  created_at: string;
  updated_at: string;
};

export type MasterBlueprintGeneration = {
  chosen_frameworks: string[];
  macro_rationale: string;
  target_audience_summary: string;
};

export type CoreFrameworkRow = {
  slug: string;
  name: string;
  title: string;
  description: string;
  primary_channels: string[];
};
