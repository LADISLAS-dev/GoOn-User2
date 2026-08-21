import React from 'react';
import {
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  View,
  Text,
  TouchableOpacity,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';

import Header from '../components/home/Header';
import TokenStatus from '../components/home/TokenStatus';
import SendNotificationCard from '../components/home/SendNotificationCard';
import NotificationsPreview from '../components/home/NotificationsPreview';

import styles from '../styles/homeStyles';
import { useHomeScreen } from '../hooks/useHomeScreen';

const HomeScreen = ({ navigation }) => {
  const home = useHomeScreen(navigation);

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >

          {/* HEADER */}
          <Header
            user={home.user}
            roleColor="#3B82F6"
            isUserA={true}
            onLogout={home.handleLogout}
          />

          {/* TOKEN */}
          <TokenStatus />

          {/* ================= ACTIONS ================= */}
          <TouchableOpacity
            onPress={() => navigation.navigate('CreateAppointmentScreen')}
            style={{
              backgroundColor: '#6C63FF',
              padding: 12,
              borderRadius: 10,
              marginVertical: 15,
            }}
          >
            <Text style={{ color: '#fff', textAlign: 'center' }}>
              ➕ Créer un rendez-vous
            </Text>
          </TouchableOpacity>

          {/* ================= USERS LIST (CLEAN) ================= */}
          <View style={{ marginBottom: 20 }}>
            <Text style={{ color: '#fff', marginBottom: 10 }}>
              Choisir un utilisateur
            </Text>

            {home.users.map((item) => (
              <TouchableOpacity
                key={item._id}
                onPress={() => home.setSelectedUser(item)}
                style={{
                  padding: 12,
                  borderRadius: 10,
                  marginBottom: 8,
                  backgroundColor:
                    home.selectedUser?._id === item._id
                      ? '#6C63FF'
                      : '#2A2A40',
                }}
              >
                <Text style={{ color: '#fff' }}>
                  {item.name} ({item.role})
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ================= SELECTED USER ================= */}
          <Text style={{ color: '#aaa', marginBottom: 10 }}>
            Chat avec: {home.selectedUser?.name || 'Aucun'}
          </Text>

          {/* ================= SEND MESSAGE ================= */}
          <SendNotificationCard
            message={home.message}
            setMessage={home.setMessage}
            handleSend={home.handleSend}
            isSending={home.isSending}
            sendFeedback={home.sendFeedback}
          />

          {/* ================= NOTIFICATIONS ================= */}
          <NotificationsPreview
            notifications={home.notifications}
            unreadCount={home.unreadCount}
            navigation={navigation}
          />

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default HomeScreen;