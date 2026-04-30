# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server at http://localhost:5173 (HMR enabled)
npm run build        # Production build → build/server/ and build/client/
npm run start        # Serve production build via react-router-serve
npm run typecheck    # Generate React Router types + TypeScript check
```

No test runner is configured.

## Architecture

This is a **full-stack React Router 7 (SSR) app** for towing service management ("GuinchoFácil"). SSR is enabled via `ssr: true` in `react-router.config.ts`.

**Stack:** React 19, React Router 7, TypeScript, TailwindCSS 4 + Bootstrap 5, Firebase Firestore, dnd-kit, Vite 6.

**Path alias:** `~/` resolves to `./app/` (configured in `tsconfig.json` and Vite).

## Key Directories

- `app/routes/` — Page-level route components. Each file maps to a URL:
  - `/` → `home.tsx`
  - `/novocliente` → `clientes.tsx`
  - `/novoservico` → `servicos.tsx`
  - `/veiculos` → `veiculos.tsx`
  - `/manutencao` → `planejamento.jsx`
- `app/components/` — Reusable UI components (mostly for the planning scheduler)
- `app/services/` — Data access layer; `firebase.ts` initializes Firestore; other files export CRUD functions per collection (`clientes`, `veiculos`, `servicos`)
- `app/store/plannerReducer.js` — `useReducer` reducer for the weekly schedule state in `planejamento.jsx`
- `app/utils/criarSemana.js` — Generates the weekly structure template used by the planner

## Data Layer

**Primary persistence:** Firebase Firestore (collections: `clientes`, `veiculos`, `servicos`).

Service functions return a discriminated union:
```ts
{ ok: true, docRef: DocumentReference } | { ok: false, error: any }
```

**Secondary:** Axios HTTP client in `app/services/api.tsx` pointing to `localhost:3001`, but this API is not heavily used yet.

## State Management

- **Forms** (clientes, veiculos, servicos routes): local `useState`
- **Planner** (`planejamento.jsx`): `useReducer` with `plannerReducer.js`
  - Actions: `SET_DATA`, `MOVER_FUNCIONARIO`, `REMOVER_FUNCIONARIO`, `ALTERAR_DEMANDA`

## Deployment

**Production platform:** Vercel.

- Use the `@vercel/react-router` adapter for SSR deployment (replaces `react-router-serve` in production).
- Environment variables (Firebase config, etc.) must be configured in the Vercel project dashboard — never committed to the repo.
- The `vercel.json` at the project root controls build and routing settings when needed.

## Push Notifications (PWA)

This app must operate as a **Progressive Web App (PWA)** to deliver push notifications to employees on Android and iOS — without requiring a native app or App Store submission.

**How it works:**
- A **Service Worker** (`public/sw.js`) runs in the background on the device, independent of the browser being open.
- **Firebase Cloud Messaging (FCM)** is the push delivery backend — it integrates with the existing Firebase project.
- Notifications appear in the device's native notification tray, can vibrate the device, and play a sound (subject to the device's silent mode).
- On **Android**: works via any browser (Chrome, Firefox, Edge) after the user grants notification permission.
- On **iOS 16.4+**: requires the user to install the app via Safari → "Add to Home Screen" once. After that, push notifications work identically to Android.

**Required files:**
- `public/manifest.json` — PWA manifest (app name, icons 192×192 and 512×512, theme color, `display: standalone`).
- `public/sw.js` — Service Worker that handles `push` events and calls `showNotification()`.
- FCM VAPID key stored as an environment variable (`VITE_VAPID_PUBLIC_KEY`) — never committed to the repo.

**Notification trigger flow:**
1. A manager registers a new service (`/novoservico`) and assigns an employee.
2. The `createServico` service function, after a successful Firestore write, sends a push notification to the assigned employee's FCM token.
3. The employee's device receives the notification even with the browser/app closed.

**`showNotification()` must always include:**
```js
self.registration.showNotification(title, {
  body,
  icon: '/icon-192.png',
  badge: '/badge.png',
  vibrate: [200, 100, 200],
  tag: 'novo-servico',
  requireInteraction: true,
})
```

**FCM token management:**
- Each employee's FCM token is stored in Firestore under their user document (`funcionarios/{uid}.fcmToken`).
- Tokens must be refreshed via `onTokenRefresh` and updated in Firestore automatically.
- Never hard-code FCM tokens.

---

## Development Preferences

These are firm preferences that must be followed in every code change or new file.

### TypeScript — always type everything

- All new files must be `.tsx` or `.ts`. Never create `.jsx` or `.js` files.
- When editing existing `.jsx`/`.js` files, migrate them to `.tsx`/`.ts` unless the change is trivial.
- Every variable, function parameter, return type, and state value must have an explicit type annotation.
- Define `interface` or `type` for every object shape — never use `any`. Use `unknown` + narrowing when the shape is truly dynamic.
- Firestore documents must have a typed interface matching their collection schema (e.g. `interface Cliente { id: string; nome: string; ... }`).
- Prefer `interface` for object shapes and `type` for unions/aliases.

### React Router 7

- Use file-based routing under `app/routes/`. Do not create ad-hoc `<Route>` trees.
- Use `loader` / `action` exports for server-side data fetching and mutations — avoid `useEffect` + fetch for data that belongs in a loader.
- Type loader return values with `Route.LoaderArgs` and `Route.ActionArgs` from the generated types in `.react-router/types/`.
- Use `useFetcher` for non-navigating form submissions (e.g. inline edits).
- Links must use `<Link>` or `<NavLink>` from `react-router`, never plain `<a>` for internal navigation.

### Firebase / Firestore

- All Firestore access goes through `app/services/`. Never import `db` directly in route or component files.
- Service functions must return the discriminated union `{ ok: true; data: T } | { ok: false; error: unknown }`.
- Always type document snapshots: use `doc.data() as MyInterface` only after defining the interface.
- Prefer `serverTimestamp()` for date fields; never store `new Date()` directly.
- Use `onSnapshot` only when real-time updates are necessary; prefer one-shot `getDoc`/`getDocs` in loaders.

### UI — Bootstrap + Tailwind

- Bootstrap 5 component classes (grid, cards, modals, buttons) are fine for layout and interactive components.
- Tailwind utility classes are preferred for spacing, color, and sizing adjustments on top of Bootstrap.
- Bootstrap Icons (`bi-*`) are the icon library — do not add other icon libraries.
- Do not write raw inline `style={{}}` attributes; use Tailwind classes instead.
- Responsive design is required: always consider mobile layout (`col-12 col-md-6`, `sm:` Tailwind prefixes, etc.).
- Drag-and-drop in the planner uses **dnd-kit** (`@dnd-kit/core`, `@dnd-kit/sortable`).

### Mobile-First UX (phones and tablets)

This app is primarily used on mobile devices. Every UI change must be designed and tested for small screens first, then adapted for larger screens.

**Layout and spacing**
- Default to full-width (`col-12`) columns; add breakpoints (`col-md-*`) only when the wider layout genuinely improves the experience.
- Use generous vertical padding/margins (`py-3`, `mb-4`) — touch targets need room.
- Avoid horizontal scroll at any viewport width; wrap or stack elements instead.
- Prefer vertical stacking of form fields and action buttons; never place multiple inputs side by side on mobile.

**Touch targets**
- All interactive elements (buttons, links, inputs, selects) must be at least **44 × 44 px** — use `min-h-[44px]` and `px-4 py-2` as a baseline.
- Add adequate spacing between adjacent tap targets so users don't mis-tap (`gap-3` minimum between buttons).
- Avoid hover-only interactions; all actions must be reachable by tap.

**Typography and readability**
- Minimum body font size is `1rem` (16 px); never go below `0.875rem` (14 px) even for secondary text.
- Line lengths should not exceed ~70 characters on tablet; on phone they are naturally constrained.
- Prefer high-contrast text/background combinations — do not rely solely on color to convey state.

**Navigation**
- Persistent bottom navigation bar or hamburger menu is preferred over top-only navbars for mobile.
- Keep primary actions reachable with one thumb (bottom half of screen).
- Modals and drawers must be dismissible by tapping outside or a clearly visible close button.

**Forms**
- Use appropriate `type` attributes on inputs (`type="tel"`, `type="email"`, `type="number"`) to trigger the correct mobile keyboard.
- Group related fields in clearly separated sections; avoid long, dense forms.
- Show inline validation feedback immediately below each field, not in a distant alert.

**Performance**
- Lazy-load images and heavy components; the target network is mobile (3G/4G).
- Avoid large layout shifts (CLS) — reserve space for images and async content.

### General Code Style

- No comments unless the *why* is non-obvious (hidden constraint, workaround, subtle invariant).
- Always add `console.log` to every CRUD service function return value — log both success and error results so API/Firestore issues are easy to diagnose. Example: `console.log('[createCliente] result:', result); return result;`
- Keep components focused: if a component exceeds ~150 lines, consider splitting it.
- Prefer named exports over default exports for components and utilities.
- Use `const` and arrow functions for component definitions: `const MyComponent = () => { ... }`.
- Portuguese is the language of the UI and variable/function names in domain logic (e.g. `cliente`, `veiculo`, `demanda`). Internal React/TypeScript code follows English conventions (hooks, handlers, utilities).
