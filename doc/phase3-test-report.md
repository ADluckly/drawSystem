# Phase 3 Test Report

## Automated Checks

- `npm run typecheck`: pass
- `npm run lint`: pass
- `npm test`: pass (6 files, 14 tests)
- `npm run build`: pass

## Covered Scenarios

### Integration

- Batch sign route returns partial success with explicit failure list.
- Recharge route keeps lesson ledger update behavior for authorized users.
- Sign route preserves duplicate protection and leave non-deduction behavior.

### Unit

- RBAC matrix includes `/settings` access boundaries (super/admin allow, teacher deny).
- Existing lesson and student filter invariants remain intact.

## Manual Verification Checklist

- Batch sign one class with mixed student balances and confirm `successCount`/`failureCount` and failure reasons.
- Compare dashboard summary values with sampled recharge/sign/student records for selected day and month windows.
- Export recharges/signs/students with same filters as list pages and verify parity.
- Modify default warning threshold in `/settings` and confirm students warning state updates immediately.