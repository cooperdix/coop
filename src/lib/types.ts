export type Lake = {
  id: number;
  slug: string;
  name: string;
  state: string;
  state_code: string;
  /** Lake, River, Tailwater, Bay, Sound, Estuary, Reservoir, Creek, Lagoon, Pond… */
  water_type: string;
  county: string | null;
  latitude: number;
  longitude: number;
  surface_acres: number | null;
  max_depth_ft: number | null;
  elevation_ft: number | null;
  description: string | null;
  access_notes: string | null;
  boat_ramps: string | null;
  shore_access: string | null;
  marinas: string | null;
  camping: string | null;
  facilities: string[];
};

export type Species = {
  id: number;
  slug: string;
  common_name: string;
  scientific_name: string | null;
  family: string | null;
  category: string | null;
  description: string | null;
  identification: string | null;
  bait_and_lures: string | null;
  best_season: string | null;
  best_time: string | null;
  typical_size: string | null;
  record_size: string | null;
  illustration: string | null;
};

/** A species as it appears on a lake page, carrying the join-row detail. */
export type LakeSpecies = Species & {
  abundance: string | null;
  is_stocked: boolean;
};

/** A lake as it appears on a species page. */
export type SpeciesLake = Lake & {
  abundance: string | null;
};
