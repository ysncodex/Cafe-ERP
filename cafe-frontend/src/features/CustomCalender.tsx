import { useLayoutEffect, useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react';

// --- Types ---
type DateRange = {
  from: Date | null;
  to: Date | null;
};

type Preset = {
  label: string;
  getValue: () => DateRange;
};

interface RangeCalendarProps {
  onRangeChange?: (range: DateRange) => void;
  className?: string;
  align?: 'left' | 'right';
}

// --- Date Helper Functions ---
const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

const isSameDay = (d1: Date | null, d2: Date | null) => {
  if (!d1 || !d2) return false;
  return d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();
};

const isDateBetween = (date: Date, start: Date | null, end: Date | null) => {
  if (!start || !end) return false;
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const s = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
  const e = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();
  return target > s && target < e;
};

const formatDate = (date: Date | null): string => {
  if (!date) return '';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const formatDateShort = (date: Date | null): string => {
  if (!date) return '';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// --- Component ---
export default function RangeCalendar({ onRangeChange, className = '', align = 'left' }: RangeCalendarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [range, setRange] = useState<DateRange>({ from: null, to: null });
  const [viewDate, setViewDate] = useState(new Date());
  const [tempRange, setTempRange] = useState<DateRange>({ from: null, to: null });

  const containerRef = useRef<HTMLDivElement>(null);
  const anchorRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({});

  // Load saved range from localStorage on mount
  useEffect(() => {
    const savedRange = localStorage.getItem('dateRange');
    if (savedRange) {
      try {
        const parsed = JSON.parse(savedRange);
        const loadedRange = {
          from: parsed.from ? new Date(parsed.from) : null,
          to: parsed.to ? new Date(parsed.to) : null
        };
        // Ensure dates are valid
        if (loadedRange.from && !isNaN(loadedRange.from.getTime()) && 
            loadedRange.to && !isNaN(loadedRange.to.getTime())) {
          setRange(loadedRange);
          setTempRange(loadedRange);
          if (onRangeChange) {
            onRangeChange(loadedRange);
          }
        }
      } catch {
        // Invalid saved data, ignore
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const clickedAnchor = anchorRef.current?.contains(target);
      const clickedPanel = panelRef.current?.contains(target);

      if (!clickedAnchor && !clickedPanel) {
        setIsOpen(false);
        setTempRange(range);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [range]);

  // Sync tempRange when opening
  useEffect(() => {
    if (isOpen) {
      setTempRange(range);
      if (range.from) {
        setViewDate(new Date(range.from));
      } else {
        setViewDate(new Date());
      }
    }
  }, [isOpen, range]);

  const panelWidth = useMemo(() => {
    if (typeof window === 'undefined') return 420;
    return Math.min(420, Math.max(280, window.innerWidth - 16));
  }, [isOpen]);

  // Position the dropdown panel relative to the trigger, but fixed to viewport.
  useLayoutEffect(() => {
    if (!isOpen) return;
    if (typeof window === 'undefined') return;

    const anchorEl = anchorRef.current;
    if (!anchorEl) return;

    const updatePosition = () => {
      const rect = anchorEl.getBoundingClientRect();

      // Default placement below the button.
      const gap = 8;
      let left = align === 'right' ? rect.right - panelWidth : rect.left;
      let top = rect.bottom + gap;

      // Clamp horizontally to viewport.
      left = Math.max(8, Math.min(left, window.innerWidth - panelWidth - 8));

      // After render, measure actual height and flip upward if needed.
      const panelRect = panelRef.current?.getBoundingClientRect();
      const panelHeight = panelRect?.height ?? 420;

      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      if (spaceBelow < panelHeight + gap && spaceAbove > panelHeight + gap) {
        top = rect.top - panelHeight - gap;
      }

      // Clamp vertically.
      top = Math.max(8, Math.min(top, window.innerHeight - panelHeight - 8));

      setPanelStyle({
        position: 'fixed',
        left,
        top,
        width: panelWidth,
        zIndex: 60,
      });
    };

    // Run twice to account for first layout and after panel content sizes.
    updatePosition();
    requestAnimationFrame(updatePosition);

    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen, align, panelWidth]);

  const handleDayClick = (day: number) => {
    const clickedDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    clickedDate.setHours(0, 0, 0, 0);
    
    let newRange: DateRange = { ...tempRange };

    if (!newRange.from || (newRange.from && newRange.to)) {
      // Start new selection
      newRange = { from: clickedDate, to: null };
    } else {
      // Complete range
      if (clickedDate < newRange.from) {
        newRange = { from: clickedDate, to: newRange.from };
      } else {
        newRange = { from: newRange.from, to: clickedDate };
      }
    }
    setTempRange(newRange);
  };

  const handleApply = () => {
    if (!tempRange.from || !tempRange.to) return;
    
    // Normalize dates to avoid timezone issues
    const normalizedRange = {
      from: new Date(tempRange.from),
      to: new Date(tempRange.to)
    };
    normalizedRange.from.setHours(0, 0, 0, 0);
    normalizedRange.to.setHours(23, 59, 59, 999);
    
    setRange(normalizedRange);
    setIsOpen(false);
    
    // Save to localStorage
    localStorage.setItem('dateRange', JSON.stringify({
      from: normalizedRange.from.toISOString(),
      to: normalizedRange.to.toISOString()
    }));
    
    if (onRangeChange) onRangeChange(normalizedRange);
  };

  const handleClear = () => {
    const empty = { from: null, to: null };
    setTempRange(empty);
    setRange(empty);
    localStorage.removeItem('dateRange');
    if (onRangeChange) onRangeChange(empty);
  };

  const changeMonth = (offset: number) => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + offset, 1));
  };

  const daysInMonth = getDaysInMonth(viewDate.getFullYear(), viewDate.getMonth());
  const firstDayOfWeek = getFirstDayOfMonth(viewDate.getFullYear(), viewDate.getMonth());
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const emptySlots = Array.from({ length: firstDayOfWeek }, (_, i) => i);

  const presets: Preset[] = [
    { 
      label: 'Today', 
      getValue: () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return { from: today, to: today };
      }
    },
    { 
      label: 'Last 7 Days', 
      getValue: () => { 
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const from = new Date(today);
        from.setDate(today.getDate() - 6);
        return { from, to: today };
      }
    },
    { 
      label: 'Last 30 Days', 
      getValue: () => { 
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const from = new Date(today);
        from.setDate(today.getDate() - 29);
        return { from, to: today };
      }
    },
    { 
      label: 'Last 60 Days', 
      getValue: () => { 
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const from = new Date(today);
        from.setDate(today.getDate() - 59);
        return { from, to: today };
      }
    },
    { 
      label: 'Last 90 Days', 
      getValue: () => { 
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const from = new Date(today);
        from.setDate(today.getDate() - 89);
        return { from, to: today };
      }
    },
    { 
      label: 'This Month', 
      getValue: () => { 
        const now = new Date();
        return { 
          from: new Date(now.getFullYear(), now.getMonth(), 1), 
          to: new Date(now.getFullYear(), now.getMonth() + 1, 0) 
        };
      }
    },
    { 
      label: 'Last Month', 
      getValue: () => { 
        const now = new Date();
        return { 
          from: new Date(now.getFullYear(), now.getMonth() - 1, 1), 
          to: new Date(now.getFullYear(), now.getMonth(), 0) 
        };
      }
    },
    { 
      label: 'This Quarter', 
      getValue: () => { 
        const now = new Date();
        const quarter = Math.floor(now.getMonth() / 3);
        return { 
          from: new Date(now.getFullYear(), quarter * 3, 1), 
          to: new Date(now.getFullYear(), (quarter + 1) * 3, 0) 
        };
      }
    },
    { 
      label: 'This Year', 
      getValue: () => { 
        const now = new Date();
        return { 
          from: new Date(now.getFullYear(), 0, 1), 
          to: new Date(now.getFullYear(), 11, 31) 
        };
      }
    }
  ];

  const applyPreset = (preset: Preset) => {
    const newRange = preset.getValue();
    setTempRange(newRange);
    if (newRange.from) setViewDate(new Date(newRange.from));
    
    // Auto-apply preset
    setRange(newRange);
    setIsOpen(false);
    
    // Save to localStorage
    localStorage.setItem('dateRange', JSON.stringify({
      from: newRange.from?.toISOString(),
      to: newRange.to?.toISOString()
    }));
    
    if (onRangeChange) onRangeChange(newRange);
  };

  return (
    <div className={`relative inline-block ${className}`} ref={containerRef}>

      {/* Trigger Button - Changed to div to avoid nested button issue */}
      <div className="relative inline-flex" ref={anchorRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`
            flex items-center gap-2 px-4 py-2.5 bg-white rounded-xl border shadow-sm transition-all
            ${isOpen ? 'border-indigo-500 ring-2 ring-indigo-500/20 shadow-md' : 'border-slate-200 hover:border-slate-300 hover:shadow'}
            ${range.from ? 'pr-10' : ''}
          `}
        >
          <Calendar className={`w-4 h-4 ${isOpen || range.from ? 'text-indigo-600' : 'text-slate-500'}`} />
          <span className="text-sm font-medium text-slate-700">
            {range.from && range.to ? (
              <>
                <span className="text-indigo-600 font-semibold">{formatDateShort(range.from)}</span>
                <span className="mx-1.5 text-slate-400">→</span>
                <span className="text-indigo-600 font-semibold">{formatDateShort(range.to)}</span>
              </>
            ) : range.from ? (
              <>
                <span className="text-indigo-600 font-semibold">{formatDateShort(range.from)}</span>
                <span className="mx-1.5 text-slate-400">→</span>
                <span className="text-slate-400">Select end</span>
              </>
            ) : (
              <span className="text-slate-600">Select Date Range</span>
            )}
          </span>
        </button>
        {range.from && (
          <button
            type="button"
            onClick={(e) => { 
              e.stopPropagation(); 
              handleClear(); 
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 rounded-full transition-colors z-10"
            aria-label="Clear date range"
          >
            <X className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600" />
          </button>
        )}
      </div>

      {/* Dropdown Panel */}
      {isOpen && (
        typeof document !== 'undefined'
          ? createPortal(
              <>
                {/* Backdrop on small screens */}
                <div
                  className="fixed inset-0 z-50 bg-black/20 sm:hidden"
                  onClick={() => {
                    setIsOpen(false);
                    setTempRange(range);
                  }}
                />

                <div
                  ref={panelRef}
                  style={panelStyle}
                  className="bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
                >
                  {/* Presets Row */}
                  <div className="bg-gradient-to-r from-slate-50 to-indigo-50/30 p-2.5 sm:p-3 border-b border-slate-200">
                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
                      {presets.map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => applyPreset(preset)}
                          className="px-3 py-1.5 text-[11px] sm:text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-700 whitespace-nowrap shadow-sm transition-all flex-shrink-0"
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Calendar Area */}
                  <div className="p-3 sm:p-4">
                    {/* Month Navigation */}
                    <div className="flex items-center justify-between mb-3 sm:mb-4">
                      <button
                        type="button"
                        onClick={() => changeMonth(-1)}
                        className="p-1.5 hover:bg-indigo-50 rounded-lg transition-colors"
                        aria-label="Previous month"
                      >
                        <ChevronLeft className="w-5 h-5 text-slate-600" />
                      </button>
                      <span className="font-bold text-slate-800 text-sm sm:text-base">
                        {viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                      </span>
                      <button
                        type="button"
                        onClick={() => changeMonth(1)}
                        className="p-1.5 hover:bg-indigo-50 rounded-lg transition-colors"
                        aria-label="Next month"
                      >
                        <ChevronRight className="w-5 h-5 text-slate-600" />
                      </button>
                    </div>

                    {/* Weekday Headers */}
                    <div className="grid grid-cols-7 mb-2">
                      {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
                        <div key={d} className="text-center text-xs font-bold text-slate-500 py-1">
                          {d}
                        </div>
                      ))}
                    </div>

                    {/* Calendar Grid */}
                    <div className="grid grid-cols-7 gap-1">
                      {emptySlots.map((_, i) => (
                        <div key={`empty-${i}`} />
                      ))}
                      {daysArray.map((day) => {
                        const date = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
                        const isStart = isSameDay(date, tempRange.from);
                        const isEnd = isSameDay(date, tempRange.to);
                        const inRange = isDateBetween(date, tempRange.from, tempRange.to);
                        const today = isSameDay(date, new Date());
                        const isPast = date < new Date(new Date().setHours(0, 0, 0, 0));

                        return (
                          <button
                            key={day}
                            type="button"
                            onClick={() => handleDayClick(day)}
                            className={`
                              h-8 sm:h-9 w-full text-xs font-medium relative transition-all
                              ${isStart || isEnd ? 'bg-indigo-600 text-white font-bold shadow-md z-10' : ''}
                              ${isStart ? 'rounded-l-lg' : ''}
                              ${isEnd ? 'rounded-r-lg' : ''}
                              ${inRange && !isStart && !isEnd ? 'bg-indigo-100 text-indigo-700' : ''}
                              ${!isStart && !isEnd && !inRange ? 'hover:bg-slate-100 rounded-lg text-slate-700' : ''}
                              ${today && !isStart && !isEnd ? 'ring-2 ring-indigo-400 text-indigo-600 font-bold' : ''}
                              ${isPast && !isStart && !isEnd && !inRange && !today ? 'text-slate-400' : ''}
                            `}
                          >
                            {day}
                          </button>
                        );
                      })}
                    </div>

                    {/* Selected Range Display & Actions */}
                    <div className="mt-4 pt-4 border-t border-slate-200 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                      <div className="flex-1">
                        <div className="text-xs text-slate-500 font-medium">Selected Range:</div>
                        <div className="text-sm font-semibold text-slate-700 mt-0.5">
                          {tempRange.from && tempRange.to ? (
                            <>
                              {formatDate(tempRange.from)}{' '}
                              <span className="text-slate-400 mx-1">→</span>
                              {formatDate(tempRange.to)}
                            </>
                          ) : tempRange.from ? (
                            <>
                              {formatDate(tempRange.from)}{' '}
                              <span className="text-slate-400 mx-1">→</span>{' '}
                              <span className="text-slate-400">Select end date</span>
                            </>
                          ) : (
                            <span className="text-slate-400">Select start date</span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 w-full sm:w-auto justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            setTempRange(range);
                            setIsOpen(false);
                          }}
                          className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleApply}
                          disabled={!tempRange.from || !tempRange.to}
                          className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow"
                        >
                          Apply
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </>,
              document.body
            )
          : null
      )}
    </div>
  );
}