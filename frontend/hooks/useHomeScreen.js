import { useEffect, useState, useCallback } from 'react';
import { AppState } from 'react-native';
import {
  getAllUsers,
  sendNotification,
} from '../services/api';

import { useUser } from '../context/UserContext';

export const useHomeScreen = (navigation) => {
  const { user, logout, ensurePushReadyOrAlert } = useUser();

  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  // LOAD USERS
  const loadUsers = useCallback(async () => {
    try {
      const res = await getAllUsers();

      const currentMongoId = user?._id ? String(user._id) : '';
      const currentFirebaseUid = user?.firebaseUid ? String(user.firebaseUid) : '';

      const filtered = res.users.filter(
        (u) => {
          const mongoId = u?._id ? String(u._id) : '';
          const firebaseUid = u?.firebaseUid ? String(u.firebaseUid) : '';

          if (currentMongoId && mongoId === currentMongoId) return false;
          if (currentFirebaseUid && firebaseUid === currentFirebaseUid) return false;
          return true;
        }
      );

      setUsers(filtered);
    } catch (error) {
      console.log('loadUsers error:', error);
    }
  }, [user?._id, user?.firebaseUid]);

  useEffect(() => {
    if (user?.firebaseUid || user?._id) loadUsers();
  }, [user?._id, user?.firebaseUid, loadUsers]);

  useEffect(() => {
    if (!(user?.firebaseUid || user?._id)) return;

    const appStateSub = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active') return;
      loadUsers();
    });

    return () => appStateSub.remove();
  }, [user?._id, user?.firebaseUid, loadUsers]);

  // SEND MESSAGE
  const handleSend = async () => {
    if (!message.trim() || !selectedUser) return;

    const canSend = await ensurePushReadyOrAlert({ source: 'manual-send' });
    if (!canSend) {
      navigation?.navigate?.('NotificationLabs');
      return;
    }

    setIsSending(true);

    try {
      await sendNotification({
        senderId: user._id,
        receiverId: selectedUser._id,
        title: user.name,
        message,
        type: 'message',
      });

      setMessage('');
    } catch (error) {
      console.log('send error:', error);
    }

    setIsSending(false);
  };

  // LOGOUT
  const handleLogout = async () => {
    try {
      await logout();

      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    } catch (error) {
      console.log('logout error:', error);
    }
  };

  return {
    user,
    users,
    selectedUser,
    setSelectedUser,
    message,
    setMessage,
    handleSend,
    ensurePushReadyOrAlert,
    isSending,
    handleLogout,
  };
};