# Current Main Stack

- Next.js 16.3.4, React 19.2.8, TypeScript 5, App Router.
- Bun 1.4.0 as runtime and package manager.
- Tailwind CSS 4 with shadcn-style UI primitives and utility helpers.
- React Hook Form (with shadcn's Field component)
- `cn` for class merging, re-exported from `lib/utils/cn.ts`. It replaces
  `clsx` + `tailwind-merge` with one dependency and the same API.
- tRPC v11 + TanStack React Query for API and client data flow.
- Better Auth
- PostgreSQL via Neon serverless + Drizzle ORM + Drizzle Kit for DB and migrations.
- AWS S3 via Bun S3 client for asset storage.
