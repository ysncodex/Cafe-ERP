import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ERPProvider } from './context/ERPContext';
import { ToastProvider } from '@/shared/components/ui';
import { ErrorBoundary } from '@/shared/components/ErrorBoundary';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import LoginPage from './features/auth/Login';
import TestComponents from './pages/TestComponents';
import { isAuthenticated } from '@/shared/utils';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const DailyRecord = lazy(() => import('./pages/DailyRecord'));
const DailyExpense = lazy(() => import('./pages/DailyExpense'));
const ProductCosts = lazy(() => import('./pages/ProductCosts'));
const FixedCosts = lazy(() => import('./pages/FixedCosts'));
const FundManagement = lazy(() => import('./pages/FundManagement'));
const Reports = lazy(() => import('./pages/Reports'));

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-800"></div>
    </div>
  );
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const isAuthed = isAuthenticated();
  return isAuthed ? <>{children}</> : <Navigate to="/" replace />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider />
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/test-components" element={<TestComponents />} />
          <Route
            path="/dashboard"
            element={
              <RequireAuth>
                <ERPProvider>
                  <DashboardLayout />
                </ERPProvider>
              </RequireAuth>
            }
          >
            <Route path="overview" element={<Dashboard />} />
            <Route path="records" element={<DailyRecord />} />
            <Route path="expenses" element={<DailyExpense />} />
            <Route path="product-costs" element={<ProductCosts />} />
            <Route path="fixed-costs" element={<FixedCosts />} />
            <Route path="fund" element={<FundManagement />} />
            <Route path="reports" element={<Reports />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}
