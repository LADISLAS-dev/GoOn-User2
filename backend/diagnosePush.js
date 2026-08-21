const mongoose = require('mongoose');
const User = require('./models/User');
const Notification = require('./models/Notification');
require('dotenv').config();

async function diagnose() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // 1. Check users with push tokens
    console.log('==== PUSH TOKENS STATUS ====');
    const usersWithTokens = await User.find({ 
      $or: [
        { expoPushToken: { $exists: true, $ne: null } },
        { expoPushTokens: { $exists: true, $ne: [] } },
        { expoPushRegistrations: { $exists: true, $ne: [] } }
      ]
    }).select('name email expoPushToken expoPushTokens expoPushRegistrations');

    console.log(`Total users with push tokens: ${usersWithTokens.length}\n`);
    
    usersWithTokens.forEach((user, idx) => {
      console.log(`${idx + 1}. User: ${user.name} (${user.email})`);
      if (user.expoPushToken) {
        console.log(`   - expoPushToken: ${user.expoPushToken.substring(0, 40)}...`);
      }
      if (user.expoPushTokens?.length) {
        console.log(`   - expoPushTokens (${user.expoPushTokens.length}): `);
        user.expoPushTokens.forEach((token, i) => {
          console.log(`     [${i}] ${token.substring(0, 40)}...`);
        });
      }
      if (user.expoPushRegistrations?.length) {
        console.log(`   - expoPushRegistrations (${user.expoPushRegistrations.length}):`);
        user.expoPushRegistrations.forEach((reg, i) => {
          console.log(`     [${i}] ${reg.token.substring(0, 40)}... (${reg.executionEnvironment || 'unknown'})`);
        });
      }
      console.log('');
    });

    // 2. Check recent notifications
    console.log('==== RECENT NOTIFICATIONS ====');
    const recentNotifs = await Notification.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('senderId', 'name email')
      .populate('receiverId', 'name email');

    console.log(`Total notifications in DB: ${await Notification.countDocuments()}`);
    console.log(`Recent notifications (last 10):\n`);

    recentNotifs.forEach((notif, idx) => {
      console.log(`${idx + 1}. [${notif.status}] ${notif.title}`);
      console.log(`   From: ${notif.senderId?.name || 'Unknown'}`);
      console.log(`   To: ${notif.receiverId?.name || 'Unknown'}`);
      console.log(`   Type: ${notif.type}`);
      console.log(`   Read: ${notif.read}`);
      console.log(`   Created: ${new Date(notif.createdAt).toLocaleString()}`);
      console.log('');
    });

    // 3. Check notification status breakdown
    console.log('==== NOTIFICATION STATUS BREAKDOWN ====');
    const statusStats = await Notification.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    statusStats.forEach(stat => {
      console.log(`${stat._id}: ${stat.count}`);
    });

    console.log('\n');
    console.log('==== INSTRUCTIONS ====');
    console.log('1. Check if push tokens are registered above');
    console.log('2. Check if recent notifications have status "pending", "sent", or "failed"');
    console.log('3. If tokens exist but notifications show "pending" or "failed":');
    console.log('   - Check backend logs: npm run dev');
    console.log('   - Run: node testPush.js to test manually with a token');
    console.log('4. If notifications show "sent" but not appearing on phone:');
    console.log('   - Check notification permissions on device');
    console.log('   - Restart the app');
    console.log('   - Check device Settings > Notifications > YourApp');

    await mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

diagnose();
