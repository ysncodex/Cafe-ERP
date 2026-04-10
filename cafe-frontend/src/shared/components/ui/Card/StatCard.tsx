import type { StatCardProps } from './Card.types';

/**
 * StatCard Component
 * Displays a statistical metric with icon, value, and optional trend indicator
 */
export function StatCard({ 
  title, 
  value, 
  subtext, 
  icon: Icon, 
  colorClass, 
  bgClass, 
  trend 
}: StatCardProps) {
  return (
    <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between h-full transition-all hover:shadow-md">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-xl ${bgClass} ${colorClass}`}>
          <Icon size={24} strokeWidth={2} />
        </div>
        {trend !== undefined && (
          <span 
            className={`text-xs font-bold px-2 py-1 rounded-full ${
              trend >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
            }`}
          >
            {trend > 0 ? '+' : ''}{trend}%
          </span>
        )}
      </div>
      <div>
        <h3 className="text-2xl font-extrabold text-slate-800 tracking-tight mb-1 break-words">
          {value}
        </h3>
        <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">
          {title}
        </p>
        {subtext && (
          <p className="text-xs text-slate-400 mt-2 font-medium">
            {subtext}
          </p>
        )}
      </div>
    </div>
  );
}
