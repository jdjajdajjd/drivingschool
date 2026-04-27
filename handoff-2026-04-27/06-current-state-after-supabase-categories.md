# Current State After Supabase Category Persistence

Date: 2026-04-27

## What changed in this pass

- Added `enabled_category_codes` to the Supabase school model.
- Updated the school settings RPC so category settings survive reload and Supabase sync.
- Updated public school mapping so the student page receives saved school categories from Supabase.
- Added instructor category editing in the admin instructor modal.
- Updated the instructor upsert RPC so instructor categories persist to Supabase.
- Changed Supabase client startup so a missing frontend env no longer white-screens the whole app.
- Rewrote `README.md` and `PROJECT_BRIEF.md` to match the real current product state.

## Verification

- `npm run typecheck` passes.
- `npm run build` passes.

## Important blocker

The SQL patch was not applied from this machine because the direct Supabase database host resolves only to IPv6, and the local network cannot connect to IPv6:

```text
db.onpeiyzoirtpztulabxy.supabase.co -> IPv6 only
connect ENETUNREACH
```

The pooler region was also not discovered from the available credentials.

Before deploying the latest frontend, run the SQL in Supabase:

1. Open Supabase dashboard.
2. Open SQL Editor.
3. Open `supabase/DRIVEDESK_FULL_SETUP.sql`.
4. Copy only the block between `-- BEGIN DRIVEDESK_SAFE_PATCH` and `-- END DRIVEDESK_SAFE_PATCH`.
5. Paste that block into SQL Editor and run it.

Do not paste the whole file into a live database. The lower full-reset section drops and recreates demo tables.

After SQL is applied, deploy/push the frontend.

## Why deploy should wait

The new frontend sends these new RPC parameters:

- `p_enabled_category_codes`
- `p_categories`

If the frontend is deployed before the database functions are updated, admin save actions for school settings and instructors can fail.
