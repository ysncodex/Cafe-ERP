import { useEffect, useState } from 'react';
import { Database, DatabaseZap } from 'lucide-react';
import { DEMO_MODE_EVENT, isDemoMode, setDemoMode } from '@/shared/utils';

interface DemoModeToggleProps {
  className?: string;
}

export function DemoModeToggle({ className = '' }: DemoModeToggleProps) {
  const [isDemo, setIsDemo] = useState(isDemoMode());

  useEffect(() => {
    const sync = () => setIsDemo(isDemoMode());
    window.addEventListener(DEMO_MODE_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(DEMO_MODE_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const handleToggle = () => {
    const newMode = !isDemo;
    setIsDemo(newMode);
    setDemoMode(newMode);
  };

  return (
    <button
      onClick={handleToggle}
      className={`
        flex items-center gap-2 px-3 py-2 rounded-lg shadow-sm
        font-semibold text-xs transition-all hover:scale-105
        ${isDemo 
          ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600' 
          : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-300'
        }
        ${className}
      `}
      title={isDemo ? 'Click to disable demo mode' : 'Click to enable demo mode with sample data'}
    >
      {isDemo ? (
        <>
          <DatabaseZap size={16} />
          <span className="hidden sm:inline">Demo ON</span>
        </>
      ) : (
        <>
          <Database size={16} />
          <span className="hidden sm:inline">Demo OFF</span>
        </>
      )}
    </button>
  );
}
