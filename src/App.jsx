import React, { useState, useEffect, useCallback } from 'react';
import { 
  Clock, 
  Coffee, 
  Plus, 
  Trash2, 
  RotateCcw, 
  AlertCircle,
  Play,
  Square,
  ChevronRight
} from 'lucide-react';

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

  // --- Effects ---
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    
    // Handle app visibility change (resuming from background)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        setCurrentTime(new Date());
      }
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

  const calculateTotalBreakMinutes = useCallback(() => {
    return breaks.reduce((total, b) => {
      if (b.end && b.start) {
        const start = parseTime(b.start);
        let end = parseTime(b.end);
        if (end < start) end.setDate(end.getDate() + 1); // Handle overnight
        return total + (end - start) / 60000;
      }
      return total;
    }, 0);
  }, [breaks, parseTime]);

  const totalBreakMinutes = calculateTotalBreakMinutes();
  const workDurationRequiredMinutes = 8 * 60;
  
  const entryDate = parseTime(entryTime);
  const exitDate = new Date(entryDate.getTime() + (workDurationRequiredMinutes + totalBreakMinutes) * 60000);
  
  const totalWorkDoneMinutes = Math.max(0, (currentTime - entryDate) / 60000 - totalBreakMinutes);
  const remainingMinutes = Math.max(0, workDurationRequiredMinutes - totalWorkDoneMinutes);
  const isOvertime = currentTime > exitDate;

  // --- Handlers ---
  const addBreak = () => {
    const activeBreak = breaks.find(b => !b.end);
    if (activeBreak) return;
    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    setBreaks([...breaks, { id: Date.now(), start: nowStr, end: '' }]);
  };

  const updateBreak = (id, field, value) => {
    setBreaks(breaks.map(b => b.id === id ? { ...b, [field]: value } : b));
  };

  const deleteBreak = (id) => {
    setBreaks(breaks.filter(b => b.id !== id));
  };

  const startBreakNow = () => {
    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    setBreaks([...breaks, { id: Date.now(), start: nowStr, end: '' }]);
  };

  const endBreakNow = () => {
    const activeBreak = breaks.find(b => !b.end);
    if (activeBreak) {
      const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
      updateBreak(activeBreak.id, 'end', nowStr);
    }
  };

  const resetDay = () => {
    if (window.confirm('Reset session? All data for today will be cleared.')) {
      const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
      setEntryTime(nowStr);
      setBreaks([]);
    }
  };

  return (
    <div className="min-h-screen w-full bg-black text-[#EDEDED] selection:bg-white/10 safe-area-inset">
      <div className="max-w-[420px] mx-auto px-6 pt-16 pb-32 flex flex-col gap-12">
        
        {/* Header */}
        <header className="flex justify-between items-end px-1">
          <div className="flex flex-col">
            <h1 className="text-sm font-medium text-white/40 uppercase tracking-[0.2em]">Expected Exit</h1>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-4xl font-semibold tracking-tight linear-gradient-text">
                {exitDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
              {isOvertime && (
                <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider animate-pulse">Overtime</span>
              )}
            </div>
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
        <section className="grid grid-cols-2 gap-px bg-[#222] border border-[#222] rounded-2xl overflow-hidden shadow-2xl">
          <div className="bg-[#111] p-5 flex flex-col gap-1">
            <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Remaining</span>
            <span className="text-xl font-medium tracking-tight">{remainingMinutes > 0 ? formatDuration(remainingMinutes) : '0h 0m'}</span>
          </div>
          <div className="bg-[#111] p-5 flex flex-col gap-1 border-l border-[#222]">
            <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Total Break</span>
            <span className="text-xl font-medium tracking-tight">{formatDuration(totalBreakMinutes)}</span>
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
            <div className="notion-card p-4 flex items-center justify-between group active:scale-[0.99] transition-transform">
              <input 
                type="time" 
                value={entryTime}
                onChange={(e) => setEntryTime(e.target.value)}
                className="bg-transparent border-none p-0 text-lg font-medium focus:ring-0 cursor-pointer w-full text-white"
              />
              <ChevronRight size={16} className="text-white/10 group-hover:text-white/30" />
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
                className="p-1 text-white/30 hover:text-white transition-colors active:scale-90"
                aria-label="Add Manual Break"
              >
                <Plus size={18} />
              </button>
            </div>

            <div className="flex flex-col gap-3">
              {breaks.length === 0 ? (
                <button 
                  onClick={() => setBreaks([{ id: Date.now(), start: '12:00', end: '13:00' }])}
                  className="w-full notion-card p-8 border-dashed border-white/5 flex flex-col items-center gap-2 group active:scale-[0.99] transition-all"
                >
                  <span className="text-xs font-medium text-white/20 group-hover:text-white/40">No breaks recorded today.</span>
                  <span className="text-[10px] font-bold text-white/10 uppercase tracking-widest group-hover:text-indigo-400">Suggest 1h lunch?</span>
                </button>
              ) : (
                breaks.map((b) => (
                  <div key={b.id} className="notion-card p-4 flex items-center gap-6 group animate-in fade-in slide-in-from-bottom-2">
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
          <div className="flex items-center gap-3 text-amber-400/80 bg-amber-400/5 border border-amber-400/10 p-4 rounded-xl text-[11px] font-medium leading-relaxed animate-in fade-in zoom-in">
            <AlertCircle size={16} strokeWidth={2.5} />
            Break duration seems unusually high. Please verify your entries.
          </div>
        )}

        {/* Floating Footer Action */}
        <footer className="fixed bottom-0 left-0 w-full p-6 ios-glass z-50">
          <div className="max-w-[420px] mx-auto">
            {breaks.some(b => !b.end) ? (
              <button 
                onClick={endBreakNow}
                className="w-full bg-white text-black font-bold py-4.5 rounded-xl flex items-center justify-center gap-3 transition-all active:scale-[0.97] shadow-[0_8px_30px_rgb(0,0,0,0.4)]"
              >
                <Square size={18} fill="currentColor" />
                Finish Current Break
              </button>
            ) : (
              <button 
                onClick={startBreakNow}
                className="w-full bg-white text-black font-bold py-4.5 rounded-xl flex items-center justify-center gap-3 transition-all active:scale-[0.97] shadow-[0_8px_30px_rgb(0,0,0,0.4)]"
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
