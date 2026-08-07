import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

type AuthState = {
  session: Session | null;
  /** True once we know whether the user may read the guide. */
  ready: boolean;
  /** Owner, or an active/trialing subscriber. Authoritative copy lives in Postgres. */
  hasAccess: boolean;
  email: string | null;
  signOut: () => Promise<void>;
  /** Re-check entitlement, e.g. after returning from Stripe checkout. */
  refresh: () => Promise<void>;
};

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [hasAccess, setHasAccess] = useState(false);
  const [ready, setReady] = useState(false);

  /**
   * Entitlement is decided by the database, not here. This RPC is the same
   * predicate the row level security policies use, so the UI can never show
   * more than the data layer would actually hand over.
   */
  const checkAccess = useCallback(async (s: Session | null) => {
    if (!s) {
      setHasAccess(false);
      return;
    }
    const { data, error } = await supabase.rpc('has_access');
    setHasAccess(!error && data === true);
  }, []);

  useEffect(() => {
    let live = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!live) return;
      setSession(data.session);
      await checkAccess(data.session);
      if (live) setReady(true);
    });

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, s) => {
      if (!live) return;
      setSession(s);
      await checkAccess(s);
      if (live) setReady(true);
    });

    return () => {
      live = false;
      sub.subscription.unsubscribe();
    };
  }, [checkAccess]);

  const value = useMemo<AuthState>(
    () => ({
      session,
      ready,
      hasAccess,
      email: session?.user?.email ?? null,
      signOut: async () => {
        await supabase.auth.signOut();
      },
      refresh: async () => {
        const { data } = await supabase.auth.getSession();
        setSession(data.session);
        await checkAccess(data.session);
      },
    }),
    [session, ready, hasAccess, checkAccess],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
