/** Small inline icons, stroke-based so they inherit the surrounding colour. */

type P = { size?: number; className?: string };

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
});

export const SearchIcon = ({ size = 16, className }: P) => (
  <svg {...base(size)} className={className} aria-hidden="true">
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
);

export const PinIcon = ({ size = 16, className }: P) => (
  <svg {...base(size)} className={className} aria-hidden="true">
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

export const ChevronRight = ({ size = 16, className }: P) => (
  <svg {...base(size)} className={className} aria-hidden="true">
    <path d="m9 18 6-6-6-6" />
  </svg>
);

export const ChevronLeft = ({ size = 16, className }: P) => (
  <svg {...base(size)} className={className} aria-hidden="true">
    <path d="m15 18-6-6 6-6" />
  </svg>
);

export const FilterIcon = ({ size = 16, className }: P) => (
  <svg {...base(size)} className={className} aria-hidden="true">
    <path d="M4 5h16l-6 7v6l-4 2v-8Z" />
  </svg>
);

/** The masthead mark: a simple hooked fish. */
export const BrandMark = ({ size = 34, className }: P) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    className={className}
    aria-hidden="true"
    fill="none"
  >
    <circle cx="24" cy="24" r="22" fill="rgba(255,255,255,0.10)" />
    <path
      d="M8 25c4-6 11-9 18-9 6 0 11 2 14 5l4 1-4 1c-3 3-8 5-14 5-7 0-14-3-18-3Z"
      fill="#dcecf8"
    />
    <path d="M40 22l6-5-1 5 1 5Z" fill="#dcecf8" opacity="0.8" />
    <path d="M22 16l2-5 4 4 3-4 3 5Z" fill="#dcecf8" opacity="0.75" />
    <circle cx="15" cy="23" r="1.9" fill="#0d3050" />
  </svg>
);
