const mongoose = require('mongoose');
const Notification = require('./models/Notification');
require('dotenv').config();

async function cleanOldPending() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Show current status
    const statusStats = await Notification.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    console.log('==== CURRENT NOTIFICATION STATUS ====');
    statusStats.forEach(stat => {
      console.log(`${stat._id}: ${stat.count}`);
    });
    console.log('');

    // Delete old "pending" notifications created more than 1 hour ago
    const oneHourAgo = new Date(Date.now() - 3600000);
    const result = await Notification.deleteMany({
      status: 'pending',
      createdAt: { $lt: oneHourAgo }
    });

    console.log(`✅ Deleted ${result.deletedCount} old pending notifications (created more than 1 hour ago)\n`);

    // Show new status
    const newStatusStats = await Notification.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    console.log('==== NEW NOTIFICATION STATUS ====');
    newStatusStats.forEach(stat => {
      console.log(`${stat._id}: ${stat.count}`);
    });

    console.log('\n✅ Ready for testing! Start the backend with: npm run dev');

    await mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

cleanOldPending();
