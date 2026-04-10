# Cafe ERP Dashboard (Frontend)

A user-friendly cafe operations dashboard built with React and TypeScript.
It helps owners and managers track sales, expenses, fund movements, and reports from one place, with optional backend API integration.

## 1) Project Title and Description

**Cafe ERP** is a single-page frontend application for cafe finance and operational visibility.
The app supports both local/demo workflows (via browser storage) and API-driven workflows for production environments.

## 2) Features

- Secure entry flow with owner login and guest/demo mode
- Dashboard KPIs for sales, costs, liquidity, and profitability
- Daily record view with filtering and pagination
- Expense management for product costs and fixed costs
- Fund management for inflow/outflow and transfer tracking
- Reporting and export support (daily, monthly, profit/loss)
- Reusable UI system (tables, cards, forms, toasts, pagination)
- Local-first persistence using `localStorage`

## 3) Technology Stack

### Frontend

- React 19
- TypeScript
- Vite
- React Router
- Tailwind CSS

### State, Forms, and Data

- React Context API (`ERPContext`)
- `react-hook-form` + `zod`
- Axios for HTTP calls

### Data Visualization and UX

- Recharts
- TanStack React Table
- Sonner (toasts)
- Lucide React (icons)

### Tooling and Quality

- ESLint
- Vitest + Testing Library + MSW (dependencies present for automated tests)

### Backend / Database

- This repository is frontend-focused.
- Backend API and database are expected to be external services.

## 4) System Architecture

At a high level:

1. User authenticates on `/` (owner or guest/demo).
2. Authenticated users access protected routes under `/dashboard/*`.
3. `ERPContext` manages transaction data, filters, computed stats, and persistence.
4. Pages render operational views (dashboard, records, costs, funds, reports).
5. Service modules call REST endpoints when `VITE_API_URL` is configured.
6. Axios interceptors attach token headers and handle unauthorized responses.

### Architecture Highlights

- **Presentation Layer:** pages, layouts, reusable components
- **State Layer:** global ERP context + hooks
- **Integration Layer:** API client and domain services
- **Persistence:** browser `localStorage` (demo and non-demo separation)

## 5) Installation and Setup

### Prerequisites

- Node.js (LTS recommended)
- npm

### Steps

```bash
npm install
npm run dev
```

The app will run on the Vite development URL (commonly `http://localhost:5173`).

### Build and Preview

```bash
npm run build
npm run preview
```

### Useful Scripts

```bash
npm run lint
npm run analyze
```

## 6) Environment Variables

Create a `.env` file in the project root:

```env
VITE_API_URL=http://localhost:3000/api
```

| Variable       | Required | Description                   | Default                     |
| -------------- | -------- | ----------------------------- | --------------------------- |
| `VITE_API_URL` | No       | Base URL for backend REST API | `http://localhost:3000/api` |

> Restart the dev server after changing `.env` values.

## 7) Usage

### Owner password (local / demo)

The default owner sign-in password is **`123456`**. Use **Guest mode** for demo data without this password.

1. Open the app and sign in as owner or use guest mode.
2. Use the dashboard to view KPIs and trend summaries.
3. Add and review sales/expense/fund transactions.
4. Navigate to daily records for filtered historical entries.
5. Generate report views and export where available.

### Typical User Flow

- Login -> Dashboard -> Record transactions -> Review costs/funds -> Generate reports

## 8) API Documentation

This repo contains the frontend client contract for a backend API.
Base path: `VITE_API_URL`

### Authentication

- `POST /auth/login`
- `GET /auth/verify`

### Sales

- `GET /sales`
- `GET /sales/:id`
- `POST /sales`
- `PUT /sales/:id`
- `DELETE /sales/:id`
- `GET /sales/stats`
- `GET /sales/recent`

### Expenses

- `GET /expenses`
- `GET /expenses/:id`
- `POST /expenses`
- `PUT /expenses/:id`
- `DELETE /expenses/:id`
- `GET /expenses/stats`
- `GET /expenses/product-costs`
- `GET /expenses/fixed-costs`

### Funds

- `GET /funds`
- `GET /funds/:id`
- `POST /funds`
- `PUT /funds/:id`
- `DELETE /funds/:id`
- `GET /funds/stats`
- `GET /funds/balance`

### Reports

- `GET /reports/daily`
- `GET /reports/monthly`
- `GET /reports/profit-loss`
- `GET /reports/custom`
- `GET /reports/export`

For request/response examples, see `PROJECT_DOCUMENTATION.md`.

## 9) Folder Structure

```text
cafe-frontend/
|-- src/
|   |-- pages/                 # Route-level screens
|   |-- layouts/               # App layout wrappers
|   |-- shared/components/     # Reusable UI components
|   |-- context/               # Global state (ERPContext)
|   |-- services/              # API client + domain service modules
|   |-- hooks/                 # Reusable hooks
|   |-- core/types/            # Shared TypeScript types
|   |-- shared/utils/          # Helpers, calculations, exports, validation
|   |-- assets/                # Static assets
|   |-- App.tsx                # Route config and guards
|   `-- main.tsx               # App bootstrap
|-- docs/                      # Supplementary project docs
|-- PROJECT_DOCUMENTATION.md   # Extended project + API/test/deployment docs
`-- README.md
```

## 10) Test Cases

### Current Status

- Manual and scenario-based test cases are documented in `PROJECT_DOCUMENTATION.md`.
- Automated test tooling dependencies exist, but there is currently no dedicated `npm test` script.

### Recommended Validation Commands

```bash
npm run lint
npm run build
```

### Optional (if you add test files)

```bash
npx vitest
```

## 11) Deployment

This app is a static Vite build and can be deployed on Netlify, Vercel, Render, GitHub Pages, or any static host.

### Production Steps

1. Install dependencies: `npm ci` or `npm install`
2. Build: `npm run build`
3. Deploy the `dist/` folder
4. Configure SPA fallback so non-root routes serve `index.html`
5. Set `VITE_API_URL` in your hosting environment if using backend APIs

### Nginx SPA fallback example

```nginx
location / {
  try_files $uri /index.html;
}
```

## 12) Contributing Guidelines

Contributions are welcome.

1. Fork the repository
2. Create a feature branch (`feature/your-feature-name`)
3. Commit with clear, descriptive messages
4. Run lint/build checks before opening a PR
5. Open a pull request with summary, motivation, and testing notes

### Contribution Tips

- Keep changes focused and small
- Update docs for behavior or API contract changes
- Follow existing code style and folder conventions

## 13) License

No license has been specified yet.
Add your preferred license (for example, MIT) in a `LICENSE` file.

## 14) Contact Information

Maintainer: Md. Yeasin
Email: yeasin7y@gmail.com

---

## Additional Documentation

- `docs/OVERVIEW.md`
- `docs/SETUP.md`
- `docs/FEATURES.md`
- `docs/ARCHITECTURE.md`
- `docs/GITHUB.md`
- `PROJECT_DOCUMENTATION.md`
