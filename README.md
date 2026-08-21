# 🔔 NotificationApp — Push Notification Testing App

A complete full-stack app to test **Expo push notifications** between two users, built with:
- **Frontend**: React Native + Expo
- **Backend**: Node.js + Express + MongoDB

---

## 📁 Project Structure

```
notification-app/
├── backend/
│   ├── config/
│   │   └── database.js          # MongoDB connection
│   ├── controllers/
│   │   ├── userController.js    # User CRUD logic
│   │   └── notificationController.js  # Notification + push logic
│   ├── models/
│   │   ├── User.js              # User schema
│   │   └── Notification.js     # Notification schema
│   ├── routes/
│   │   ├── userRoutes.js        # /users endpoints
│   │   └── notificationRoutes.js # /notifications endpoints
│   ├── utils/
│   │   ├── logger.js            # Colored console logger
│   │   └── expoPush.js         # Expo Push API service
│   ├── server.js                # Express entry point
│   ├── .env.example             # Environment variables template
│   └── package.json
└── frontend/
    ├── context/
    │   ├── UserContext.js        # Auth state (login/logout)
    │   └── NotificationContext.js # Notifications state + polling
    ├── screens/
    │   ├── LoginScreen.js        # User A / User B selection
    │   ├── HomeScreen.js         # Send + recent notifications
    │   └── NotificationsScreen.js # Full notification history
    ├── components/
    │   ├── NotificationCard.js   # Notification item component
    │   └── LoadingScreen.js      # Loading state
    ├── navigation/
    │   └── AppNavigator.js       # React Navigation setup
    ├── services/
    │   ├── api.js                # REST API client
    │   ├── notificationService.js # Expo push token + listeners
    │   └── storage.js            # Simple in-memory storage
    ├── App.js                    # Root component
    ├── app.json                  # Expo configuration
    └── package.json
```

---

## 🚀 Installation & Setup

### Prerequisites

- Node.js >= 18
- MongoDB running locally (`mongod`)
- Expo CLI: `npm install -g expo-cli`
- Expo Go app on your phone (or Android/iOS simulator)

---

### 1️⃣ Backend Setup

```bash
cd notification-app/backend

# Install dependencies
npm install

# Copy and configure environment
cp .env.example .env
# Edit .env if needed (default port: 3000, MongoDB: localhost)

# Start MongoDB (if not running)
mongod --dbpath /data/db

# Start the server
npm run dev        # with auto-reload (nodemon)
# or
npm start          # production mode

# Run automated profile persistence checks
npm run test:profile
```

**Expected output:**
```
[INFO] 2024-xx-xx ... ✅ MongoDB connected: localhost
[INFO] 2024-xx-xx ... 🚀 Server running on http://localhost:3000
```

---

### 2️⃣ Frontend Setup

```bash
cd notification-app/frontend

# Install dependencies
npm install

# ⚠️ IMPORTANT: Configure your backend IP
# Edit services/api.js line ~10:
# const BASE_URL = 'http://YOUR_LOCAL_IP:3000'
# (Find your IP: ifconfig | grep inet, or ipconfig on Windows)
```

**Find your local IP:**
```bash
# macOS/Linux
ifconfig | grep "inet " | grep -v 127.0.0.1

# Windows
ipconfig | findstr IPv4
```

```bash
# Start the Expo development server
npm start

# Then scan the QR code with Expo Go on your phone
# Or press 'a' for Android emulator / 'i' for iOS simulator
```

---

## 📱 How to Test (User A → User B)

### Setup
1. Install the app and sign up with a normal user account.
2. Use one account per device. If this device is already linked to another user, log in with that user instead of creating a second account.

### Send a notification
1. On one device: type a message → tap **Send Notification**
2. On the receiving device: you should receive the push notification
3. Tap the notification to see it in the history list

### Notes on push notifications
- **Physical device required** for real push notifications
- On simulators/emulators: the notification is saved in DB and visible in-app, but no push is delivered
- Polling every 10 seconds keeps the notification list up to date

---

## 🌐 API Reference

### Users

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/users` | Create or update user profile with Firebase UID and push token |
| `GET` | `/users` | Get all users |
| `GET` | `/users/firebase/:uid` | Get user by Firebase UID |
| `PATCH` | `/users/:id/push-token` | Update push token (one user per device enforced) |

**POST /users body:**
```json
{
  "firebaseUid": "firebase-uid-here",
  "name": "User Name",
  "email": "user@example.com",
  "expoPushToken": "ExponentPushToken[xxxx]"
}
```

### Notifications

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/notifications` | Send a notification |
| `GET` | `/notifications/:userId` | Get notification history |
| `PATCH` | `/notifications/:id/read` | Mark one as read |
| `PATCH` | `/notifications/read-all/:userId` | Mark all as read |
| `DELETE` | `/notifications/clear/:userId` | Clear history (dev) |

**POST /notifications body:**
```json
{
  "senderId": "mongo_object_id",
  "receiverId": "mongo_object_id",
  "message": "Hello from User A!",
  "title": "Message from User A"
}
```

---

## 🔧 Environment Variables

```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/notification_app
NODE_ENV=development
```

---

## 🧪 Quick Test with curl

```bash
# 1. Create or update user profile
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <FIREBASE_ID_TOKEN>" \
  -d '{"firebaseUid":"firebase-uid-here","name":"User Name","email":"user@example.com","expoPushToken":"ExponentPushToken[test123]"}'

# 2. Get all users (to get their IDs)
curl http://localhost:3000/users

# 3. Send notification (replace IDs)
curl -X POST http://localhost:3000/notifications \
  -H "Content-Type: application/json" \
  -d '{
    "senderId": "SENDER_ID_HERE",
    "receiverId": "RECEIVER_ID_HERE",
    "message": "Hello from User A!",
    "title": "Test notification"
  }'

# 5. Check notification history
curl http://localhost:3000/notifications/RECEIVER_ID_HERE

# 6. Health check
curl http://localhost:3000/health
```

---

## ⚠️ Troubleshooting

### "Could not connect to server"
- Make sure the backend is running (`npm run dev`)
- Check your IP in `services/api.js` matches `ifconfig` output
- Make sure your phone and computer are on the **same WiFi network**

### Push notifications not received
- Real push requires a **physical device** (not simulator)
- Make sure you granted notification permissions when prompted
- The app must have been opened at least once on the device to generate a token
- Check backend logs for `❌ Invalid Expo push token`

### Too many API logs in frontend
- `frontend/app.json` has `expo.extra.debugApiLogs`
- Keep it `false` for cleaner logs, set `true` only while debugging requests

### MongoDB connection error
- Start MongoDB: `mongod --dbpath /data/db`
- Check if port 27017 is in use: `lsof -i :27017`

### Expo token is null
- Push tokens only work on physical devices
- Make sure `app.json` has the correct `slug` and `projectId`
- Try running `expo login` and `expo prebuild`

---

## 📦 Tech Stack

| Layer | Technology |
|-------|-----------|
| Mobile Framework | React Native + Expo SDK 51 |
| Navigation | React Navigation v6 |
| Push Notifications | expo-notifications |
| State Management | React Context + useReducer |
| Backend | Node.js + Express 4 |
| Database | MongoDB + Mongoose 8 |
| Push Delivery | Expo Push API |
| Real-time Updates | HTTP Polling (10s interval) |

---

## 🔄 Architecture Flow

```
[User A Device]                 [Backend]              [User B Device]
      │                            │                          │
      │── POST /users ────────────>│ Save User A + token      │
      │                            │                          │
      │                            │<────── POST /users ──────│ Save User B + token
      │                            │                          │
      │── POST /notifications ────>│                          │
      │                            │── Expo Push API ────────>│ 🔔 Push notification
      │                            │                          │
      │                            │<────── GET /notifications│ Poll every 10s
      │                            │──────────────────────────>│ Show in list
```


# Notification App (Fullstack)

## Stack
- Frontend: React Native (Expo)
- Backend: Node.js + Express
- Database: MongoDB
- Notifications: Expo Push Notifications

## Setup

### Backend
cd backend
npm install
npm run dev

### Frontend
cd frontend
npm install
npx expo start

## Notes importantes
- ProjectId must be valid UUID (EAS)
- Development build required for push notifications
- Expo Go not supported for production push


Comment réutiliser plus tard:

git clone https://github.com/TON_USERNAME/notification-app.git
cd notification-app


Frontend :
cd frontend
npm install
npx expo start

Backend :
cd backend
npm install
npm run dev
