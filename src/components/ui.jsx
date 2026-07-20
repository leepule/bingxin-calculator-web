import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export function SectionTitle({ eyebrow, title, description }) {
  return (
    <div className="mb-5">
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="mt-1 text-xl font-semibold tracking-tight text-white">{title}</h2>
      {description && <p className="mt-2 text-sm leading-6 text-stone-500">{description}</p>}
    </div>
  );
}

export function Metric({ label, value, detail }) {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-black/10 p-4">
      <p className="metric-label">{label}</p>
      <p className="metric-value">{value}</p>
      {detail && <p className="mt-1 text-xs text-stone-600">{detail}</p>}
    </div>
  );
}

export function Dropdown({ value, options, onChange, disabled = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef(null);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const [menuPosition, setMenuPosition] = useState(null);
  const selectedOption = options.find((option) => String(option.value ?? option) === String(value));
  const selectedLabel = selectedOption?.label ?? selectedOption ?? value;
  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return options;
    return options.filter((option) => String(option.label ?? option).toLowerCase().includes(normalizedQuery));
  }, [options, query]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const closeOnOutsideClick = (event) => {
      if (!containerRef.current?.contains(event.target) && !menuRef.current?.contains(event.target)) setIsOpen(false);
    };
    const updateMenuPosition = () => {
      const buttonRect = buttonRef.current?.getBoundingClientRect();
      if (!buttonRect) return;
      const menuHeight = 320;
      const opensUpward = buttonRect.bottom + menuHeight > window.innerHeight && buttonRect.top > menuHeight;
      setMenuPosition({
        left: buttonRect.left,
        width: buttonRect.width,
        top: opensUpward ? undefined : buttonRect.bottom + 8,
        bottom: opensUpward ? window.innerHeight - buttonRect.top + 8 : undefined,
      });
    };
    document.addEventListener('pointerdown', closeOnOutsideClick);
    window.addEventListener('resize', updateMenuPosition);
    window.addEventListener('scroll', updateMenuPosition, true);
    updateMenuPosition();
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      window.removeEventListener('resize', updateMenuPosition);
      window.removeEventListener('scroll', updateMenuPosition, true);
    };
  }, [isOpen]);

  function toggleDropdown() {
    setQuery('');
    if (!isOpen) {
      const buttonRect = buttonRef.current?.getBoundingClientRect();
      if (buttonRect) setMenuPosition({ left: buttonRect.left, width: buttonRect.width, top: buttonRect.bottom + 8 });
    }
    setIsOpen((currentState) => !currentState);
  }

  function chooseOption(optionValue) {
    onChange({ target: { value: String(optionValue) } });
    setIsOpen(false);
  }

  return (
    <div className="relative" ref={containerRef} onKeyDown={(event) => event.key === 'Escape' && setIsOpen(false)}>
      <button ref={buttonRef} type="button" disabled={disabled} className="flex w-full items-center justify-between gap-3 rounded-lg border border-white/[0.06] bg-black/15 px-3 py-2.5 text-left text-xs text-stone-300 transition hover:border-white/15 hover:bg-white/[0.03] disabled:cursor-not-allowed disabled:opacity-40" aria-haspopup="listbox" aria-expanded={isOpen} onClick={toggleDropdown}>
        <span className="min-w-0 truncate">{selectedLabel}</span>
        <span className={`shrink-0 text-[10px] text-stone-600 transition ${isOpen ? 'rotate-180' : ''}`}>▼</span>
      </button>
      {isOpen && menuPosition && createPortal(
        <div ref={menuRef} className="theme-popover fixed z-[1000] overflow-hidden rounded-xl border border-white/10 bg-[#211927] shadow-2xl shadow-black/60" style={{ left: menuPosition.left, width: menuPosition.width, top: menuPosition.top, bottom: menuPosition.bottom }} role="listbox" onKeyDown={(event) => event.key === 'Escape' && setIsOpen(false)}>
          {options.length > 12 && <div className="border-b border-white/[0.07] p-2"><input className="w-full rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-xs text-white placeholder:text-stone-600 focus:border-rose-400/40" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索选项…" autoFocus /></div>}
          <div className="scrollbar max-h-80 overflow-y-auto p-1.5">
            {filteredOptions.map((option, index) => {
              const optionValue = option.value ?? option;
              const optionLabel = option.label ?? option;
              const isSelected = String(optionValue) === String(value);
              return <button type="button" role="option" aria-selected={isSelected} className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-xs transition ${isSelected ? 'bg-rose-400/15 text-rose-200' : 'text-stone-300 hover:bg-white/[0.06] hover:text-white'}`} key={`${String(optionValue)}-${index}`} onClick={() => chooseOption(optionValue)}><span className="w-4 shrink-0 text-rose-300">{isSelected ? '✓' : ''}</span><span className="min-w-0 flex-1 truncate">{optionLabel}</span></button>;
            })}
            {filteredOptions.length === 0 && <p className="px-3 py-6 text-center text-xs text-stone-600">没有匹配选项</p>}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}

export function SelectCard({ label, value, options, onChange, disabled = false }) {
  const normalizedOptions = options.some((option) => String(option.value ?? option) === String(value))
    ? options
    : [value, ...options];
  return (
    <div className="block rounded-xl border border-white/[0.07] bg-black/10 p-3">
      <span className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-rose-300">{label}</span>
      <Dropdown value={value} options={normalizedOptions} onChange={onChange} disabled={disabled} />
    </div>
  );
}
