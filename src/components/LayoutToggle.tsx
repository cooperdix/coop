export type Layout = 'grid' | 'list';

/**
 * Grid / list switch.
 *
 * The icon is one set of four rounded squares that physically rearrange
 * themselves: in grid they sit in a 2×2 block, in list they stretch flat into
 * stacked bars. Each square moves on its own short delay so the change reads as
 * a cascade rather than a cut, and the whole mark flares as it lands.
 *
 * The two animation names are deliberately different. Swapping the attribute
 * between rules that name the same animation would not restart it, so grid and
 * list each get their own, which guarantees the flare replays on every switch.
 */

/** Four squares, 2×2. */
const GRID = [
  [1, 1],
  [11, 1],
  [1, 11],
  [11, 11],
];
/** The same four, flattened into bars. */
const BAR_SCALE_X = 16 / 6;
const BAR_SCALE_Y = 2.2 / 6;

export function LayoutToggle({
  layout,
  onChange,
}: {
  layout: Layout;
  onChange: (next: Layout) => void;
}) {
  return (
    <div className="layout-toggle" data-layout={layout} role="group" aria-label="Layout">
      <svg
        className="layout-icon"
        data-layout={layout}
        viewBox="0 0 18 18"
        width="18"
        height="18"
        aria-hidden="true"
      >
        {GRID.map(([x, y], i) => (
          <rect
            key={i}
            width="6"
            height="6"
            rx="1.6"
            style={{
              transform:
                layout === 'grid'
                  ? `translate(${x}px, ${y}px)`
                  : `translate(1px, ${1 + i * 4.6}px) scale(${BAR_SCALE_X}, ${BAR_SCALE_Y})`,
              transitionDelay: `${i * 55}ms`,
            }}
          />
        ))}
      </svg>

      <button type="button" aria-pressed={layout === 'grid'} onClick={() => onChange('grid')}>
        Grid
      </button>
      <button type="button" aria-pressed={layout === 'list'} onClick={() => onChange('list')}>
        List
      </button>
    </div>
  );
}
