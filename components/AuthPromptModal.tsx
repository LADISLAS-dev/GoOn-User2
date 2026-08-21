/**
 * AuthPromptModal - Shown when guests try to access protected features
 * Explains the benefit of creating an account without being pushy
 */
import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

interface AuthPromptModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  featureName?: string;
}

const { width } = Dimensions.get('window');

const benefits = [
  { icon: 'bookmark' as const, text: 'Save your favorite places and preferences' },
  { icon: 'chatbubbles' as const, text: 'Chat directly with premium venues' },
  { icon: 'eye' as const, text: 'View exclusive ads and promotions' },
  { icon: 'calendar' as const, text: 'Book instantly and track reservations' },
];

export default function AuthPromptModal({
  visible,
  onClose,
  title,
  description,
  featureName,
}: AuthPromptModalProps) {
  const router = useRouter();

  const defaultTitle = featureName
    ? `Sign in to ${featureName}`
    : 'Create an account to continue';

  const defaultDescription =
    'Join GoOn to unlock all features and get the most out of your premium experience.';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {/* Icon */}
            <View style={styles.iconContainer}>
              <Ionicons name="diamond" size={40} color="#B8860B" />
            </View>

            {/* Title */}
            <Text style={styles.title}>{title || defaultTitle}</Text>

            {/* Description */}
            <Text style={styles.description}>
              {description || defaultDescription}
            </Text>

            {/* Benefits */}
            <View style={styles.benefitsList}>
              {benefits.map((benefit, index) => (
                <View key={index} style={styles.benefitItem}>
                  <View style={styles.benefitIconContainer}>
                    <Ionicons name={benefit.icon} size={18} color="#B8860B" />
                  </View>
                  <Text style={styles.benefitText}>{benefit.text}</Text>
                </View>
              ))}
            </View>

            {/* Primary CTA */}
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => {
                onClose();
                router.push('/(auth)/register');
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryButtonText}>Create Free Account</Text>
            </TouchableOpacity>

            {/* Secondary CTA */}
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => {
                onClose();
                router.push('/(auth)/login');
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.secondaryButtonText}>I Already Have an Account</Text>
            </TouchableOpacity>

            {/* Dismiss */}
            <TouchableOpacity style={styles.dismissButton} onPress={onClose} activeOpacity={0.6}>
              <Text style={styles.dismissText}>Maybe Later</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modal: {
    width: width * 0.9,
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    maxHeight: '82%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 32,
    elevation: 16,
  },
  content: {
    padding: 28,
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 28,
    backgroundColor: '#FFF8E7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 24,
  },
  benefitsList: {
    width: '100%',
    marginBottom: 28,
    gap: 14,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  benefitIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#FFF8E7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  benefitText: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
    lineHeight: 20,
    fontWeight: '500',
  },
  primaryButton: {
    width: '100%',
    backgroundColor: '#B8860B',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#B8860B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    width: '100%',
    backgroundColor: '#F3F4F6',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  secondaryButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
  dismissButton: {
    paddingVertical: 8,
  },
  dismissText: {
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '500',
  },
});
