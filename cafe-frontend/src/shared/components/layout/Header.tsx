import { Menu, Calendar, UserCircle2 } from 'lucide-react';
import { DemoModeToggle } from '../ui';
import type { HeaderProps } from './Layout.types';
import { getStoredUser, getUserDisplayName } from '@/shared/utils';

export function Header({ activeTab, onMobileMenuToggle }: HeaderProps) {
  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  const getPageTitle = (tab: string) => {
    const titles: Record<string, string> = {
      daily_record: 'All Records',
    };
    return titles[tab] || tab.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  const getPageDescription = (tab: string) => {
    const descriptions: Record<string, string> = {
      dashboard: 'Overview of key financial metrics and recent activities',
      daily_record: 'Browse and search all records by date range',
      daily_expense: 'Track daily operational expenses',
      product_cost: 'Manage product inventory and variable costs',
      fixed_cost: 'Monitor recurring fixed expenses',
      fund: 'Manage fund additions and withdrawals',
      report: 'Generate comprehensive financial reports'
    };
    return descriptions[tab] || 'ERP Management System';
  };

  const userName = getUserDisplayName();
  const isGuest = getStoredUser()?.role === 'guest';

  return (
    <header className="sticky top-0 z-20 bg-gradient-to-r from-white to-slate-50 border-b border-slate-200 shadow-sm">
      <div className="px-4 py-3 md:px-8 md:py-4">
        <div className="flex items-center justify-between">
          {/* Left Section: Title and Description */}
          <div className="flex items-center gap-3 flex-1">
            <button
              onClick={onMobileMenuToggle}
              className="md:hidden p-2 -ml-2 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
              aria-label="Toggle menu"
            >
              <Menu size={24} />
            </button>

            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h1 className="text-lg md:text-2xl font-bold text-slate-900 tracking-tight">
                  {getPageTitle(activeTab)}
                </h1>
                <span className="hidden md:inline-flex items-center px-2.5 py-1 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-full">
                  Active
                </span>
              </div>
              <p className="text-xs md:text-sm text-slate-500 mt-1 hidden md:block">
                {getPageDescription(activeTab)}
              </p>
            </div>
          </div>

          {/* Right Section: Date and Status */}
          <div className="hidden md:flex items-center gap-3">
            {isGuest && <DemoModeToggle />}
            <div className="flex items-center gap-2 text-sm text-slate-700 bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm">
              <UserCircle2 size={18} className="text-slate-400" />
              <span className="font-semibold">{userName}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-600 bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm">
              <Calendar size={16} className="text-slate-400" />
              <span className="font-medium">{currentDate}</span>
            </div>
          </div>
        </div>

        {/* Mobile Date Display */}
        <div className="md:hidden mt-2 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Calendar size={14} className="text-slate-400" />
            <span>{currentDate}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 shadow-sm">
              <UserCircle2 size={14} className="text-slate-400" />
              <span className="font-semibold">{userName}</span>
            </div>
            {isGuest && <DemoModeToggle />}
          </div>
        </div>
      </div>
    </header>
  );
}
