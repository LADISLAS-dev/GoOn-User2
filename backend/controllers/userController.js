const User = require('../models/User');
const logger = require('../utils/logger');
const { normalizeLanguage } = require('../utils/notificationLocalization');

/**
 * GET /users
 * Get all users
 */
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({}).sort({ name: 1 });
    return res.status(200).json({ users });
  } catch (error) {
    logger.error(`getAllUsers error: ${error.message}`);
    return res.status(500).json({ error: 'Failed to fetch users' });
  }
};

/**
 * PATCH /users/:id/push-token
 * Update push token for a user
 */
const updatePushToken = async (req, res) => {
  try {
    const { id } = req.params;
    const { expoPushToken } = req.body;

    if (!expoPushToken) {
      return res.status(400).json({ error: 'expoPushToken is required' });
    }

    const user = await User.findByIdAndUpdate(
      id,
      { expoPushToken, lastSeen: new Date() },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    logger.info(`Push token updated for user ${user.name}`);
    return res.status(200).json({ message: 'Token updated', user });
  } catch (error) {
    logger.error(`updatePushToken error: ${error.message}`);
    return res.status(500).json({ error: 'Failed to update token' });
  }
};






// CREATE OR UPDATE USER AFTER LOGIN
const syncUser = async (req, res) => {
  const { firebaseUid, email, name, language } = req.body;
  const cleanLanguage = normalizeLanguage(language, '');

  let user = await User.findOne({ firebaseUid });

  if (!user) {
    user = await User.create({
      firebaseUid,
      email,
      name,
      ...(cleanLanguage ? { language: cleanLanguage } : {}),
    });
  } else {
    user.email = email;
    user.name = name;
    if (cleanLanguage) {
      user.language = cleanLanguage;
    }
    await user.save();
  }

  res.json(user);
};



module.exports = {
  getAllUsers,
  updatePushToken,
  syncUser,
};


