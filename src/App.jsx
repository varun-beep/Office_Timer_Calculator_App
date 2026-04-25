import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Clock, 
  Coffee, 
  Plus, 
  Trash2, 
  RotateCcw, 
  AlertCircle,
  Play,
  Square,
  ChevronRight,
  UtensilsCrossed,
  Droplets
} from 'lucide-react';

// ─── Lightweight vibration helper ───────────────────────────
const vibrate = (ms = 12) => {
  try { navigator.vibrate?.(ms); } catch (_) {}
};

// ─── Work duration helper (computed once per load, no timers) ─
// Returns { hours, minutes, label } based on the current day.
const getWorkDuration = () => {
  const day = new Date().getDay(); // 0 = Sun … 6 = Sat
  if (day === 6) return { hours: 5, minutes: 5 * 60, label: '5h target today' };
  return { hours: 8, minutes: 8 * 60, label: '8h target today' };
};

// Memoized at module level — stable for the lifetime of the page load
const WORK_DURATION = getWorkDuration();

const App = () => {
  // --- Robust State Initialization ---
  const [entryTime, setEntryTime] = useState(() => {
    try {
      const saved = localStorage.getItem('entryTime');
      if (saved && /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(saved)) return saved;
    } catch (e) {
      console.error('Error loading entryTime', e);
    }
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  });

  const [breaks, setBreaks] = useState(() => {
    try {
      const saved = localStorage.getItem('breaks');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error('Error loading breaks', e);
    }
    return [];
  });

  const [currentTime, setCurrentTime] = useState(new Date());

  // Toast notification { message, key }
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  const showToast = (message) => {
    clearTimeout(toastTimer.current);
    setToast({ message, key: Date.now() });
    toastTimer.current = setTimeout(() => setToast(null), 900);
  };

  useEffect(() => () => clearTimeout(toastTimer.current), []);

  // Ref to trigger exit-time pop animation
  const exitTimeRef = useRef(null);
  const prevExitRef = useRef(null);

  // --- Effects ---
  useEffect(() => {
    // 60-second tick — keeps remaining/exit time accurate to the minute
    // without the per-second CPU wake-up that iOS throttles in installed PWAs.
    const timer = setInterval(() => setCurrentTime(new Date()), 60_000);

    // Snap to current time the instant the user brings the app to foreground.
    // This covers PWA reopen from background, tab switch, and lock-screen unlock.
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') setCurrentTime(new Date());
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('entryTime', entryTime);
      localStorage.setItem('breaks', JSON.stringify(breaks));
    } catch (e) {
      console.error('Error saving state', e);
    }
  }, [entryTime, breaks]);

  // --- Helpers ---
  const parseTime = useCallback((timeStr) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const date = new Date();
    date.setHours(hours || 0, minutes || 0, 0, 0);
    return date;
  }, []);

  const formatDuration = (minutes) => {
    const h = Math.floor(minutes / 60);
    const m = Math.floor(minutes % 60);
    return `${h}h ${m}m`;
  };

  const nowStr = () =>
    new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

  const timeStrAddMinutes = (timeStr, mins) => {
    const [h, m] = timeStr.split(':').map(Number);
    const total = h * 60 + m + mins;
    const hh = Math.floor(total / 60) % 24;
    const mm = total % 60;
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  };

  const calculateTotalBreakMinutes = useCallback(() => {
    return breaks.reduce((total, b) => {
      if (b.end && b.start) {
        const start = parseTime(b.start);
        let end = parseTime(b.end);
        if (end < start) end.setDate(end.getDate() + 1);
        return total + (end - start) / 60000;
      }
      return total;
    }, 0);
  }, [breaks, parseTime]);

  const totalBreakMinutes = calculateTotalBreakMinutes();
  const workDurationRequiredMinutes = WORK_DURATION.minutes;
  
  const entryDate = parseTime(entryTime);
  const exitDate = new Date(entryDate.getTime() + (workDurationRequiredMinutes + totalBreakMinutes) * 60000);
  
  const totalWorkDoneMinutes = Math.max(0, (currentTime - entryDate) / 60000 - totalBreakMinutes);
  const remainingMinutes = Math.max(0, workDurationRequiredMinutes - totalWorkDoneMinutes);
  const isOvertime = currentTime > exitDate;

  // Trigger exit-time pop animation whenever exit time changes
  const exitTimeStr = exitDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  useEffect(() => {
    if (prevExitRef.current && prevExitRef.current !== exitTimeStr && exitTimeRef.current) {
      exitTimeRef.current.classList.remove('exit-time-pop');
      void exitTimeRef.current.offsetWidth; // reflow
      exitTimeRef.current.classList.add('exit-time-pop');
    }
    prevExitRef.current = exitTimeStr;
  }, [exitTimeStr]);

  // --- Handlers ---
  const hasActiveBreak = breaks.some(b => !b.end);

  const addBreak = () => {
    if (hasActiveBreak) return;
    vibrate(12);
    setBreaks(prev => [...prev, { id: Date.now(), start: nowStr(), end: '' }]);
  };

  const updateBreak = (id, field, value) => {
    setBreaks(prev => prev.map(b => b.id === id ? { ...b, [field]: value } : b));
  };

  const deleteBreak = (id) => {
    vibrate(10);
    setBreaks(prev => prev.filter(b => b.id !== id));
  };

  const startBreakNow = () => {
    vibrate(15);
    setBreaks(prev => [...prev, { id: Date.now(), start: nowStr(), end: '' }]);
  };

  const endBreakNow = () => {
    vibrate(15);
    setBreaks(prev => prev.map(b => !b.end ? { ...b, end: nowStr() } : b));
  };

  // Quick actions: Pantry (1 min) / Washroom (3 min)
  const addQuickBreak = (minutes, label) => {
    if (hasActiveBreak) return;
    vibrate(12);
    const start = nowStr();
    const end = timeStrAddMinutes(start, minutes);
    setBreaks(prev => [...prev, { id: Date.now(), start, end }]);
    showToast(`+${minutes} min break added`);
  };

  const resetDay = () => {
    if (window.confirm('Reset session? All data for today will be cleared.')) {
      vibrate(20);
      setEntryTime(nowStr());
      setBreaks([]);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#1a1a1a] text-[#EDEDED] selection:bg-white/10 safe-area-inset">
      <div className="max-w-[420px] mx-auto px-6 pt-16 pb-36 flex flex-col gap-12">
        
        {/* Header */}
        <header className="flex justify-between items-end px-1">
          <div className="flex flex-col">
            <h1 className="text-sm font-medium text-white/40 uppercase tracking-[0.2em]">Expected Exit</h1>
            <div className="flex items-baseline gap-2 mt-1">
              <span ref={exitTimeRef} className="text-4xl font-semibold tracking-tight linear-gradient-text">
                {exitTimeStr}
              </span>
              {isOvertime && (
                <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider animate-pulse">Overtime</span>
              )}
            </div>
            <span className="mt-1 text-[10px] font-medium text-white/25 tracking-wide">{WORK_DURATION.label}</span>
          </div>
          <button 
            onClick={resetDay}
            className="p-3 rounded-full hover:bg-white/5 transition-colors text-white/20 hover:text-white"
            aria-label="Reset Day"
          >
            <RotateCcw size={18} strokeWidth={2.5} />
          </button>
        </header>

        {/* Stats Grid */}
        <section className="stats-grid grid grid-cols-2 gap-px">
          <div className="stats-cell">
            <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Remaining</span>
            <span className="text-xl font-medium tracking-tight transition-all duration-300">
              {remainingMinutes > 0 ? formatDuration(remainingMinutes) : '0h 0m'}
            </span>
          </div>
          <div className="stats-cell">
            <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Total Break</span>
            <span className="text-xl font-medium tracking-tight transition-all duration-300">
              {formatDuration(totalBreakMinutes)}
            </span>
          </div>
        </section>

        {/* Main Content */}
        <main className="flex flex-col gap-10">
          
          {/* Shift Start Section */}
          <section>
            <div className="flex items-center gap-2 mb-4 px-1 text-white/40">
              <Clock size={14} />
              <h2 className="text-xs font-bold uppercase tracking-widest">Shift Start</h2>
            </div>
            <div className="notion-card p-4 flex items-center justify-between group">
              <input 
                type="time" 
                value={entryTime}
                onChange={(e) => setEntryTime(e.target.value)}
                className="bg-transparent border-none p-0 text-lg font-medium focus:ring-0 cursor-pointer w-full text-white"
              />
              <ChevronRight size={16} className="text-white/10 group-hover:text-white/30 transition-colors" />
            </div>
          </section>

          {/* Breaks Section */}
          <section>
            <div className="flex items-center justify-between mb-4 px-1">
              <div className="flex items-center gap-2 text-white/40">
                <Coffee size={14} />
                <h2 className="text-xs font-bold uppercase tracking-widest">Work Breaks</h2>
              </div>
              <button 
                onClick={addBreak}
                disabled={hasActiveBreak}
                className="p-1 text-white/30 hover:text-white transition-colors active:scale-90 disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="Add Manual Break"
              >
                <Plus size={18} />
              </button>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex gap-2 mb-4">
              <button
                className="quick-action-btn"
                onClick={() => addQuickBreak(1, 'Pantry')}
                disabled={hasActiveBreak}
                title="Add a 1-minute pantry break"
                aria-label="Pantry break — 1 minute"
              >
                <UtensilsCrossed size={14} strokeWidth={2} />
                <span>Pantry</span>
                <span className="btn-duration">+1 min</span>
              </button>
              <button
                className="quick-action-btn"
                onClick={() => addQuickBreak(3, 'Washroom')}
                disabled={hasActiveBreak}
                title="Add a 3-minute washroom break"
                aria-label="Washroom break — 3 minutes"
              >
                <Droplets size={14} strokeWidth={2} />
                <span>Washroom</span>
                <span className="btn-duration">+3 min</span>
              </button>
            </div>

            <div className="flex flex-col gap-3">
              {breaks.length === 0 ? (
                <button 
                  onClick={() => setBreaks([{ id: Date.now(), start: '12:00', end: '13:00' }])}
                  className="w-full notion-card p-8 border-dashed border-white/5 flex flex-col items-center gap-2 group"
                >
                  <span className="text-xs font-medium text-white/20 group-hover:text-white/40 transition-colors">No breaks recorded today.</span>
                  <span className="text-[10px] font-bold text-white/10 uppercase tracking-widest group-hover:text-indigo-400 transition-colors">Suggest 1h lunch?</span>
                </button>
              ) : (
                breaks.map((b) => (
                  <div
                    key={b.id}
                    className="notion-card p-4 flex items-center gap-6 group animate-in fade-in slide-in-from-bottom-2"
                  >
                    <div className="flex-1 grid grid-cols-2 gap-8">
                      <div className="flex flex-col">
                        <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest mb-1">Start</span>
                        <input 
                          type="time" 
                          value={b.start}
                          onChange={(e) => updateBreak(b.id, 'start', e.target.value)}
                          className="bg-transparent border-none p-0 text-sm font-medium focus:ring-0 text-white"
                        />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest mb-1">End</span>
                        <input 
                          type="time" 
                          value={b.end}
                          placeholder="--"
                          onChange={(e) => updateBreak(b.id, 'end', e.target.value)}
                          className="bg-transparent border-none p-0 text-sm font-medium focus:ring-0 text-white placeholder:text-white/10"
                        />
                      </div>
                    </div>
                    <button 
                      onClick={() => deleteBreak(b.id)}
                      className="p-2 text-white/0 group-hover:text-white/20 hover:!text-red-500 transition-all active:scale-90"
                      aria-label="Delete Break"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>
        </main>

        {/* Warning Toast */}
        {totalBreakMinutes > 150 && (
          <div className="flex items-center gap-3 text-amber-400/80 bg-amber-400/5 border border-amber-400/10 p-4 rounded-xl text-[11px] font-medium leading-relaxed animate-in fade-in">
            <AlertCircle size={16} strokeWidth={2.5} />
            Break duration seems unusually high. Please verify your entries.
          </div>
        )}

        {/* Developer Credit */}
        <p className="dev-credit">Developed by Varun</p>

        {/* Quick-action toast */}
        {toast && (
          <div
            key={toast.key}
            className="fixed bottom-28 left-1/2 -translate-x-1/2 z-[60]
                       px-4 py-2 rounded-xl
                       bg-[#2c2c2c] border border-white/8
                       text-[11px] font-medium text-white/60 tracking-wide
                       shadow-lg
                       animate-in fade-in slide-in-from-bottom-2"
            style={{ whiteSpace: 'nowrap' }}
          >
            {toast.message}
          </div>
        )}

        {/* Floating Footer Action */}
        <footer className="fixed bottom-0 left-0 w-full p-6 ios-glass z-50">
          <div className="max-w-[420px] mx-auto">
            {hasActiveBreak ? (
              <button 
                onClick={endBreakNow}
                className="w-full bg-white text-black font-bold py-4 rounded-xl flex items-center justify-center gap-3 transition-all active:scale-[0.97] shadow-[0_8px_30px_rgb(0,0,0,0.4)]"
              >
                <Square size={18} fill="currentColor" />
                Finish Current Break
              </button>
            ) : (
              <button 
                onClick={startBreakNow}
                className="w-full bg-white text-black font-bold py-4 rounded-xl flex items-center justify-center gap-3 transition-all active:scale-[0.97] shadow-[0_8px_30px_rgb(0,0,0,0.4)]"
              >
                <Play size={18} fill="currentColor" />
                Start Break Session
              </button>
            )}
            {/* Safe area for home indicator */}
            <div className="h-2"></div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default App;
