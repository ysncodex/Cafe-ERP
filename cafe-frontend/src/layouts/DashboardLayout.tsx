import { Suspense, useMemo, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Header, Sidebar, type TabId } from '@/shared/components/layout';
import { PageLoader } from '@/shared/components/ui/Loading/Skeletons';

function tabFromPathname(pathname: string): TabId {
  // Expected: /dashboard/<section>
  const parts = pathname.split('/').filter(Boolean);
  const section = parts[1];

  switch (section) {
    case undefined:
    case 'overview':
      return 'dashboard';
    case 'records':
      return 'daily_record';
    case 'expenses':
      return 'daily_expense';
    case 'product-costs':
      return 'product_cost';
    case 'fixed-costs':
      return 'fixed_cost';
    case 'fund':
      return 'fund';
    case 'reports':
      return 'report';
    default:
      return 'dashboard';
  }
}

export function DashboardLayout() {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const activeTab = useMemo(() => tabFromPathname(location.pathname), [location.pathname]);

  // If someone visits exactly /dashboard, redirect to the default section.
  if (location.pathname === '/dashboard') {
    return <Navigate to="/dashboard/overview" replace />;
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-slate-800 flex relative overflow-hidden">
      <Sidebar
        activeTab={activeTab}
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />

      <main className="flex-1 overflow-y-auto bg-[#F8FAFC] w-full h-screen flex flex-col">
        <Header
          activeTab={activeTab}
          onMobileMenuToggle={() => setIsMobileMenuOpen(true)}
        />

        <div className="p-4 md:p-8 max-w-[1600px] mx-auto space-y-6 md:space-y-8 pb-24 md:pb-20 w-full">
          <Suspense fallback={<PageLoader />}>
            <Outlet />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
