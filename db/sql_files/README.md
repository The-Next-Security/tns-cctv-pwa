# SQL bundle

Canonical MySQL 8 SQL_FILES layout requested for the data model workstream.

Order of execution:
1. `00_setup.sql`
2. `01_ddl.sql`
3. `02_indices.sql`
4. `03_seed_inserts.sql`
5. `04_procedures.sql`
6. `05_functions.sql`
7. `06_events.sql`
8. `07_logs.sql`

Notes:
- `01_ddl.sql` keeps the core table graph and foreign keys.
- `02_indices.sql` isolates non-key index creation for easier tuning.
- `07_logs.sql` carries the API audit log table used by the contract tests.
- Seed data is intentionally minimal and safe for local dev.
