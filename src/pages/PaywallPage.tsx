import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { BrandMark } from '../components/Icons';

const PERKS = [
  '273 lakes across all fifty states',
  '69 species with bait, lures, season and best time of day',
  'Search by lake, or by the fish you want to catch',
  'Ramps, shore access, marinas and camping for every lake',
];

export function PaywallPage() {
  const { email, signOut, refresh } = useAuth();
  const [state, setState] = useState<'idle' | 'starting' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function subscribe() {
    setState('starting');
    setMessage('');

    // The edge function talks to Stripe with the secret key and hands back a
    // hosted checkout URL. It returns a clear error until Stripe is configured.
    const { data, error } = await supabase.functions.invoke('create-checkout-session', {
      body: { returnUrl: window.location.origin },
    });

    if (error || !data?.url) {
      setState('error');
      setMessage(
        data?.error ??
          error?.message ??
          'Checkout is not available yet. Stripe still needs to be connected.',
      );
      return;
    }

    window.location.href = data.url as string;
  }

  return (
    <div className="gate">
      <div className="card gate-card">
        <BrandMark size={54} />
        <h1>Subscribe to keep fishing</h1>
        <p className="gate-lede">
          You are signed in as <strong>{email}</strong>, but this account does not have an active
          subscription yet.
        </p>

        <div className="price">
          <span className="price-amount">$5</span>
          <span className="price-period">per month</span>
        </div>

        <ul className="perks">
          {PERKS.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>

        <button className="btn" onClick={subscribe} disabled={state === 'starting'}>
          {state === 'starting' ? 'Opening checkout…' : 'Subscribe for $5/month'}
        </button>

        {state === 'error' && <div className="error gate-error">{message}</div>}

        <div className="gate-actions">
          <button className="btn-ghost" onClick={refresh}>
            I already paid, re-check
          </button>
          <button className="btn-ghost" onClick={signOut}>
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
