import { useEffect, useState } from 'react';
import { BrandMark } from './Icons';

/**
 * The opening titles.
 *
 * A splash screen that stands between someone and what they came for is a tax,
 * so this one is deliberately cheap to pay: it runs once per browser session,
 * it can be dismissed by clicking or by pressing a key, it never blocks the
 * page underneath from having already loaded, and anyone who has asked for
 * reduced motion skips it entirely.
 */

const SEEN_KEY = 'llf.splash';
const HOLD_MS = 2200;
const FADE_MS = 900;

export function SplashScreen() {
  const [phase, setPhase] = useState<'idle' | 'showing' | 'leaving' | 'gone'>('idle');

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setPhase('gone');
      return;
    }
    try {
      if (sessionStorage.getItem(SEEN_KEY)) {
        setPhase('gone');
        return;
      }
      sessionStorage.setItem(SEEN_KEY, '1');
    } catch {
      // Blocked storage just means the titles play again next time.
    }
    setPhase('showing');
  }, []);

  useEffect(() => {
    if (phase !== 'showing') return;
    const leave = () => setPhase('leaving');
    const t = window.setTimeout(leave, HOLD_MS);
    window.addEventListener('keydown', leave);
    window.addEventListener('pointerdown', leave);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('keydown', leave);
      window.removeEventListener('pointerdown', leave);
    };
  }, [phase]);

  useEffect(() => {
    if (phase !== 'leaving') return;
    const t = window.setTimeout(() => setPhase('gone'), FADE_MS);
    return () => window.clearTimeout(t);
  }, [phase]);

  if (phase === 'idle' || phase === 'gone') return null;

  return (
    <div className="splash" data-leaving={phase === 'leaving'} aria-hidden="true">
      <div className="splash-inner">
        <BrandMark className="splash-mark" size={92} />
        <div className="splash-title">Little Lake Fishing</div>
        <div className="splash-sub">Every water. Every fish. All fifty states.</div>
      </div>
      <div className="splash-hint">Click anywhere to skip</div>
    </div>
  );
}
