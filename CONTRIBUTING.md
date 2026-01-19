# Collaboration guide (teaching vs non-teaching)

- **Ownership**
  - Teaching: `vite-admin/server/routes/teaching/**`, `vite-admin/server/services/teaching/**`, `vite-admin/hirewise-admin-vite/src/components/Teaching/**`
  - Non-teaching: `vite-admin/server/routes/nonteaching/**`, `vite-admin/server/services/nonteaching/**`, `vite-admin/hirewise-admin-vite/src/components/NonTeaching/**`
  - Shared/common code stays in existing shared folders (e.g., `config`, `lib`, `components/Components`).
- **Legacy shims**
  - Existing imports still point at `routes/*.js`, `services/*.js`, and `src/components/Faculty*.jsx`; these now re-export the teaching implementations. Update implementations in the teaching/non-teaching folders and keep the shims thin.
- **Adding new modules**
  - Add new routers/services in your domain folder, then (if needed) add a tiny shim in the legacy path so server wiring stays stable.
  - For frontend, add new pages/layouts/components inside your domain folder; add a shim only if existing routes need to import from the old path.
- **Branching**
  - Use domain-prefixed branches to avoid collisions (e.g., `feature/teaching-*`, `feature/nonteaching-*`), then PR into `main`.
