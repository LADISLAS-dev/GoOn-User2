require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { startKeepAlive } = require('./utils/keepAlive');

const connectDB = require('./config/database');

const userRoutes = require('./routes/userRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const companyRoutes = require('./routes/companyRoutes');
const messageRoutes = require('./routes/messageRoutes');
const bannerRoutes = require('./routes/bannerRoutes');
const reportRoutes = require('./routes/reportRoutes');
const authMiddleware = require('./middleware/authMiddleware');
const { startAppointmentReminderService } = require('./services/appointmentReminderService');
const { startNotificationDigestService } = require('./services/notificationDigestService');

const app = express();

/* ================= MIDDLEWARE ================= */
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ================= STATIC FILES (UPLOADS) ================= */
const uploadsRoot = path.join(__dirname, 'uploads');
app.use('/uploads', express.static(uploadsRoot));

/* ================= ROUTES ================= */
app.use('/users', userRoutes);
app.use('/notifications', notificationRoutes);
app.use('/appointments', appointmentRoutes);
app.use('/companies', companyRoutes);
app.use('/messages', messageRoutes);
app.use('/banners', bannerRoutes);
app.use('/reports', reportRoutes);

/* ================= HEALTH ================= */
app.get('/', (req, res) => {
  res.json({ status: 'API running 🚀' });
});

app.get('/test', (req, res) => {
  res.json({ ok: true });
});

// Lightweight endpoint pinged by the keep-alive to prevent Render cold starts.
app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

/* ================= START ================= */
const PORT = process.env.PORT || 1992;

const startServer = async () => {
  await connectDB();
  console.log('✅ MongoDB connected');
  startAppointmentReminderService();
  startNotificationDigestService();

  const server = app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    // Keep the instance awake so push sends never hit a cold-start timeout.
    startKeepAlive();
  });

  server.on('error', (err) => {
    if (err?.code === 'EADDRINUSE') {
      console.error(`❌ Port ${PORT} is already in use. Stop the other process or change PORT in backend/.env.`);
      return;
    }
    console.error('❌ Server start error:', err.message);
  });
};

startServer().catch((err) => {
  console.error('❌ Fatal startup error:', err?.message || err);
  process.exit(1);
});
