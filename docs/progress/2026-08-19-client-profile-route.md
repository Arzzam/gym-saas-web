# 2026-08-19 — Client profile on its own route

- Client profile and progress moved off Member home onto **`/client/profile`**. Home stays invites + data sharing. Header nav: Home / Profile (`<Link>`, not a full reload).
- Mutations `revalidatePath('/client/profile')`. E2E hits the new route; home asserts the height form is not there.
