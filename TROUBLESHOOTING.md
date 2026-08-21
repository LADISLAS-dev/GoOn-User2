# 🆘 Quick Troubleshooting Guide

## Problem: Notifications Still Not Showing

### Step 1: Run Diagnostics
```bash
cd backend
node diagnosePush.js
```

**Check these:**
- [ ] User is listed?
- [ ] "Total users with push tokens: 1" or more?
- [ ] Tokens are present?

**If NO tokens found:**
→ Go to "Problem: No Push Tokens"

### Step 2: Test Push
```bash
node testProductionPush.js <username>
```

**Check these:**
- [ ] "✅ Success" in output?
- [ ] Notification created in DB?

**If FAILED:**
→ Go to "Problem: Test Push Failed"

### Step 3: Check Device
- [ ] Phone notifications enabled?
- [ ] App notifications enabled in settings?
- [ ] App is running or backgrounded?

**Still not working?**
→ Restart backend and try again

---

## Problem: No Push Tokens Registered

### Symptom
```
Total users with push tokens: 0
OR
No tokens available for push notification
```

### Checklist
- [ ] Is it a **physical device**? (Simulators don't get tokens)
- [ ] Did user **accept notification permission**?
- [ ] Is app **still running** after accepting?
- [ ] Was token **sync successful**? (Check backend logs)

### Solution
1. **On device**: Reinstall app
2. **In settings**: Accept notification permission
3. **In app**: Wait 2-3 seconds
4. **Run**:
   ```bash
   node diagnosePush.js
   ```
5. **If still empty**: Restart backend `npm run dev`

---

## Problem: Test Push Failed

### Symptom
```
❌ [0] Production (EAS)
Error: Invalid or missing Expo push token
```

### Diagnostics
```bash
# Check token format
node diagnosePush.js

# Should show:
# ExpoPushToken[...]    ✅ GOOD
# ExponentPushToken[...] ✅ OK (dev only)
# Something else       ❌ BAD
```

### Solutions by Token Type

#### If NO token:
```bash
→ Solution: "Problem: No Push Tokens Registered" ↑
```

#### If ExponentPushToken (Expo Go in production):
```
Build proper EAS app - ExponentPushToken only works in Expo Go
Run: eas build --platform ios --profile production
```

#### If ExpoPushToken but still fails:
```
Try:
1. node testProductionPush.js <username>
   (look at error message in output)
2. Check backend logs: npm run dev
3. Restart backend: Ctrl+C then npm run dev again
```

---

## Problem: Notification in "pending" Status

### Symptom
```bash
db.notifications.findOne()
# Returns: { ..., status: "pending", ... }
```

### Check These
1. **Is backend running?**
   ```bash
   # Terminal 1:
   cd backend && npm run dev
   # Should show: ✅ Server running
   ```

2. **Clean old pending notifications:**
   ```bash
   node cleanOldNotifications.js
   ```

3. **Send new notification and check:**
   ```bash
   # Trigger a new notification via app
   # Then:
   node diagnosePush.js
   # Should show recent notification with status: "sent"
   ```

### If Still "pending"
1. Check backend logs for `[PUSH]` errors
2. Verify MongoDB connection
3. Restart backend: `npm run dev`

---

## Problem: "DeviceNotRegistered" Error

### Symptom
```
[PUSH-SEND] Error: DeviceNotRegistered
```

### Explanation
Token is **old/invalid**. This is normal and automatic!

### What Happens
1. Old token is automatically deleted from DB ✅
2. Next time app opens, new token is registered ✅
3. Future notifications work ✅

### What To Do
1. **Nothing** - It's automatic
2. **Or**: Restart app to speed up registration
3. **Verify**: Run `node diagnosePush.js` after restart

---

## Problem: "No tokens available for push"

### Symptom
```
[PUSH] No tokens available for push notification - receiverId: xyz
```

### Causes
| Cause | Check | Fix |
|-------|-------|-----|
| User not registered | `node diagnosePush.js` | App needs to run and accept permissions |
| Tokens were removed | Firebase auth issue | Re-authenticate user |
| Wrong user ID | Check notification.receiverId | Verify sending to correct user |

### Solution
1. **Check who has tokens:**
   ```bash
   node diagnosePush.js
   ```

2. **Make sure receiver user exists:**
   ```bash
   # MongoDB:
   db.users.findOne({ email: 'receiver@email.com' })
   ```

3. **If missing**: User needs to login/register first

---

## Problem: Expo Push API Error

### Symptom
```
[EXPO] HTTP error: 400 Bad Request
```

### Common Causes

| Error | Fix |
|-------|-----|
| Invalid token | Restart app to get new token |
| Token doesn't start with ExponentPushToken[ or ExpoPushToken[ | Something is wrong - restart app |
| Network timeout | Retry - usually transient |
| Rate limited | Wait, or reduce frequency |

### Debug
```bash
# 1. Check token validity
node diagnosePush.js

# 2. Test directly with Expo
curl -X POST https://exp.host/--/api/v2/push/send \
  -H "Content-Type: application/json" \
  -d '{
    "to": "YOUR_TOKEN_HERE",
    "title": "Test",
    "body": "Hello"
  }'

# 3. Check Expo status
# → https://status.expo.dev/
```

---

## Problem: Production Build Not Receiving Notifications

### Step 1: Verify Build Used EAS
```bash
# The app should show:
# - Button: "Production" or similar version name
# - Version number matching your build
```

### Step 2: Check Token Type
```bash
node diagnosePush.js

# Should show:
# expoPushToken: ExpoPushToken[...]  ✅ GOOD
# NOT: ExponentPushToken[...]
```

**If showing ExponentPushToken:**
→ You're running Expo Go, not the EAS build
→ Reinstall from TestFlight/Play Store

### Step 3: Check Permissions
```
Settings → Notifications → [Your App]
Should show: Notifications ON
```

### Step 4: Test Again
```bash
node testProductionPush.js <username>
# Should show success
```

---

## Problem: Multiple Tokens for Same User

### Symptom
```bash
node diagnosePush.js
# Shows: expoPushTokens (3 tokens)
```

### Is This Bad?
**NO** - It's normal! Happens when:
- User reinstalls app
- User switches devices
- User uses both Expo Go and EAS build

### Cleanup (Optional)
```bash
# Leave as-is - system handles it
# OR manually in MongoDB:
db.users.updateOne(
  { _id: ObjectId('...') },
  { $set: { expoPushTokens: ['ExpoPushToken[newest-one-only]'] } }
)
```

---

## Problem: Still Stuck?

### Gather Information
```bash
# 1. System status
node diagnosePush.js > diag.txt

# 2. Test result
node testProductionPush.js <username> > test.txt

# 3. Backend logs
npm run dev > logs.txt
# Wait 30 seconds, trigger notification, check logs
```

### Send to Support
Include:
- `diag.txt` - System diagnostics
- `test.txt` - Test output
- `logs.txt` - Backend logs
- Device type (iPhone/Android)
- App version
- Error messages from screen

---

## Quick Command Reference

| Goal | Command |
|------|---------|
| Check health | `node diagnosePush.js` |
| Test notification | `node testProductionPush.js <user>` |
| Clean old data | `node cleanOldNotifications.js` |
| Start backend | `npm run dev` |
| Run full tests | `bash test-notifications.sh <user>` |
| Check config | `bash check-production-config.sh` |

---

## Restart Everything (Nuclear Option)

```bash
# 1. Stop backend
# Ctrl+C

# 2. Clean database (careful!)
node cleanOldNotifications.js

# 3. Restart backend
npm run dev

# 4. Restart app on device
# Close completely and reopen

# 5. Test
node testProductionPush.js <username>
```

---

**Need more help?**
- Read: `README_PRODUCTION.md`
- Check: `COMMANDS.md`
- Reference: `PRODUCTION_NOTIFICATIONS.md`
