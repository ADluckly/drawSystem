---
applyTo: "**/{app,api,server,backend,services,lib,models,tests}/**/*.{test,spec}.{js,jsx,ts,tsx}"
description: "Use when editing automated tests. Covers phased behavior verification, RBAC, consistency checks, and maintainable assertions."
---

# Testing Instructions

Apply these rules when creating or updating tests.

- Test observable behavior instead of implementation details where possible.
- Cover success cases, failure cases, and important edge cases.
- Keep fixtures and mocks minimal and easy to understand.
- Avoid brittle assertions tied to incidental formatting or timing.
- Update tests when behavior changes instead of preserving outdated expectations.
- Prefer fast tests and isolate slow integration scenarios clearly.
- Include explicit role-matrix coverage for super, admin, and teacher at both route and API levels.
- Cover lesson consistency scenarios end-to-end: recharge increments, sign decrements, leave does not decrement.
- Include same-day duplicate sign rejection tests and verify idempotent behavior under retries.
- For statistics and exports, assert parity with list filters and query conditions.
- Add regression tests for token expiry, disabled accounts, and unauthorized access attempts.

Adjust applyTo if test files move to a different folder layout or naming scheme.