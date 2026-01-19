# Teaching routes

- Teaching-side Express routers live here.
- Legacy shims exist at `routes/*.js` to keep current imports working; edit routers in this folder instead of the shims.
- Mount new endpoints as needed and, if you add a new router, expose it via a small shim in `routes/` so server.js stays stable.
