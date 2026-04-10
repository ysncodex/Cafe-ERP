# Setup & Running

## Requirements
- Node.js (LTS recommended)
- npm

## Install
```bash
npm install
```

## Run dev server
```bash
npm run dev
```

## Production build
```bash
npm run build
```

## Preview production build
```bash
npm run preview
```

## Environment variables
The API layer uses this environment variable when present:
- `VITE_API_URL` (default: `http://localhost:3000/api`)

Create a `.env` file at the project root if you want to point to a backend:
```env
VITE_API_URL=http://localhost:3000/api
```

## Notes
- Most app state is persisted locally in the browser via localStorage.
- Authentication token is stored as `authToken` in localStorage.
