import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { StateIcon } from './StateIcon';
import { ChevronDown, CheckIcon } from './Icons';

export type StateOption = { code: string; name: string; count?: number };

/**
 * A state picker that shows each state's own outline beside its name.
 *
 * A native `<select>` cannot draw anything inside an option, so this is the
 * listbox pattern built by hand. That means the keyboard behaviour people
 * expect from a select has to be built too, and is: arrows and Home/End move
 * the active option, Enter or Space commits it, Escape closes without
 * changing anything and returns focus to the button, typing jumps to the next
 * option starting with those letters, and the active option is always scrolled
 * into view.
 */
export function StateSelect({
  value,
  options,
  onChange,
  label = 'Filter by state',
  allLabel = 'All states',
}: {
  value: string;
  options: StateOption[];
  onChange: (code: string) => void;
  label?: string;
  allLabel?: string;
}) {
  const all: StateOption = { code: 'all', name: allLabel };
  const items = [all, ...options];

  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);
  const typed = useRef({ buffer: '', at: 0 });

  const selectedIndex = Math.max(
    0,
    items.findIndex((o) => o.code === value),
  );
  const selected = items[selectedIndex];

  // Opening starts from whatever is currently selected, not from the top.
  useEffect(() => {
    if (open) setActive(selectedIndex);
  }, [open, selectedIndex]);

  useLayoutEffect(() => {
    if (!open) return;
    const el = listRef.current?.children[active] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  }, [open, active]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('pointerdown', onDown);
    return () => window.removeEventListener('pointerdown', onDown);
  }, [open]);

  const commit = (i: number) => {
    onChange(items[i].code);
    setOpen(false);
    buttonRef.current?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        setOpen(false);
        buttonRef.current?.focus();
        return;
      case 'ArrowDown':
        e.preventDefault();
        setActive((i) => Math.min(items.length - 1, i + 1));
        return;
      case 'ArrowUp':
        e.preventDefault();
        setActive((i) => Math.max(0, i - 1));
        return;
      case 'Home':
        e.preventDefault();
        setActive(0);
        return;
      case 'End':
        e.preventDefault();
        setActive(items.length - 1);
        return;
      case 'Enter':
      case ' ':
        e.preventDefault();
        commit(active);
        return;
      case 'Tab':
        setOpen(false);
        return;
    }

    // Type-ahead. Letters typed in quick succession search as one string, so
    // "mi" reaches Michigan rather than stopping at Maine.
    if (e.key.length === 1 && /\S/.test(e.key)) {
      const now = Date.now();
      const t = typed.current;
      t.buffer = now - t.at > 900 ? e.key : t.buffer + e.key;
      t.at = now;
      const q = t.buffer.toLowerCase();
      const from = items.findIndex((o, i) => i > active && o.name.toLowerCase().startsWith(q));
      const found = from >= 0 ? from : items.findIndex((o) => o.name.toLowerCase().startsWith(q));
      if (found >= 0) setActive(found);
    }
  };

  return (
    <div className="state-select" ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        className="field state-select-button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={onKeyDown}
      >
        <StateIcon name={selected.name} size={18} />
        <span className="state-select-value">{selected.name}</span>
        <ChevronDown className="state-select-chevron" data-open={open} />
      </button>

      {open && (
        // Focus stays on the button while the menu is open, so the button's
        // key handler drives the list and no focus juggling is needed.
        <ul
          ref={listRef}
          className="state-menu"
          role="listbox"
          aria-label={label}
          aria-activedescendant={`state-opt-${items[active]?.code}`}
        >
          {items.map((o, i) => (
            <li
              key={o.code}
              id={`state-opt-${o.code}`}
              role="option"
              aria-selected={o.code === value}
              data-active={i === active}
              className="state-option"
              onPointerEnter={() => setActive(i)}
              onClick={() => commit(i)}
            >
              <StateIcon name={o.name} size={22} />
              <span className="state-option-name">{o.name}</span>
              {o.count != null && <span className="state-option-count">{o.count}</span>}
              {o.code === value && <CheckIcon className="state-option-check" />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
