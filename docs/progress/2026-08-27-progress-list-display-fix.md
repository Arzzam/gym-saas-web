# 2026-08-27 — Progress list display fix

- Root causes addressed: ProfileMenu crashed (`DropdownMenuLabel` outside `Menu.Group`); staff/client panels treated missing query cache as empty/not-shared; progress log keys may arrive snake_case / numeric strings.
- Fixes: wrap menu label in `DropdownMenuGroup`; normalize camel/snake log fields in adapter; pass RSC `initial` GrantAware into staff Progress panel; never map `!data` → “not shared”.
- Server logs `[profile] staff progress-logs { itemCount, … }` on each staff list for diagnosis.
