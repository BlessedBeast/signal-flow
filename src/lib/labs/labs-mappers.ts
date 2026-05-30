type GeoSeedInsertRow = {
  user_id: string;
  keyword_anchor: string;
  distribution_target: string;
  seed_narrative: string;
  json_ld_schema: string;
};

type GeoSeedLike = {
  keywordAnchor: string;
  distributionTarget: string;
  seedNarrative: string;
  jsonLdSchema: string;
};

type GeoSeedAnchorRow = {
  keyword_anchor: unknown;
};

export function mapGeoSeedToInsertRow(
  userId: string,
  seed: GeoSeedLike
): GeoSeedInsertRow {
  return {
    user_id: userId,
    keyword_anchor: seed.keywordAnchor,
    distribution_target: seed.distributionTarget,
    seed_narrative: seed.seedNarrative,
    json_ld_schema: seed.jsonLdSchema,
  };
}

export function mapGeoSeedsToInsertRows(
  userId: string,
  seeds: GeoSeedLike[]
): GeoSeedInsertRow[] {
  return seeds.map((seed) => mapGeoSeedToInsertRow(userId, seed));
}

export function mapGeoAnchorRowsToPreviousAnchors(
  rows: GeoSeedAnchorRow[] | null | undefined
): string[] {
  return (rows ?? [])
    .map((row) => row.keyword_anchor)
    .filter(
      (anchor): anchor is string =>
        typeof anchor === "string" && anchor.trim().length > 0
    );
}

type PreviousSideCarTool = {
  toolName: string;
  conceptPitch: string;
};

type SideCarMemoryRow = {
  tool_name: unknown;
  concept_pitch: unknown;
};

type SideCarBlueprintLike = {
  toolName: string;
  conceptPitch: string;
  lovableMasterPrompt: string;
  seoKeywordsAndCaptureStrategy: string;
};

type SideCarInsertRow = {
  user_id: string;
  tool_name: string;
  concept_pitch: string;
  export_html_code: string;
};

function serializeBlueprintPayload(blueprint: SideCarBlueprintLike): string {
  return JSON.stringify({
    lovableMasterPrompt: blueprint.lovableMasterPrompt,
    seoKeywordsAndCaptureStrategy: blueprint.seoKeywordsAndCaptureStrategy,
  });
}

export function mapSideCarRowsToPreviousTools(
  rows: SideCarMemoryRow[] | null | undefined
): PreviousSideCarTool[] {
  return (rows ?? [])
    .map((row) => ({
      toolName: typeof row.tool_name === "string" ? row.tool_name.trim() : "",
      conceptPitch:
        typeof row.concept_pitch === "string" ? row.concept_pitch.trim() : "",
    }))
    .filter((tool) => tool.toolName.length > 0);
}

export function mapSideCarBlueprintToInsertRow(
  userId: string,
  blueprint: SideCarBlueprintLike
): SideCarInsertRow {
  return {
    user_id: userId,
    tool_name: blueprint.toolName,
    concept_pitch: blueprint.conceptPitch,
    export_html_code: serializeBlueprintPayload(blueprint),
  };
}
