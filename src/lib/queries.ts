import { useCallback, useEffect, useState } from 'react';
import { supabase } from './supabase';
import type { Lake, LakeSpecies, Species, SpeciesLake } from './types';

type State<T> = { data: T | null; loading: boolean; error: string | null };

function useAsync<T>(run: () => Promise<T>, deps: unknown[]): State<T> {
  const [state, setState] = useState<State<T>>({ data: null, loading: true, error: null });
  // The caller owns the dependency list; `run` is re-created each render.
  const stable = useCallback(run, deps);

  useEffect(() => {
    let live = true;
    setState({ data: null, loading: true, error: null });
    stable()
      .then((data) => live && setState({ data, loading: false, error: null }))
      .catch((e: unknown) =>
        live && setState({ data: null, loading: false, error: (e as Error).message }),
      );
    return () => {
      live = false;
    };
  }, [stable]);

  return state;
}

/** Every lake, with a count of how many species each holds. */
export function useLakes() {
  return useAsync(async () => {
    const { data, error } = await supabase
      .from('lakes')
      .select('*, lake_fish(count)')
      .order('name');
    if (error) throw error;

    return (data ?? []).map((row) => {
      const { lake_fish, ...lake } = row as Lake & { lake_fish: { count: number }[] };
      return { ...lake, fishCount: lake_fish?.[0]?.count ?? 0 };
    }) as (Lake & { fishCount: number })[];
  }, []);
}

/** One lake plus every species recorded in it. */
export function useLake(slug: string | undefined) {
  return useAsync(async () => {
    if (!slug) throw new Error('No lake specified.');

    const { data: lake, error: lakeErr } = await supabase
      .from('lakes')
      .select('*')
      .eq('slug', slug)
      .maybeSingle();
    if (lakeErr) throw lakeErr;
    if (!lake) throw new Error('That lake is not in the guide.');

    const { data: rows, error: fishErr } = await supabase
      .from('lake_fish')
      .select('abundance, is_stocked, fish_species(*)')
      .eq('lake_id', (lake as Lake).id);
    if (fishErr) throw fishErr;

    const species = (rows ?? []).map((r) => {
      const row = r as unknown as {
        abundance: string | null;
        is_stocked: boolean;
        fish_species: Species;
      };
      return { ...row.fish_species, abundance: row.abundance, is_stocked: row.is_stocked };
    }) as LakeSpecies[];

    // Abundant first, then alphabetical, so the headline fish lead.
    species.sort(
      (a, b) =>
        Number(b.abundance === 'Abundant') - Number(a.abundance === 'Abundant') ||
        a.common_name.localeCompare(b.common_name),
    );

    return { lake: lake as Lake, species };
  }, [slug]);
}

/** Every species, with a count of how many lakes hold it. */
export function useSpeciesList() {
  return useAsync(async () => {
    const { data, error } = await supabase
      .from('fish_species')
      .select('*, lake_fish(count)')
      .order('common_name');
    if (error) throw error;

    return (data ?? []).map((row) => {
      const { lake_fish, ...species } = row as Species & { lake_fish: { count: number }[] };
      return { ...species, lakeCount: lake_fish?.[0]?.count ?? 0 };
    }) as (Species & { lakeCount: number })[];
  }, []);
}

/** One species plus every lake it lives in. */
export function useSpecies(slug: string | undefined) {
  return useAsync(async () => {
    if (!slug) throw new Error('No species specified.');

    const { data: species, error: spErr } = await supabase
      .from('fish_species')
      .select('*')
      .eq('slug', slug)
      .maybeSingle();
    if (spErr) throw spErr;
    if (!species) throw new Error('That species is not in the guide.');

    const { data: rows, error: lakeErr } = await supabase
      .from('lake_fish')
      .select('abundance, lakes(*)')
      .eq('species_id', (species as Species).id);
    if (lakeErr) throw lakeErr;

    const lakes = (rows ?? []).map((r) => {
      const row = r as unknown as { abundance: string | null; lakes: Lake };
      return { ...row.lakes, abundance: row.abundance };
    }) as SpeciesLake[];

    lakes.sort((a, b) => a.state.localeCompare(b.state) || a.name.localeCompare(b.name));

    return { species: species as Species, lakes };
  }, [slug]);
}
