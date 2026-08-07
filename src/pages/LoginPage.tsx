import { useState, type FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import { BrandMark } from '../components/Icons';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function submit(e: FormEvent) {
    e.preventDefault();
    setState('sending');

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin },
    });

    if (error) {
      setState('error');
      setMessage(error.message);
    } else {
      setState('sent');
    }
  }

  return (
    <div className="gate">
      <div className="card gate-card">
        <BrandMark size={54} />
        <h1>Little Lake Fishing</h1>
        <p className="gate-lede">
          A field guide to 273 fishing lakes across all fifty states, and the fish you can catch
          in each one.
        </p>

        {state === 'sent' ? (
          <div className="gate-sent">
            <strong>Check your email.</strong>
            <p>
              We sent a sign-in link to <em>{email}</em>. Open it on this device and you will be
              signed straight in. No password needed.
            </p>
            <button className="btn-ghost" onClick={() => setState('idle')}>
              Use a different email
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="gate-form">
            <label className="field gate-field">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                aria-label="Email address"
                autoComplete="email"
              />
            </label>
            <button className="btn" type="submit" disabled={state === 'sending'}>
              {state === 'sending' ? 'Sending…' : 'Email me a sign-in link'}
            </button>
            {state === 'error' && <div className="error gate-error">{message}</div>}
            <p className="gate-fine">
              New here? The same link creates your account. Access is <strong>$5 a month</strong>.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
