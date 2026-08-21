/**
 * Production Push Notification Tester
 * 
 * Use this script to:
 * - Test push notifications with production tokens
 * - Verify token registration from EAS builds
 * - Debug push delivery issues
 * 
 * Usage:
 *   node testProductionPush.js <userId>
 *   node testProductionPush.js ram3
 */

const mongoose = require('mongoose');
const User = require('./models/User');
const Notification = require('./models/Notification');
const { sendExpoPushNotification } = require('./utils/expoPush');
const { extractAllPushTokens } = require('./utils/pushTokenSelection');
require('dotenv').config();

function buildUserLookupQuery(identifier) {
  const or = [
    { name: identifier },
    { email: identifier },
  ];

  if (mongoose.Types.ObjectId.isValid(identifier)) {
    or.unshift({ _id: identifier });
  }

  return { $or: or };
}

async function testProductionPush() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const userIdentifier = process.argv[2] || 'ram3';
    
    // Find user
    const user = await User.findOne(buildUserLookupQuery(userIdentifier));

    if (!user) {
      console.error(`❌ User not found: ${userIdentifier}`);
      process.exit(1);
    }

    console.log(`📱 Testing push notifications for: ${user.name} (${user.email})\n`);

    // ========== TOKENS ANALYSIS ==========
    console.log('==== TOKEN ANALYSIS ====\n');

    console.log('Raw tokens in DB:');
    console.log(`- expoPushToken: ${user.expoPushToken ? user.expoPushToken.substring(0, 50) + '...' : 'none'}`);
    console.log(`- expoPushTokens: ${user.expoPushTokens?.length || 0} tokens`);
    if (user.expoPushTokens?.length) {
      user.expoPushTokens.forEach((t, i) => {
        const prefix = t.substring(0, 20);
        const type = t.startsWith('ExponentPushToken') ? 'Expo Go' : 'Production (EAS)';
        console.log(`  [${i}] ${prefix}... (${type})`);
      });
    }

    console.log(`\n- expoPushRegistrations: ${user.expoPushRegistrations?.length || 0} registrations`);
    if (user.expoPushRegistrations?.length) {
      user.expoPushRegistrations.forEach((reg, i) => {
        console.log(`  [${i}] ${reg.token.substring(0, 50)}...`);
        console.log(`      - appOwnership: ${reg.appOwnership}`);
        console.log(`      - executionEnvironment: ${reg.executionEnvironment}`);
        console.log(`      - updatedAt: ${new Date(reg.updatedAt).toLocaleString()}`);
      });
    }

    // Get preferred tokens
    const preferredTokens = extractAllPushTokens(user);
    console.log(`\n✅ Preferred tokens to use (${preferredTokens.length}):`);
    preferredTokens.forEach((t, i) => {
      const type = t.startsWith('ExponentPushToken') ? 'Expo Go' : 'Production (EAS)';
      console.log(`  [${i}] ${t.substring(0, 50)}... (${type})`);
    });

    if (preferredTokens.length === 0) {
      console.log('\n❌ No valid push tokens found!');
      console.log('Solution: User needs to re-authenticate or restart the app\n');
      process.exit(1);
    }

    // ========== TEST PUSH NOTIFICATION ==========
    console.log('\n==== SENDING TEST NOTIFICATION ====\n');

    const testMessage = `🧪 Test notification - ${new Date().toLocaleTimeString()}`;

    // Create test notification in DB
    const testNotif = await Notification.create({
      senderId: user._id,
      receiverId: user._id,
      title: 'Test',
      message: testMessage,
      type: 'test',
      status: 'pending',
      read: false,
    });

    console.log(`Created test notification: ${testNotif._id}\n`);

    // Send to all preferred tokens
    const results = await Promise.allSettled(
      preferredTokens.map((token) =>
        sendExpoPushNotification({
          to: token,
          title: '🧪 Test Notification',
          body: testMessage,
          data: {
            type: 'test',
            notificationId: testNotif._id.toString(),
          },
        })
      )
    );

    // Analyze results
    let successCount = 0;
    let failureCount = 0;

    results.forEach((result, i) => {
      const token = preferredTokens[i];
      const type = token.startsWith('ExponentPushToken') ? 'Expo Go' : 'Production (EAS)';
      
      if (result.status === 'fulfilled' && result.value?.success) {
        console.log(`✅ [${i}] ${type}`);
        console.log(`   Token: ${token.substring(0, 50)}...`);
        console.log(`   Ticket: ${result.value.ticketId}`);
        successCount++;
      } else {
        console.log(`❌ [${i}] ${type}`);
        console.log(`   Token: ${token.substring(0, 50)}...`);
        const error = result.value?.error || result.reason?.message || 'Unknown error';
        console.log(`   Error: ${error}`);
        failureCount++;
      }
      console.log('');
    });

    // Update test notification status
    const finalStatus = successCount > 0 ? 'sent' : 'failed';
    await Notification.findByIdAndUpdate(testNotif._id, { status: finalStatus });

    // Summary
    console.log('==== SUMMARY ====\n');
    console.log(`✅ Success: ${successCount}/${preferredTokens.length}`);
    console.log(`❌ Failed: ${failureCount}/${preferredTokens.length}`);
    console.log(`📊 Final notification status: ${finalStatus}\n`);

    if (successCount === 0) {
      console.log('⚠️  No tokens succeeded. Check your Firebase configuration and token validity.\n');
    } else {
      console.log('✅ Test completed! Check your device(s) for the notification.\n');
    }

    // Instructions
    console.log('==== NEXT STEPS ====\n');
    console.log('1. Check your physical device(s) for the test notification');
    console.log('2. If received: notifications are working! ✅');
    console.log('3. If NOT received:');
    console.log('   - Check app notification settings on your device');
    console.log('   - Restart the app');
    console.log('   - Run this test again\n');

    await mongoose.connection.close();
    process.exit(successCount > 0 ? 0 : 1);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

testProductionPush();
