# Copilot Instructions

Use this file for repository-wide rules only.

## Scope

- Put global rules here.
- Put area-specific rules in `.github/instructions/*.instructions.md`.
- Keep this file short so only high-signal constraints are always active.

## Global Rules

- Keep changes minimal, focused, and easy to review.
- Prefer clear, maintainable solutions over clever implementations.
- Preserve existing conventions when the codebase establishes them.
- Fix root causes instead of layering workarounds when practical.
- Validate inputs and handle failures explicitly.
- Do not hardcode secrets, tokens, or credentials.
- Add or update tests when behavior changes.
- Update docs when setup, commands, or behavior change.

## Project Baseline

- This project targets Next.js 15 App Router with Ant Design, MongoDB, Mongoose, Zustand, and JWT middleware auth.
- Follow the phased delivery model defined by prompts: Phase 0 (foundation), Phase 1 (auth and RBAC), Phase 2 (MVP business loop), Phase 3 (enhancements), Phase 4 (quality and release).
- Prefer implementations that unblock Phase 2 MVP first before adding optional enhancements.

## Security and Access

- Treat route protection and API protection as separate controls; never rely on UI-only permission checks.
- Enforce role-based access for super, admin, teacher consistently across menu visibility, page access, and API handlers.
- Sensitive operations must include actor and target audit fields where practical.

## Data and Consistency

- Student lesson counters must stay consistent after recharge and sign flows; avoid partial writes.
- For same-day sign deduplication, use both business validation and database-level safeguards.
- Reuse shared query-condition builders for list views, statistics, and exports to keep data consistent.

## Working Style

- If the repository is still being bootstrapped, propose structure that matches the chosen stack before creating large amounts of code.
- When requirements are ambiguous, clarify the target outcome before making irreversible changes.
- Avoid adding dependencies unless they provide clear value.
- Keep plans and tasks aligned to the active phase instead of implementing full-scope features in one pass.

## Split Strategy

- Use `.github/instructions/frontend.instructions.md` for UI, accessibility, and interaction rules.
- Use `.github/instructions/backend.instructions.md` for API, validation, and server-side rules.
- Use `.github/instructions/testing.instructions.md` for test structure and coverage expectations.
- Add more files only when a rule clearly applies to one area instead of the whole repository.