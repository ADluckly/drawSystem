# Phase 2 Test Report

## Automated Checks

- `npm run lint`: pass
- `npm run typecheck`: pass
- `npm test`: pass (5 files, 13 tests)
- `npm run build`: pass

## Covered Scenarios

### Unit

- Recharge increases lesson totals and left count.
- Attend sign decrements lesson left and increments used.
- Leave sign does not change lesson counters.
- Insufficient lesson sign throws clear error.
- Student filter query builder parity for keyword/mobile/lesson status.
- RBAC matrix assertions for super/admin/teacher route and menu visibility.

### Integration (API-level)

- Recharge route rejects unauthorized access.
- Recharge route updates student lesson ledger with transaction workflow.
- Sign route rejects duplicate same-day sign.
- Sign route records leave without lesson decrement.

## Manual Verification Recommendations

- Use two browser sessions to verify role-based menu and route visibility.
- Verify same student same day duplicate sign returns `409 DUPLICATE_SIGN`.
- Verify recharge then sign then leave sequence on one student detail page.
