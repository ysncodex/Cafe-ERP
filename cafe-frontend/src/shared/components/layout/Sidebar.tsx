import { NavLink, useNavigate } from 'react-router-dom';
import {
  Coffee,
  LayoutDashboard,
  History,
  FileBarChart,
  ShoppingBag,
  Package,
  Building2,
  Wallet,
  ChevronRight,
  X,
  LogOut,
} from 'lucide-react';
import type { SidebarProps, TabId } from './Layout.types';
import { logoutAndClearAllStorage } from '@/shared/utils';

export function Sidebar({ activeTab, isOpen, onClose }: SidebarProps) {
  const navigate = useNavigate();

  const handleLogout = () => {
    try {
      logoutAndClearAllStorage();
    } catch {
      // ignore storage errors
    }
    navigate('/');
  };

  return (
    <aside className={`
      fixed inset-y-0 left-0 z-40 w-72 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-slate-300 flex flex-col h-screen shadow-2xl transition-transform duration-300 ease-in-out
      md:translate-x-0 md:sticky md:inset-auto md:h-screen md:top-0
      ${isOpen ? 'translate-x-0' : '-translate-x-full'}
    `}>
      <div className="p-6 md:p-8 pb-6 border-b border-slate-700/50 bg-slate-800/30 backdrop-blur-sm flex justify-between items-center">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-3">
            <div className="bg-gradient-to-br from-amber-400 to-amber-600 p-1.5 md:p-2 rounded-lg shadow-lg shadow-amber-500/30">
              <Coffee className="text-white" size={20} strokeWidth={2.5} />
            </div>
            Café ERP
          </h1>
          <p className="text-[10px] md:text-xs text-slate-400 mt-2 pl-1 font-medium">V2.6 • Investor Ready</p>
        </div>
        <button onClick={onClose} className="md:hidden text-slate-400 hover:text-white">
          <X size={24} />
        </button>
      </div>

      <nav className="p-4 space-y-1.5 flex-1 overflow-y-auto custom-scrollbar bg-gradient-to-b from-transparent via-slate-800/20 to-transparent">
        <div className="text-xs font-bold text-slate-400 uppercase px-4 mb-2 mt-4 tracking-wider">Main Menu</div>
        {([
          { id: 'dashboard', to: '/dashboard/overview', label: 'Dashboard', icon: LayoutDashboard },
          { id: 'daily_record', to: '/dashboard/records', label: 'All Records', icon: History },
          { id: 'report', to: '/dashboard/reports', label: 'Analytics Report', icon: FileBarChart },
        ] as Array<{ id: TabId; to: string; label: string; icon: typeof LayoutDashboard }>).map(item => (
          <NavLink
            key={item.id}
            to={item.to}
            onClick={onClose}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${activeTab === item.id ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-lg shadow-amber-500/30 scale-[1.02]' : 'hover:bg-slate-700/50 hover:text-white hover:shadow-md'}`}
          >
            <item.icon size={20} className={activeTab === item.id ? 'text-white' : 'text-slate-400 group-hover:text-white'} />
            <span className="text-sm font-semibold">{item.label}</span>
            {activeTab === item.id && <ChevronRight size={16} className="ml-auto opacity-80" />}
          </NavLink>
        ))}

        <div className="text-xs font-bold text-slate-400 uppercase px-4 mb-2 mt-6 tracking-wider">Operations</div>
        {([
          { id: 'daily_expense', to: '/dashboard/expenses', label: 'Daily Expenses', icon: ShoppingBag },
          { id: 'product_cost', to: '/dashboard/product-costs', label: 'Product Costs', icon: Package },
          { id: 'fixed_cost', to: '/dashboard/fixed-costs', label: 'Fixed Costs', icon: Building2 },
          { id: 'fund', to: '/dashboard/fund', label: 'Fund Management', icon: Wallet },
        ] as Array<{ id: TabId; to: string; label: string; icon: typeof ShoppingBag }>).map(item => (
          <NavLink
            key={item.id}
            to={item.to}
            onClick={onClose}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${activeTab === item.id ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg shadow-indigo-500/30 scale-[1.02]' : 'hover:bg-slate-700/50 hover:text-white hover:shadow-md'}`}
          >
            <item.icon size={20} className={activeTab === item.id ? 'text-white' : 'text-slate-400 group-hover:text-white'} />
            <span className="text-sm font-semibold">{item.label}</span>
            {activeTab === item.id && <ChevronRight size={16} className="ml-auto opacity-80" />}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-700/50 bg-slate-800/30 backdrop-blur-sm">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-rose-900/30 text-slate-400 hover:text-rose-400 transition-all duration-200 hover:shadow-md hover:shadow-rose-500/10"
        >
          <LogOut size={20} />
          <span className="text-sm font-semibold">Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
