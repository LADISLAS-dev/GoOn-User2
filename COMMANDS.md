# 📋 Commands Reference - Production Notifications

## 🔍 Diagnostic Commands

### Check System Status
```bash
cd backend
node diagnosePush.js
```
**Shows**: Users, tokens, notification counts, status breakdown
**When to use**: Quick system health check

### Test Push Notification
```bash
cd backend
node testProductionPush.js <username>
```
**Shows**: Token analysis, push attempt results, success/failure
**When to use**: Testing if notifications work end-to-end

### Run Full Test Suite
```bash
bash test-notifications.sh <username>
```
**Shows**: All diagnostics + push test + results
**When to use**: Comprehensive testing before production

## 🧹 Maintenance Commands

### Clean Old Notifications
```bash
cd backend
node cleanOldNotifications.js
```
**Does**: Removes "pending" notifications older than 1 hour
**When to use**: Clean database before testing

### Check Production Config
```bash
bash check-production-config.sh
```
**Shows**: Configuration validation for production
**When to use**: Before building for production

### Setup Production
```bash
bash setup-production.sh
```
**Does**: Creates .env template, shows next steps
**When to use**: Initial production setup

## 🚀 Build Commands

### Build for Development (EAS - Internal)
```bash
cd frontend
eas build --platform ios --profile development

# Or with specific image
eas build --platform ios --profile development --image latest
```

### Build for Production (EAS - Store)
```bash
cd frontend
eas build --platform ios --profile production
eas build --platform android --profile production
```

### Submit to App Store
```bash
cd frontend
eas submit --platform ios
eas submit --platform android
```

### View Build Status
```bash
eas build:list
eas build:view <build-id>
```

## 🔧 Development Server

### Start Backend
```bash
cd backend
npm run dev
```
**Output**: Server on http://localhost:3000
**Watch**: [PUSH] logs for push activity

### Start Frontend (Expo Go)
```bash
cd frontend
npm start
# Then:
# i = iOS simulator
# a = Android emulator
# j = Expo Go on device
```

## 📊 Database Commands

### Query MongoDB Notifications
```bash
mongo mongodb+srv://user:pass@cluster.mongodb.net/dbname

# Count by status
db.notifications.countDocuments({ status: 'sent' })
db.notifications.countDocuments({ status: 'pending' })
db.notifications.countDocuments({ status: 'failed' })

# Find recent
db.notifications.find().sort({ createdAt: -1 }).limit(10)

# Find with errors
db.notifications.find({ status: 'failed' }).pretty()

# Find by user
db.notifications.find({ receiverId: ObjectId('...') })
```

### Query Push Tokens
```bash
mongo mongodb+srv://user:pass@cluster.mongodb.net/dbname

# Find users with tokens
db.users.find({
  $or: [
    { expoPushToken: { $exists: true, $ne: null } },
    { expoPushTokens: { $exists: true, $ne: [] } }
  ]
})

# Find production tokens
db.users.find({
  expoPushTokens: { $regex: '^ExpoPushToken' }
})

# Find Expo Go tokens
db.users.find({
  expoPushTokens: { $regex: '^ExponentPushToken' }
})
```

## 🧪 Testing Expo Push Directly

### Test Expo Push API
```bash
curl -X POST https://exp.host/--/api/v2/push/send \
  -H "Content-Type: application/json" \
  -d '{
    "to": "ExpoPushToken[xyz...]",
    "title": "Test",
    "body": "Hello from test!",
    "sound": "default"
  }'
```

### Get Push Receipts
```bash
curl -X POST https://exp.host/--/api/v2/push/getReceipts \
  -H "Content-Type: application/json" \
  -d '{
    "ids": ["ticket-id-1", "ticket-id-2"]
  }'
```

## 📱 Physical Device Testing

### iPhone with TestFlight
```bash
# After EAS build completes
# 1. Open https://testflight.apple.com
# 2. Install app from TestFlight invite
# 3. Test notifications
```

### Android with Play Console
```bash
# After EAS build completes
# 1. Go to Google Play Console
# 2. Upload build
# 3. Test via internal testing track
```

### Local Device Testing
```bash
# 1. Connect physical device via USB
# 2. For iOS: Trust computer in device settings
# 3. For Android: Enable USB debugging
# 4. Run:
cd frontend
npm start
# Then press 'a' for Android or 'i' for iOS
```

## 🔐 Firebase Setup

### Initialize Firebase
```bash
cd backend

# Download service account JSON from Firebase Console
# Place it as ./firebase-service.json
# Set in .env: FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-service.json

# Test connection
node -e "require('./config/firebase'); console.log('✅ Firebase OK')"
```

## 📈 Monitoring in Production

### View Recent Logs
```bash
cd backend

# If using PM2:
pm2 logs

# If using systemd:
journalctl -u app-name -f

# If using Docker:
docker logs -f container-name
```

### Monitor Database
```bash
# Every hour, check notification status
watch -n 3600 "mongo ... && db.notifications.aggregate([{...}])"

# Or set up cron job
0 * * * * cd /path/to/app/backend && node diagnosePush.js >> /var/log/push-monitor.log
```

## 🚨 Emergency Commands

### Force Clean Old Notifications
```bash
cd backend

# Remove all "pending" notifications (dangerous!)
# node -e "
#   const mongoose = require('mongoose');
#   const Notification = require('./models/Notification');
#   mongoose.connect(process.env.MONGODB_URI);
#   Notification.deleteMany({ status: 'pending' }).then(r => {
#     console.log('Deleted:', r.deletedCount);
#     process.exit(0);
#   });
# "
```

### Reset All Push Tokens
```bash
cd backend

# Remove all tokens from all users (dangerous!)
# node -e "
#   const mongoose = require('mongoose');
#   const User = require('./models/User');
#   mongoose.connect(process.env.MONGODB_URI);
#   User.updateMany({}, {
#     \$set: { expoPushToken: null, expoPushTokens: [], expoPushRegistrations: [] }
#   }).then(r => {
#     console.log('Updated:', r.modifiedCount);
#     process.exit(0);
#   });
# "
```

## 📚 Useful Files

| File | Purpose |
|------|---------|
| `backend/utils/expoPush.js` | Expo Push API integration |
| `backend/utils/pushTokenSelection.js` | Token selection logic |
| `backend/utils/productionTokenLogger.js` | Enhanced logging |
| `backend/controllers/notificationController.js` | Notification API |
| `frontend/services/notificationService.js` | Token registration |
| `backend/.env` | Environment config |
| `frontend/app.json` | EAS & app config |

## 🎯 Quick Decision Tree

```
Q: How do I check if the system is working?
A: Run: node diagnosePush.js

Q: How do I test a notification?
A: Run: node testProductionPush.js <username>

Q: How do I clean old data?
A: Run: node cleanOldNotifications.js

Q: How do I build for production?
A: Run: eas build --platform ios --profile production

Q: Why are notifications "pending"?
A: Run: npm run dev (restart backend)

Q: Why doesn't my token work?
A: Check: node diagnosePush.js && node testProductionPush.js

Q: How do I monitor in production?
A: Check: pm2 logs or journalctl -u app-name
```

---

**Note**: All commands assume you're in the project root directory unless otherwise specified.
