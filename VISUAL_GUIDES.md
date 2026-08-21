# 📊 Visual Guides

## 1. Notification Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     USER'S APP (iOS/Android)                     │
│                    Running EAS Build on Device                   │
│                                                                   │
│  1. Open app & accept notification permission                   │
│  2. Register push token: ExpoPushToken[xyz...]                  │
│  3. Send to backend via API                                      │
└────────────────────────┬────────────────────────────────────────┘
                         │
                    [POST /users/:id/push-token]
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                      BACKEND (Node.js)                          │
│                                                                   │
│  1. Receive token in updatePushToken endpoint                   │
│  2. Validate: starts with ExpoPushToken[? ✅                    │
│  3. Store in MongoDB in expoPushTokens array                    │
│  4. Respond with success                                         │
└────────────────────────┬────────────────────────────────────────┘
                         │
                ┌────────┴────────┐
                │                 │
        [Token Stored]    [When Notification Sent]
                │                 │
                ▼                 ▼
        ┌─────────────┐   ┌──────────────────────┐
        │  MongoDB    │   │ Notification Created │
        │   Users     │   │ status: "pending"    │
        │             │   │ receiverId: xyz      │
        │ expoPushTo- │   └──────────┬───────────┘
        │ kens: [     │             │
        │   "Expo..." │     ┌───────┴────────────────────────────┐
        │ ]           │     │  Extract tokens from receiver user │
        │             │     │  Count: 1 (ExpoPushToken[xyz])    │
        └─────────────┘     │                                     │
                            │  Create Promise.allSettled()       │
                            │  to send to all tokens              │
                            └───────────┬────────────────────────┘
                                        │
                    ┌───────────────────┴───────────────────┐
                    │                                       │
                    ▼                                       ▼
        ┌───────────────────────┐       ┌───────────────────────┐
        │   sendExpoPushNotif   │       │  Promise.allSettled   │
        │   ication() x1        │       │  Waits for all results│
        │                       │       │                       │
        │ to: ExpoPushToken[...]│       │ Success? ✅           │
        │ title: "..."          │       │ Failed?  ❌           │
        │ body: "..."           │       │                       │
        │ data: {type, ...}     │       │ Update notification   │
        └───────────┬───────────┘       │ status to "sent" or   │
                    │                   │ "failed"              │
                    └──────────┬────────┘                       │
                               │                               │
                               ▼                               │
        ┌───────────────────────────────────────────────────┐  │
        │         EXPO PUSH SERVICE API                      │  │
        │   https://exp.host/--/api/v2/push/send           │  │
        │                                                    │  │
        │  1. Receive push message                          │  │
        │  2. Validate token: ExpoPushToken[...] ✅         │  │
        │  3. Return: { status: 'ok', id: 'ticket-id' }   │  │
        │  4. Queue delivery to APNS/FCM                    │  │
        └───────────┬─────────────────────────────────────┬─┘  │
                    │                                     │    │
        ┌───────────▼──┐                          ┌──────▼───┐│
        │    APNS      │                          │   FCM    ││
        │  (Apple)     │                          │ (Google) ││
        └───────────┬──┘                          └──────┬───┘│
                    │                                     │   │
        ┌───────────▼──────────────────────────────────┬─▼──┐│
        │                                              │   ││
        │           DEVICE NOTIFICATION RECEIVED       │   ││
        │                                              │   ││
        │  User's phone gets notification badge       │   ││
        │  Lock screen shows notification             │   ││
        │  User taps → App opens with data            │   ││
        │                                              │   ││
        └──────────────────────────────────────────────┴───┘│
                                                             │
        ┌────────────────────────────────────────────────┐  │
        │  Notification Status Updated in DB            │  │
        │  status: "sent" ✅                            │◄──┘
        │  errorMessage: null                           │
        │  (Or status: "failed" if error)               │
        └────────────────────────────────────────────────┘
```

## 2. Database Schema

```
┌─────────────────────────────────────────┐
│              USERS Collection            │
├─────────────────────────────────────────┤
│ _id                                     │
│ firebaseUid                             │
│ name                                    │
│ email                                   │
│ avatar                                  │
│                                         │
│ ✨ PUSH TOKENS ✨                      │
│ ├─ expoPushToken        (current)      │
│ ├─ expoPushTokens[]     (all)          │
│ │  ├─ "ExpoPushToken[.]" (Prod)        │
│ │  └─ "ExponentPushToken[.]" (Dev)     │
│ │                                      │
│ └─ expoPushRegistrations[] (detailed)   │
│    ├─ token: "ExpoPushToken[.]"        │
│    ├─ appOwnership: "standalone"       │
│    ├─ executionEnvironment: "standalone"
│    └─ updatedAt: 2026-07-15T...        │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│         NOTIFICATIONS Collection         │
├─────────────────────────────────────────┤
│ _id                                     │
│ senderId (ref: User)                    │
│ receiverId (ref: User)                  │
│ title                                   │
│ message                                 │
│ type: "message" | "appointment"         │
│                                         │
│ ✨ STATUS TRACKING ✨                  │
│ ├─ status: "pending" | "sent" | "failed"
│ ├─ errorMessage: "DeviceNotRegistered"  │
│ ├─ read: true/false                     │
│                                         │
│ ✨ METADATA ✨                         │
│ ├─ companyId (optional)                 │
│ ├─ appointmentId (optional)             │
│ ├─ createdAt: 2026-07-15T...           │
│ └─ updatedAt: 2026-07-15T...           │
└─────────────────────────────────────────┘
```

## 3. Status Transitions

```
User Sends Notification
        │
        ▼
Notification Created
   status: "pending"
        │
        ├─── Extract receiver push tokens
        │
        ▼
   Send to Expo Push API
   (Promise.allSettled)
        │
        ├─────────┬──────────────┐
        │         │              │
        ▼         ▼              ▼
    Success  Partial Fail   All Failed
        │         │              │
        ▼         ▼              ▼
   Update to  Update to    Update to
   "sent"     "sent"       "failed"
   (✅)       (✅)         (❌)
        │         │              │
        └────┬────┴─────┬────────┘
             │          │
             ▼          ▼
     Device Receives  No Device
     or Queued       Notification
        │
        ▼
   User Sees
   Notification
        │
        ▼
   User Taps
        │
        ▼
   App Opens
   with Data

Legend:
pending  = Waiting to send
sent     = Successfully sent
failed   = Send failed (check errorMessage)
```

## 4. Token Decision Tree

```
App Starts
    │
    ▼
Is Physical Device?
    ├─ NO  → ExponentPushToken (Expo Go) or None
    │
    └─ YES → Check build type
            │
            ├─ Expo Go
            │  └─ ExponentPushToken[...]
            │
            └─ EAS Build (production)
               └─ ExpoPushToken[...]
                    │
                    ├─ iOS TestFlight/Store
                    │  └─ Valid for APNS
                    │
                    └─ Android Play Store
                       └─ Valid for FCM

Backend Selection:
    │
    ├─ If both token types available
    │  └─ Prefer: ExpoPushToken (modern)
    │
    ├─ If only one type
    │  └─ Use: That one
    │
    └─ If none
       └─ Error: "No tokens available"
```

## 5. Notification Status Timeline

```
Timeline  │ Status   │ Location    │ Backend Action
──────────┼──────────┼─────────────┼──────────────────────
T+0s      │ pending  │ DB          │ Created, extracting tokens
T+1s      │ pending  │ DB          │ Sending to Expo...
T+2s      │ sent     │ DB          │ ✅ Expo acknowledged
T+3s      │ sent     │ APNS/FCM    │ Routing to device
T+5s      │ sent     │ Device      │ Delivered to phone
T+6s      │ read     │ DB          │ User tapped → notification read

OR if error:

T+1s      │ pending  │ DB          │ Sending to Expo...
T+2s      │ failed   │ DB          │ ❌ Expo error, errorMessage set
                     │             │    (e.g., "DeviceNotRegistered")
```

## 6. Success Indicators

```
✅ EVERYTHING WORKING:

    diagnosePush.js:
    └─ "Total users with push tokens: 1"
    └─ "expoPushToken: ExpoPushToken[xyz...]"

    testProductionPush.js:
    └─ "✅ [0] Production (EAS)"
    └─ "✅ Success: 1/1"

    Backend logs:
    └─ "[PUSH] Notification status updated: { status: 'sent' }"

    Device:
    └─ Notification appears
    └─ Notification badge shows count

    MongoDB:
    └─ db.notifications.findOne()
    └─ { ..., status: "sent", errorMessage: null }

❌ PROBLEM SIGNS:

    diagnosePush.js:
    └─ "Total users with push tokens: 0" ← No tokens!

    testProductionPush.js:
    └─ "❌ Success: 0/1" ← Test failed

    Backend logs:
    └─ "[PUSH] No tokens available" ← Token lost

    Device:
    └─ No notification appears

    MongoDB:
    └─ { ..., status: "pending", ... } ← Stuck!
    └─ { ..., status: "failed", errorMessage: "..." }
```

## 7. Token Type Identifier

```
ExponentPushToken[E_...]
└─ Starts with: "ExponentPushToken"
└─ Type: Legacy
└─ Environment: Expo Go only
└─ Reliability: Medium (may be disabled)
└─ Recommendation: Use for development only

ExpoPushToken[E_...]
└─ Starts with: "ExpoPushToken"
└─ Type: Modern/Production
└─ Environment: EAS builds (iOS/Android)
└─ Reliability: High
└─ Recommendation: Preferred for production
```

## 8. Monitoring Dashboard View

```
╔═══════════════════════════════════════════════════════════════╗
║               NOTIFICATION SYSTEM HEALTH                      ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  Users with Push Tokens:          ▓▓▓▓░░░░░░  45/100        ║
║  Production Tokens (ExpoPushToken):                           ║
║                                    ▓▓▓▓░░░░░░  40/100        ║
║  Dev Tokens (ExponentPushToken):                              ║
║                                    ▓░░░░░░░░░   5/100        ║
║                                                               ║
║  Recent Notifications:                                        ║
║  ├─ Sent (last 24h):               ▓▓▓▓▓▓▓▓░░  234         ║
║  ├─ Pending (stuck?):              ░░░░░░░░░░    0          ║
║  ├─ Failed:                        ▓░░░░░░░░░    3          ║
║  └─ Read by users:                 ▓▓▓▓▓▓░░░░  198/234     ║
║                                                               ║
║  System Status:                                               ║
║  ├─ Backend:        ✅ Running                               ║
║  ├─ MongoDB:        ✅ Connected                             ║
║  ├─ Expo API:       ✅ Responsive                            ║
║  └─ Latest Test:    ✅ 2026-07-15 14:32 UTC                 ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
```

---

This should help visualize how the notification system works! 📊
