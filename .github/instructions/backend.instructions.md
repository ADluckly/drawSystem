---
applyTo: "**/{api,server,backend,services,lib,models}/**/*.{js,ts,mjs,cjs}"
description: "Use when editing API, models, and service-layer code. Covers validation, RBAC, consistency, security, and efficiency."
---

# Backend Instructions

Apply these rules when working on server-side code.

- Validate request data and external input at system boundaries.
- Return consistent error responses and avoid leaking internal implementation details.
- Enforce least-privilege defaults for file access, credentials, and external integrations.
- Keep business logic separate from transport concerns where practical.
- Prefer efficient algorithms and avoid unnecessary network, I/O, or database work.
- Add logging that helps diagnose failures without exposing secrets or personal data.
- Enforce JWT verification and role checks at API handlers even when route middleware exists.
- Treat super, admin, and teacher as strict RBAC boundaries and deny by default.
- Keep student lesson mutations atomic for recharge and sign flows to prevent partial updates.
- For same-day sign deduplication, implement both business-level validation and database safeguards.
- Use shared query-condition builders across list, stats, and export APIs to keep result consistency.
- Record actor and target metadata for sensitive operations such as account changes and lesson adjustments.

Adjust applyTo if backend source roots move outside api, server, backend, services, lib, or models.