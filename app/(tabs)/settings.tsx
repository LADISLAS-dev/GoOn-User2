import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import AuthPromptModal from '../../components/AuthPromptModal';

export default function SettingsScreen() {
  const { isGuest } = useAuth();
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [locationServices, setLocationServices] = useState(true);
  const [emailUpdates, setEmailUpdates] = useState(false);

  useEffect(() => {
    if (isGuest) {
      setShowAuthPrompt(true);
    }
  }, [isGuest]);

  // If guest, block toggle interactions
  const handleToggle = (
    _value: boolean,
    _setter: (val: boolean) => void
  ) => {
    if (isGuest) {
      setShowAuthPrompt(true);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <SettingsItem
            icon="person-circle"
            title="Personal Information"
            subtitle="Update your profile details"
          />
          <SettingsItem
            icon="lock-closed"
            title="Password & Security"
            subtitle="Manage your password and 2FA"
          />
          <SettingsItem
            icon="card"
            title="Payment Methods"
            subtitle="Manage your payment options"
          />
        </View>

        {/* Preferences Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          <SettingsToggle
            icon="notifications"
            title="Push Notifications"
            subtitle="Receive push notifications"
            value={notifications}
            onValueChange={(value) => {
              if (isGuest) {
                setShowAuthPrompt(true);
                return;
              }
              setNotifications(value);
            }}
          />
          <SettingsToggle
            icon="moon"
            title="Dark Mode"
            subtitle="Switch to dark theme"
            value={darkMode}
            onValueChange={(value) => {
              if (isGuest) {
                setShowAuthPrompt(true);
                return;
              }
              setDarkMode(value);
            }}
          />
          <SettingsToggle
            icon="location"
            title="Location Services"
            subtitle="Allow location access"
            value={locationServices}
            onValueChange={(value) => {
              if (isGuest) {
                setShowAuthPrompt(true);
                return;
              }
              setLocationServices(value);
            }}
          />
          <SettingsToggle
            icon="mail"
            title="Email Updates"
            subtitle="Receive email newsletters"
            value={emailUpdates}
            onValueChange={(value) => {
              if (isGuest) {
                setShowAuthPrompt(true);
                return;
              }
              setEmailUpdates(value);
            }}
          />
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <SettingsItem
            icon="information-circle"
            title="About GoOn"
            subtitle="Version 1.0.0"
          />
          <SettingsItem
            icon="document-text"
            title="Terms of Service"
            subtitle="Read our terms"
          />
          <SettingsItem
            icon="shield"
            title="Privacy Policy"
            subtitle="How we handle your data"
          />
        </View>

        {/* Danger Zone */}
        <View style={[styles.section, styles.dangerSection]}>
          <Text style={[styles.sectionTitle, styles.dangerTitle]}>
            Danger Zone
          </Text>
          <TouchableOpacity style={styles.deleteButton} activeOpacity={0.7}>
            <Ionicons name="trash" size={20} color="#EF4444" />
            <Text style={styles.deleteText}>Delete Account</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Auth Prompt Modal for guests */}
      <AuthPromptModal
        visible={showAuthPrompt}
        onClose={() => setShowAuthPrompt(false)}
        featureName="access settings"
        description="Create an account to manage your preferences, notifications, and account settings."
      />
    </View>
  );
}

function SettingsItem({
  icon,
  title,
  subtitle,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
}) {
  return (
    <TouchableOpacity style={styles.settingsItem} activeOpacity={0.7}>
      <View style={styles.settingsIcon}>
        <Ionicons name={icon} size={22} color="#E11D48" />
      </View>
      <View style={styles.settingsContent}>
        <Text style={styles.settingsTitle}>{title}</Text>
        <Text style={styles.settingsSubtitle}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
    </TouchableOpacity>
  );
}

function SettingsToggle({
  icon,
  title,
  subtitle,
  value,
  onValueChange,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.settingsItem}>
      <View style={styles.settingsIcon}>
        <Ionicons name={icon} size={22} color="#E11D48" />
      </View>
      <View style={styles.settingsContent}>
        <Text style={styles.settingsTitle}>{title}</Text>
        <Text style={styles.settingsSubtitle}>{subtitle}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: '#E5E7EB', true: '#FCA5A5' }}
        thumbColor={value ? '#E11D48' : '#9CA3AF'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 30,
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 28,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F9FAFB',
  },
  settingsIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFF1F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  settingsContent: {
    flex: 1,
  },
  settingsTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: 2,
  },
  settingsSubtitle: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  dangerSection: {
    marginTop: 28,
  },
  dangerTitle: {
    color: '#EF4444',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
  },
  deleteText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
  },
});
