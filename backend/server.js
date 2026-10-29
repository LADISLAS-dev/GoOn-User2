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
const customerRoutes = require('./routes/customerRoutes');
const employeeRoutes = require('./routes/employeeRoutes');
const auditLogRoutes = require('./routes/auditLogRoutes');
const businessTypeRoutes = require('./routes/businessTypeRoutes');
const adminRoutes = require('./routes/adminRoutes');
const productRoutes = require('./routes/productRoutes');
const procurementRoutes = require('./routes/procurementRoutes');
const invoiceRoutes = require('./routes/invoiceRoutes');
const salesOrderRoutes = require('./routes/salesOrderRoutes');
const paymentAccountRoutes = require('./routes/paymentAccountRoutes');
const onlinePaymentRoutes = require('./routes/onlinePaymentRoutes');
const userPaymentMethodRoutes = require('./routes/userPaymentMethodRoutes');
const { router: providerWebhookRoutes, stripeWebhookHandler } = require('./routes/providerWebhookRoutes');
const authMiddleware = require('./middleware/authMiddleware');
const { startAppointmentReminderService } = require('./services/appointmentReminderService');
const { startNotificationDigestService } = require('./services/notificationDigestService');
const { syncBusinessModuleCatalog } = require('./services/businessModuleService');
const { syncPermissionCatalog } = require('./services/rbacService');
const { syncBusinessTypeCatalog } = require('./services/businessTypeService');

const app = express();

/* ================= MIDDLEWARE ================= */
app.use(cors({ origin: '*' }));
app.post('/online-payments/webhooks/stripe', express.raw({ type: 'application/json' }), stripeWebhookHandler);
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
app.use('/customers', customerRoutes);
app.use('/employees', employeeRoutes);
app.use('/audit-logs', auditLogRoutes);
app.use('/business-types', businessTypeRoutes);
app.use('/admin', adminRoutes);
app.use('/products', productRoutes);
app.use('/exchange-rates', require('./routes/exchangeRateRoutes'));
app.use('/procurement', procurementRoutes);
app.use('/invoices', invoiceRoutes);
app.use('/sales-orders', salesOrderRoutes);
app.use('/payment-accounts', paymentAccountRoutes);
app.use('/payment-methods', userPaymentMethodRoutes);
app.use('/online-payments', onlinePaymentRoutes);
app.use('/online-payments/webhooks', providerWebhookRoutes);

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
  await syncBusinessModuleCatalog();
  await syncPermissionCatalog();
  await syncBusinessTypeCatalog();
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
