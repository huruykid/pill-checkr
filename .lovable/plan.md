

## Plan: Make huruydesigns@gmail.com an Admin

**What needs to happen:**

1. Look up the user ID for `huruydesigns@gmail.com` in the `profiles` table
2. Insert a row into `user_roles` granting them the `admin` role

**Technical steps:**
- Query `profiles` for the user's UUID by email
- Insert into `user_roles (user_id, role)` with that UUID and `'admin'`

This is a single data operation using the insert tool — no schema changes needed.

