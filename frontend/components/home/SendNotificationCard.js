import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';

import { SendHorizonal } from 'lucide-react-native';

import styles from '../../styles/homeStyles';
import { useLanguage } from '../../context/LanguageContext';

const SendNotificationCard = ({
  message,
  setMessage,
  handleSend,
  isSending,
}) => {
  const { t } = useLanguage();

  return (
    <View style={styles.sendCard}>
      {/* Header */}
      <View style={styles.sendHeader}>
        <View>
          <Text style={styles.sendTitle}>
            {t('sendNotificationTitle')}
          </Text>

          <Text style={styles.sendSubtitle}>
            {t('sendNotificationSubtitle')}
          </Text>
        </View>

        <View style={styles.sendIconContainer}>
          <SendHorizonal
            size={22}
            color="#6C63FF"
          />
        </View>
      </View>

      {/* Input */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={message}
          onChangeText={setMessage}
          placeholder={t('sendNotificationPlaceholder')}
          placeholderTextColor="#666"
          multiline
          textAlignVertical="top"
          maxLength={500}
        />

        <Text style={styles.charCount}>
          {message.length}/500
        </Text>
      </View>

      {/* Button */}
      <TouchableOpacity
        style={[
          styles.sendButton,
          isSending && styles.sendButtonDisabled,
        ]}
        onPress={handleSend}
        activeOpacity={0.85}
        disabled={isSending}
      >
        {isSending ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <>
            <Text style={styles.sendButtonText}>
              {t('sendNotificationButton')}
            </Text>

            <SendHorizonal
              size={18}
              color="#FFFFFF"
            />
          </>
        )}
      </TouchableOpacity>
    </View>
  );
};

export default SendNotificationCard;