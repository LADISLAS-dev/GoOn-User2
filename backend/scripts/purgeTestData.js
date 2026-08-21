const dotenv = require('dotenv');
dotenv.config();

const connectDB = require('../config/database');
const User = require('../models/User');
const Notification = require('../models/Notification');
const Appointment = require('../models/Appointment');
const AppointmentAppreciation = require('../models/AppointmentAppreciation');
const Message = require('../models/Message');
const Company = require('../models/Company');
const Banner = require('../models/Banner');

const REQUIRED_CONFIRMATION = 'YES_I_AM_SURE';

async function main() {
  const confirmation = String(process.env.CONFIRM_PURGE || '').trim();
  if (confirmation !== REQUIRED_CONFIRMATION) {
    console.error('Refusing to purge data. Set CONFIRM_PURGE=YES_I_AM_SURE to continue.');
    process.exit(1);
  }

  await connectDB();

  const operations = [
    { label: 'notifications', model: Notification },
    { label: 'appointments', model: Appointment },
    { label: 'appointment appreciations', model: AppointmentAppreciation },
    { label: 'messages', model: Message },
    { label: 'companies', model: Company },
    { label: 'banners', model: Banner },
    { label: 'users', model: User },
  ];

  console.log('Starting purge of test data...');

  for (const { label, model } of operations) {
    const result = await model.deleteMany({});
    console.log(`Deleted ${result.deletedCount || 0} ${label}`);
  }

  console.log('Purge completed successfully.');
  process.exit(0);
}

main().catch((error) => {
  console.error('Purge failed:', error?.message || error);
  process.exit(1);
});