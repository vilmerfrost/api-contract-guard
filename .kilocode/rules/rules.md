# Project Tech Stack & Rules

## 1. Next.js 16+ (App Router) Guidelines
- **Server Components by Default:** Always default to Server Components. Only add `"use client"` when absolutely necessary (hooks, event listeners, browser APIs).
- **Data Fetching:**
  - Use `fetch` with `cache: 'force-cache'` or `next: { revalidate: 3600 }` for static data.
  - Use `no-store` for real-time data.
  - **Do not** use `useEffect` for initial data fetching; do it in the Server Component.
- **Routing:** Use `next/link` for navigation. Use `useRouter` hook only for programmatic navigation in Client Components.
- **Forms:** Prefer Server Actions (`"use server"`) for form submissions over API routes where possible.

## 2. Supabase Integration
- **Client Creation:**
  - Always use the helper functions in `@/utils/supabase/server` (for Server Components) and `@/utils/supabase/client` (for Client Components).
  - *Never* hardcode the Supabase URL/Anon Key; strictly use `process.env.NEXT_PUBLIC_SUPABASE_URL` and `process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- **Type Safety:**
  - Always import `Database` from `@/types/supabase`.
  - Generics usage: `supabase.from<"table_name">('table_name').select('*')`.
- **Row Level Security (RLS):**
  - Assume RLS is enabled. Always handle errors if a user lacks permission.

## 3. Vercel Deployment & Environment
- **Edge Runtime:** If writing API routes (Route Handlers), prefer the Edge runtime if no Node.js specific APIs are needed: `export const runtime = 'edge'`.
- **Environment Variables:**
  - Access public vars via `process.env.NEXT_PUBLIC_...`
  - Access secret vars via `process.env...` (Server only).
- **Logging:** Use `console.error` clearly for Vercel logs to catch build/runtime failures.

## 4. Coding Style (TypeScript)
- **Strict Mode:** No `any`. Use `unknown` if unsure and narrow the type.
- **Interfaces:** Use `interface` for object definitions, `type` for unions/primitives.
- **Exports:** Use Named Exports for components (`export function MyComponent`), not default exports.