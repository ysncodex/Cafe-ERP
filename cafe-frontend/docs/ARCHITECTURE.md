# Architecture & Folder Guide

This document explains why the folders exist, what belongs where, and how to extend the project safely.

## High-level structure
- `src/pages/`: Page-level screens (Dashboard, DailyRecord, Costs, Fund, Reports)
- `src/shared/components/`: Reusable UI and layout components
- `src/context/`: Global app state (ERPContext)
- `src/shared/utils/`: Shared helpers, formatters, validation, calculations, exports
- `src/core/types/`: Shared TypeScript types
- `src/services/`: API client and service modules
- `src/hooks/`: Reusable hooks (pagination, auth, API helpers)

## Navigation & routing
- `src/App.tsx` handles React Router routes.
- Inside the protected dashboard route, the app uses an internal `activeTab` to switch pages.
- Sidebar controls `activeTab`.

## State management
- `src/context/ERPContext.tsx` is the main source of truth for:
  - transactions
  - filteredTransactions (computed)
  - dynamic lists (categories/items/suppliers)
  - demo-mode switching
- Data is persisted in localStorage (demo and real keys are separated).

## UI component exports
- Use a single import entry-point for shared UI:
  ```ts
  import { Button, StatCard, Pagination, ToastProvider } from '@/shared/components/ui';
  ```

## Adding a new page (recommended steps)
1. Create a new component in `src/pages/`.
2. Add it to the `activeTab` union in `src/App.tsx` and render it in `ERPContent`.
3. Add a sidebar entry in `src/shared/components/layout/Sidebar.tsx`.
4. Prefer imports via the `@/` alias.

## API layer
- `src/services/api.ts` defines the axios client.
- `VITE_API_URL` controls backend base URL.
- `authToken` is attached automatically via request interceptor.
