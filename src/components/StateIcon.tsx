import { useLayoutEffect, useRef, useState } from 'react';
import { STATE_PATHS } from './usMapPaths';

/** Outline lookup, by both postal code and full name. */
const BY_NAME = new Map(STATE_PATHS.map((s) => [s.name, s.d]));

/**
 * The silhouette of one state, drawn at icon size.
 *
 * The outlines are the same Albers paths the big map uses, which means each one
 * sits wherever it falls on a picture of the whole country — Florida is nowhere
 * near the origin. So the shape measures itself and the viewBox is fitted to
 * what is actually there, which both crops to the state and scales it up to
 * fill the icon.
 */
export function StateIcon({
  name,
  size = 20,
  className,
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  const ref = useRef<SVGPathElement | null>(null);
  const [box, setBox] = useState<string | null>(null);
  const d = BY_NAME.get(name);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    try {
      const b = el.getBBox();
      if (!b.width || !b.height) return;
      // Square the frame so a tall state and a wide one come out the same size
      // on screen rather than one filling the box and the other shrinking.
      const side = Math.max(b.width, b.height) * 1.12;
      setBox(
        `${b.x + b.width / 2 - side / 2} ${b.y + b.height / 2 - side / 2} ${side} ${side}`,
      );
    } catch {
      // Detached or hidden: leave it unfitted rather than throwing.
    }
  }, [d]);

  if (!d) {
    // "All states": the whole country, drawn as a filled dot so the row still
    // has something in the icon column.
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 20 20"
        className={['state-icon', className].filter(Boolean).join(' ')}
        aria-hidden="true"
      >
        <circle cx="10" cy="10" r="7" opacity="0.35" />
        <circle cx="10" cy="10" r="3" />
      </svg>
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox={box ?? '0 0 960 600'}
      preserveAspectRatio="xMidYMid meet"
      className={['state-icon', className].filter(Boolean).join(' ')}
      aria-hidden="true"
    >
      <path ref={ref} d={d} />
    </svg>
  );
}
