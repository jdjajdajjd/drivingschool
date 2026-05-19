# Tenant Security Checklist

## Manual Tests

- School A admin cannot open School B students, schedule, payments, or documents.
- Staff role without manage permissions cannot create students or edit settings.
- Super-admin routes are not available from regular school admin access.
- Demo workspace data does not appear in workspace production mode.
- Student login by phone only opens the matching student cabinet.

## Code/Data Checks

- Every Supabase read/write path includes `school_id` or equivalent tenant scope.
- Booking creation validates slot availability and rejects duplicate active booking for the same slot.
- Admin mutations use `assertAdminPermission` or a stricter server-side equivalent.
- Local fallback storage is not treated as a production security boundary.

## Launch Decision

- Closed pilots can proceed after manual tenant tests pass.
- Public cold sales should wait for stronger auth/session handling and final legal review.
