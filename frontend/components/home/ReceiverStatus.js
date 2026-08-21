import React from 'react';
import {
  View,
  Text,
  ActivityIndicator,
} from 'react-native';

import { Wifi, WifiOff } from 'lucide-react-native';
import styles from '../../styles/homeStyles';

const ReceiverStatus = ({
  loadingReceiver,
  receiverUser,
}) => {
  const isConnected = !!receiverUser;

  return (
    <View style={styles.receiverContainer}>
      {/* Header */}
      <View style={styles.receiverHeader}>
        <Text style={styles.receiverTitle}>
          Receiver Status
        </Text>

        <View
          style={[
            styles.liveBadge,
            {
              backgroundColor: isConnected
                ? '#1E3A2A'
                : '#3A1E1E',
            },
          ]}
        >
          <View
            style={[
              styles.liveDot,
              {
                backgroundColor: isConnected
                  ? '#4ADE80'
                  : '#FF6B6B',
              },
            ]}
          />

          <Text
            style={[
              styles.liveText,
              {
                color: isConnected
                  ? '#4ADE80'
                  : '#FF6B6B',
              },
            ]}
          >
            {isConnected ? 'ONLINE' : 'OFFLINE'}
          </Text>
        </View>
      </View>

      {/* Body */}
      <View style={styles.receiverCard}>
        {loadingReceiver ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator
              size="small"
              color="#6C63FF"
            />

            <Text style={styles.loadingText}>
              Searching receiver...
            </Text>
          </View>
        ) : (
          <>
            <View
              style={[
                styles.receiverIconContainer,
                {
                  backgroundColor: isConnected
                    ? '#1B2B22'
                    : '#2B1B1B',
                },
              ]}
            >
              {isConnected ? (
                <Wifi
                  size={24}
                  color="#4ADE80"
                />
              ) : (
                <WifiOff
                  size={24}
                  color="#FF6B6B"
                />
              )}
            </View>

            <View style={styles.receiverInfo}>
              <Text style={styles.receiverName}>
                {isConnected
                  ? receiverUser.name
                  : 'No Receiver Connected'}
              </Text>

              <Text style={styles.receiverDescription}>
                {isConnected
                  ? 'Ready to receive push notifications in real-time.'
                  : 'Waiting for another user to open the application.'}
              </Text>
            </View>
          </>
        )}
      </View>
    </View>
  );
};

export default ReceiverStatus;
