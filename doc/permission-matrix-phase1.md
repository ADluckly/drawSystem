# Phase 1 Permission Matrix

## Roles

- `super`: full admin access, including account management.
- `admin`: business operation access without account management.
- `teacher`: daily teaching/check-in operation access without account management.

## Route Access

| Route | super | admin | teacher | Anonymous |
| --- | --- | --- | --- | --- |
| `/login` | Redirect to `/dashboard` when token is valid | Redirect to `/dashboard` when token is valid | Redirect to `/dashboard` when token is valid | Allow |
| `/dashboard` | Allow | Allow | Allow | Redirect to `/login` |
| `/admin/accounts` | Allow | Deny (`/403`) | Deny (`/403`) | Redirect to `/login` |
| `/403` | Allow | Allow | Allow | Allow |

## API Access

| API | super | admin | teacher | Anonymous |
| --- | --- | --- | --- | --- |
| `POST /api/auth/login` | Allow | Allow | Allow | Allow |
| `POST /api/auth/logout` | Allow | Allow | Allow | Allow |
| `GET /api/auth/me` | Allow | Allow | Allow | 401 |
| `POST /api/admin/bootstrap-super` | Allow when bootstrap key matches and no super exists | Allow when bootstrap key matches and no super exists | Allow when bootstrap key matches and no super exists | Allow when bootstrap key matches and no super exists |
| `GET /api/admin/accounts` | Allow | 403 | 403 | 401 |
| `POST /api/admin/accounts` | Allow (create admin/teacher only) | 403 | 403 | 401 |
| `PATCH /api/admin/accounts/:id/status` | Allow (cannot target super) | 403 | 403 | 401 |
| `PATCH /api/admin/accounts/:id/reset-password` | Allow (cannot target super) | 403 | 403 | 401 |

## Security Notes

- Middleware performs JWT verification and route-level role filtering.
- API handlers enforce server-side auth and role checks again.
- Session resolution checks database account `status`; disabled accounts lose access even with old tokens.
- Account mutation APIs record actor (`updatedBy`, `disabledBy`) and target account ID.
