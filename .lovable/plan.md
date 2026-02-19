
## Root Cause: Auth + Admin Race Condition

The stall happens because of a conflict between two concurrent async operations in `useAuth.tsx`:

1. `supabase.auth.getSession()` — fetches the current session, then awaits `fetchIsAdmin()` (a database query), then calls `setLoading(false)`
2. `supabase.auth.onAuthStateChange()` — fires **immediately on mount** (Supabase always fires `INITIAL_SESSION` event synchronously), and also calls `setLoading(false)` — but it also triggers `fetchIsAdmin()` for the same user at the same time

This results in two simultaneous `fetchIsAdmin` calls racing each other. More critically, in some timing scenarios `onAuthStateChange` fires its `setLoading(false)` **before** `getSession`'s `fetchIsAdmin` resolves — causing the app to briefly show as non-admin, or the UI appears stuck waiting for the admin check.

The real problem is that **both paths run in parallel** and both set state independently, leading to unpredictable ordering.

## The Fix

Supabase's own documentation recommends using `onAuthStateChange` as the **single source of truth** and NOT calling `getSession` separately in the same hook. The `INITIAL_SESSION` event from `onAuthStateChange` covers the initial load case.

The corrected pattern:

- Remove the separate `getSession()` call entirely
- Use `onAuthStateChange` exclusively, which fires `INITIAL_SESSION` on mount with the current session (or null if not logged in)
- Set `loading: false` only **after** `fetchIsAdmin` completes (for the initial event) or immediately (for sign-out)
- This eliminates the race condition entirely — there's only one code path

## Files to Change

### `src/hooks/useAuth.tsx`

Remove the standalone `supabase.auth.getSession()` block. Rely solely on `onAuthStateChange`, which will fire with event `INITIAL_SESSION` on mount. The listener already handles `fetchIsAdmin` and `setLoading(false)` correctly.

The new logic flow:

```text
Mount
  └─> onAuthStateChange fires with INITIAL_SESSION
        ├─> session exists?
        │     ├─> YES: fetchIsAdmin() → setIsAdmin() → setLoading(false)
        │     └─> NO:  setIsAdmin(false) → setLoading(false)
        └─> (subsequent SIGNED_IN / SIGNED_OUT events work identically)
```

The `refreshAuth` function is kept as-is since it's used after `claim_admin` RPC to re-check the role without waiting for an auth event.

## Technical Detail: Why This Works

`onAuthStateChange` in Supabase JS v2 fires `INITIAL_SESSION` synchronously during the subscribe call, passing the cached session from `localStorage` if one exists. So there's no need for a separate `getSession()` — the listener handles both cases:
- **Logged in**: fires with the session immediately, `fetchIsAdmin` runs once
- **Logged out**: fires with `null` session, sets `isAdmin: false` and `loading: false` immediately (no DB call)

This is also why the current code stalls — both `getSession` and the `INITIAL_SESSION` event race to call `fetchIsAdmin` and `setLoading(false)` at the same time.
