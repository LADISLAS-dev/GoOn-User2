# Guest Mode Implementation Plan

## Overview
Allow users to browse the app without authentication. Prompt for account creation only when attempting actions that require a user account (booking, messaging, dashboard, profile, settings, viewing ads on discover details).

---

## Architecture

### Current State
- `AuthContext` manages `user`, `isLoading`, `isAuthenticated`
- `app/index.tsx` (entry) redirects based on auth: authenticated → `(tabs)`, unauthenticated → `(auth)/login`
- `app/(tabs)/_layout.tsx` checks `isAuthenticated` and redirects to login if not
- All screens assume the user is authenticated

### Target State
- Guest mode: user can access `(tabs)` without authentication
- AuthContext gains a `isGuest` boolean
- Protected actions show an `AuthPromptModal` instead of blocking navigation
- Entry point allows guests straight into the app

---

## Files to Modify/Create

### 1. `contexts/AuthContext.tsx` — Add guest mode support
- Add `isGuest: boolean` to the context
- When no user is logged in, set `isGuest = true` instead of treating as "not authenticated"
- `isAuthenticated` = `user !== null && !isGuest`
- Export both `isAuthenticated` and `isGuest`

### 2. `app/index.tsx` — Allow guest entry
- Guest users go to `(tabs)` instead of `(auth)/login`
- Only redirect to login when user explicitly wants to sign in

### 3. `app/(tabs)/_layout.tsx` — Remove auth guard
- Stop redirecting unauthenticated users to login
- Allow guest navigation to all tabs

### 4. **NEW** `components/AuthPromptModal.tsx` — Reusable auth gate modal
- A modal that explains the feature requires an account
- Shows "Sign In" and "Create Account" buttons, plus "Maybe later" dismiss
- Configurable: title, description, feature name
- Used by all protected actions

### 5. `app/(tabs)/discover.tsx` — Already works for guests (browsing)
- No changes needed — discover listing already works without auth

### 6. `app/discover/[id].tsx` — Gate ad viewing behind auth
- When guest taps "Voir la publicité", show AuthPromptModal
- Authenticated users see ads as before

### 7. `app/booking.tsx` — Gate booking behind auth
- On mount, if guest, show AuthPromptModal
- Block the booking flow until authenticated

### 8. `app/messages.tsx` — Gate messages behind auth
- On mount, if guest, show AuthPromptModal

### 9. `app/(tabs)/dashboard.tsx` — Gate dashboard behind auth
- On mount, if guest, show AuthPromptModal

### 10. `app/(tabs)/profile.tsx` — Gate profile behind auth
- On mount, if guest, show AuthPromptModal

### 11. `app/(tabs)/settings.tsx` — Gate settings behind auth
- On mount, if guest, show AuthPromptModal

### 12. `app/(auth)/login.tsx` — Add "Continue as Guest" option
- Add a button to go back to the app as a guest
- Handles the case where a guest lands on login

### 13. `app/(auth)/register.tsx` — Add "Continue as Guest" option
- Same as login

---

## AuthPromptModal Design

```
┌─────────────────────────────────┐
│        🔒                       │
│   Create an account to...       │
│   {feature description}         │
│                                 │
│  • Save your preferences        │
│  • Access all features          │
│  • Track your activity          │
│                                 │
│  ┌───────────────────────────┐  │
│  │    CREATE ACCOUNT          │  │
│  └───────────────────────────┘  │
│  ┌───────────────────────────┐  │
│  │    SIGN IN                 │  │
│  └───────────────────────────┘  │
│                                 │
│       Maybe Later               │
└─────────────────────────────────┘
```

---

## Implementation Order
1. AuthContext changes (foundation)
2. AuthPromptModal component (shared UI)
3. Entry point + tab layout changes (routing)
4. Gate each protected screen one by one
5. Login/Register "Continue as Guest" buttons
6. Test the full flow

---

## Edge Cases
- **Network error during guest browsing**: graceful degradation, cached data
- **Deep linking to protected page as guest**: show modal, back navigation works
- **Guest tries to access protected API**: interceptor shows modal instead of error
- **Transition guest → authenticated**: modal closes, data refreshes
- **Transition authenticated → guest (logout)**: clear state, stay on discover
